import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/crm/stripe'
import type Stripe from 'stripe'

/**
 * POST /api/crm/stripe
 * Stripe webhook handler for payment events.
 * Verifies the webhook signature using the official Stripe SDK.
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  if (secret && sig) {
    try {
      const stripe = getStripe()
      event = stripe.webhooks.constructEvent(body, sig, secret)
    } catch (err: any) {
      console.error('Stripe signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  } else {
    // Dev mode: no webhook secret configured, parse raw
    try {
      event = JSON.parse(body) as Stripe.Event
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
  }

  try {

    if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
      const obj = event.data.object as any
      const invoiceId = obj.metadata?.invoice_id
      const amount = (obj.amount_total ?? obj.amount ?? 0) / 100

      if (!invoiceId) {
        // No invoice_id in metadata — log and skip
        console.log('Stripe payment without invoice_id metadata:', obj.id)
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
            notes: `Auto-advanced via Stripe payment ${obj.id}`,
          })
        }
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as any
      console.log('Payment failed:', pi.id, pi.last_payment_error?.message)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Stripe webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
