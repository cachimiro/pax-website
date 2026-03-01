import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/crm/stripe'

/**
 * POST /api/crm/stripe/checkout
 * Creates a Stripe Checkout Session for an invoice deposit.
 * Returns the checkout URL.
 *
 * Body: { invoice_id: string }
 * Can also be called internally by automation with { invoice_id, internal: true }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { invoice_id, internal } = body

  if (!invoice_id) {
    return NextResponse.json({ error: 'invoice_id required' }, { status: 400 })
  }

  // Auth: either admin session or internal call with webhook secret
  let supabase
  if (internal) {
    const secret = req.headers.get('x-webhook-secret')
    if (!secret || secret !== process.env.CRM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    supabase = createAdminClient()
  } else {
    supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch invoice + opportunity + lead
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, amount, deposit_amount, opportunity_id, status')
    .eq('id', invoice_id)
    .single()

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  if (invoice.status === 'paid') {
    return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })
  }

  const { data: opp } = await supabase
    .from('opportunities')
    .select('lead_id')
    .eq('id', invoice.opportunity_id)
    .single()

  const { data: lead } = opp
    ? await supabase.from('leads').select('name, email').eq('id', opp.lead_id).single()
    : { data: null }

  const depositAmount = invoice.deposit_amount ?? invoice.amount
  const stripe = getStripe()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: lead?.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            unit_amount: Math.round(depositAmount * 100), // pence
            product_data: {
              name: `PaxBespoke Deposit — ${lead?.name ?? 'Project'}`,
              description: `Deposit payment for your bespoke wardrobe project`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoice_id: invoice.id,
        opportunity_id: invoice.opportunity_id,
      },
      success_url: `${baseUrl}/crm/onboarding/${invoice.opportunity_id}?payment=success`,
      cancel_url: `${baseUrl}/crm/onboarding/${invoice.opportunity_id}?payment=cancelled`,
    })

    // Store session ID on invoice
    await supabase
      .from('invoices')
      .update({ stripe_session_id: session.id })
      .eq('id', invoice.id)

    return NextResponse.json({
      url: session.url,
      session_id: session.id,
    })
  } catch (err: any) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
