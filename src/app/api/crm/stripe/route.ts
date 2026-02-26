import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

/**
 * POST /api/crm/stripe
 * Stripe webhook handler for payment events.
 * Verifies the webhook signature and processes payment_intent.succeeded events.
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secret) {
    return NextResponse.json({ error: 'Stripe webhook secret not configured' }, { status: 500 })
  }

  // Verify Stripe signature
  if (sig) {
    const isValid = verifyStripeSignature(body, sig, secret)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  try {
    const event = JSON.parse(body)

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object
      const invoiceId = paymentIntent.metadata?.invoice_id
      const amount = paymentIntent.amount / 100 // Stripe amounts are in pence

      if (!invoiceId) {
        // No invoice_id in metadata — log and skip
        console.log('Stripe payment without invoice_id metadata:', paymentIntent.id)
        return NextResponse.json({ received: true })
      }

      const supabase = createAdminClient()

      // Record payment
      await supabase.from('payments').insert({
        invoice_id: invoiceId,
        amount,
        method: 'stripe',
      })

      // Update invoice status
      await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoiceId)

      // Get the opportunity for this invoice
      const { data: invoice } = await supabase
        .from('invoices')
        .select('opportunity_id')
        .eq('id', invoiceId)
        .single()

      if (invoice?.opportunity_id) {
        // Check if opportunity is awaiting deposit
        const { data: opp } = await supabase
          .from('opportunities')
          .select('stage')
          .eq('id', invoice.opportunity_id)
          .single()

        if (opp?.stage === 'awaiting_deposit') {
          await supabase
            .from('opportunities')
            .update({
              stage: 'deposit_paid',
              deposit_paid_at: new Date().toISOString(),
            })
            .eq('id', invoice.opportunity_id)

          // Log stage change
          await supabase.from('stage_log').insert({
            opportunity_id: invoice.opportunity_id,
            from_stage: 'awaiting_deposit',
            to_stage: 'deposit_paid',
            notes: `Auto-advanced via Stripe payment ${paymentIntent.id}`,
          })
        }
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object
      console.log('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Stripe webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * Verify Stripe webhook signature (simplified — for production use the stripe SDK).
 */
function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  try {
    const parts = header.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=')
      acc[key] = value
      return acc
    }, {} as Record<string, string>)

    const timestamp = parts['t']
    const signature = parts['v1']

    if (!timestamp || !signature) return false

    const signedPayload = `${timestamp}.${payload}`
    const expected = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex')

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}
