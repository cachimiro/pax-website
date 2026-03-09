import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runStageAutomations } from '@/lib/crm/automation'
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * POST /api/webhooks/quickbooks
 *
 * Receives QuickBooks Online event notifications.
 * Intuit sends a POST with JSON payload and an `intuit-signature` header
 * (HMAC-SHA256 of the raw body using the webhook verifier token).
 *
 * We handle:
 *   - Invoice UPDATED → if Balance === 0, mark invoice paid + advance stage
 *   - Invoice DELETED → log only
 *
 * Docs: https://developer.intuit.com/app/developer/qbo/docs/develop/webhooks
 */

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.QB_WEBHOOK_VERIFIER_TOKEN
  if (!secret) {
    // If no verifier token configured, skip verification in dev
    if (process.env.NODE_ENV !== 'production') return true
    console.error('[QB webhook] QB_WEBHOOK_VERIFIER_TOKEN not set')
    return false
  }

  try {
    const expected = createHmac('sha256', secret).update(rawBody).digest('base64')
    const expectedBuf = Buffer.from(expected)
    const receivedBuf = Buffer.from(signature)
    if (expectedBuf.length !== receivedBuf.length) return false
    return timingSafeEqual(expectedBuf, receivedBuf)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('intuit-signature') ?? ''

  if (!verifySignature(rawBody, signature)) {
    console.warn('[QB webhook] Signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = createAdminClient()

  // QBO sends an array of event notifications
  const eventNotifications = (payload.eventNotifications as Array<Record<string, unknown>>) ?? []

  for (const notification of eventNotifications) {
    const realmId = notification.realmId as string
    const dataChangeEvent = notification.dataChangeEvent as Record<string, unknown> | null
    if (!dataChangeEvent) continue

    const entities = (dataChangeEvent.entities as Array<Record<string, unknown>>) ?? []

    for (const entity of entities) {
      const entityName = entity.name as string
      const entityId = entity.id as string
      const operation = entity.operation as string // 'Create' | 'Update' | 'Delete' | 'Merge' | 'Void'

      if (entityName !== 'Invoice') continue
      if (!['Update', 'Void'].includes(operation)) continue

      console.log(`[QB webhook] Invoice ${entityId} ${operation} in realm ${realmId}`)

      // Find local invoice by qbo_invoice_id
      const { data: invoice } = await admin
        .from('invoices')
        .select('id, status, amount, deposit_amount, opportunity_id')
        .eq('qbo_invoice_id', entityId)
        .maybeSingle()

      if (!invoice) {
        console.log(`[QB webhook] No local invoice found for QBO ID ${entityId}`)
        continue
      }

      if (invoice.status === 'paid') {
        // Already marked paid — idempotent
        continue
      }

      if (operation === 'Void') {
        // Invoice voided in QBO — log but don't auto-advance
        console.log(`[QB webhook] Invoice ${invoice.id} voided in QBO`)
        continue
      }

      // For Update: fetch the invoice from QBO to check balance
      // We use the stored config to make the API call
      try {
        const { getQBConfig } = await import('@/lib/crm/quickbooks')
        const config = await getQBConfig(admin)

        if (!config) {
          console.warn('[QB webhook] No QBO config — cannot verify invoice balance')
          continue
        }

        const baseUrl = config.environment === 'sandbox'
          ? 'https://sandbox-quickbooks.api.intuit.com/v3/company'
          : 'https://quickbooks.api.intuit.com/v3/company'

        const res = await fetch(
          `${baseUrl}/${config.realm_id}/invoice/${entityId}?minorversion=65`,
          {
            headers: {
              'Authorization': `Bearer ${config.access_token}`,
              'Accept': 'application/json',
            },
          }
        )

        if (!res.ok) {
          console.error('[QB webhook] Failed to fetch invoice from QBO:', await res.text())
          continue
        }

        const data = await res.json()
        const qbInvoice = data.Invoice

        if (!qbInvoice || qbInvoice.Balance !== 0) {
          // Not fully paid yet
          continue
        }

        // Invoice is fully paid — mark it in our DB
        const paidAt = new Date().toISOString()
        const paidAmount = invoice.deposit_amount ?? invoice.amount

        await admin
          .from('invoices')
          .update({ status: 'paid', paid_at: paidAt })
          .eq('id', invoice.id)

        await admin.from('payments').insert({
          invoice_id: invoice.id,
          amount: paidAmount,
          method: 'quickbooks',
          paid_at: paidAt,
        })

        console.log(`[QB webhook] Invoice ${invoice.id} marked paid — £${paidAmount}`)

        // Advance opportunity to deposit_paid if currently awaiting_deposit
        const { data: opp } = await admin
          .from('opportunities')
          .select('stage')
          .eq('id', invoice.opportunity_id)
          .single()

        if (opp?.stage === 'awaiting_deposit') {
          await admin
            .from('opportunities')
            .update({ stage: 'deposit_paid', deposit_paid_at: paidAt })
            .eq('id', invoice.opportunity_id)

          await admin.from('stage_log').insert({
            opportunity_id: invoice.opportunity_id,
            from_stage: 'awaiting_deposit',
            to_stage: 'deposit_paid',
            notes: `Deposit paid via QuickBooks — £${paidAmount.toLocaleString('en-GB')}`,
          })

          // Fire automations: sends onboarding invite email
          runStageAutomations(admin, invoice.opportunity_id, 'deposit_paid')
            .catch((err) => console.error('[QB webhook] runStageAutomations error:', err))

          console.log(`[QB webhook] Opportunity ${invoice.opportunity_id} advanced to deposit_paid`)
        }
      } catch (err) {
        console.error('[QB webhook] Error processing invoice update:', err)
      }
    }
  }

  // QBO requires a 200 response to acknowledge receipt
  return NextResponse.json({ received: true })
}
