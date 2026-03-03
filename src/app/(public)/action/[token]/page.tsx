import { verifyCTAToken, type CTAAction } from '@/lib/crm/cta-tokens'
import { createAdminClient } from '@/lib/supabase/admin'
import type { OpportunityStage } from '@/lib/crm/types'
import { redirect } from 'next/navigation'
import Link from 'next/link'

/**
 * Client-facing CTA action page.
 *
 * When a client clicks a CTA link in a follow-up email (e.g. "Not Interested",
 * "Need More Time", "I want to proceed"), they land here. The page:
 *   1. Verifies the signed token
 *   2. Executes the action (stage change, cancel messages, etc.)
 *   3. Shows a branded confirmation message
 *
 * For booking actions (book-visit, book-meet2), redirects to the booking form.
 * For payment actions (pay-deposit), redirects to Stripe checkout.
 */

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function CTAActionPage({ params }: PageProps) {
  const { token } = await params
  const payload = verifyCTAToken(token)

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⏰</span>
          </div>
          <h1 className="text-xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
            Link expired
          </h1>
          <p className="text-warm-500 text-sm mb-6">
            This link is no longer valid. If you need help, please contact us directly.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all text-sm"
          >
            Go to PaxBespoke
          </Link>
        </div>
      </div>
    )
  }

  const supabase = createAdminClient()
  const { opportunity_id, action } = payload

  // Fetch opportunity + lead
  const { data: opp } = await supabase
    .from('opportunities')
    .select('id, stage, lead_id, owner_user_id, value_estimate')
    .eq('id', opportunity_id)
    .single()

  if (!opp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 text-center">
          <h1 className="text-xl font-bold text-warm-900 mb-2">Something went wrong</h1>
          <p className="text-warm-500 text-sm">We couldn&apos;t find this booking. Please contact us.</p>
        </div>
      </div>
    )
  }

  const { data: lead } = await supabase
    .from('leads')
    .select('name, email, phone')
    .eq('id', opp.lead_id)
    .single()

  const firstName = (lead?.name || '').split(' ')[0] || 'there'

  // manage-booking redirects to the portal page with the original token
  if (action === 'manage-booking') {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'
    redirect(`${baseUrl}/my-booking?token=${token}`)
  }

  // Execute the action
  const result = await executeAction(supabase, opp, action)

  // For redirect actions, redirect immediately
  if (result.redirect) {
    redirect(result.redirect)
  }

  // Render confirmation
  const config = ACTION_CONFIGS[action]

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 text-center">
        <div className={`w-16 h-16 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
          <span className="text-2xl">{config.icon}</span>
        </div>
        <h1 className="text-xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
          {config.title.replace('{{name}}', firstName)}
        </h1>
        <p className="text-warm-500 text-sm mb-6">
          {config.message.replace('{{name}}', firstName)}
        </p>
        {config.showContact && (
          <div className="text-xs text-warm-400 mb-4">
            Changed your mind? Email us at{' '}
            <a href="mailto:hello@paxbespoke.uk" className="text-orange-500 hover:underline">
              hello@paxbespoke.uk
            </a>
          </div>
        )}
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all text-sm"
        >
          Go to PaxBespoke
        </Link>
      </div>
    </div>
  )
}

const ACTION_CONFIGS: Record<Exclude<CTAAction, 'manage-booking'>, {
  icon: string
  iconBg: string
  title: string
  message: string
  showContact: boolean
}> = {
  'not-interested': {
    icon: '👋',
    iconBg: 'bg-slate-50',
    title: 'We understand, {{name}}',
    message: 'We\'ve removed you from our follow-up list. If you ever change your mind about a bespoke wardrobe, we\'re here.',
    showContact: true,
  },
  'need-more-time': {
    icon: '⏸️',
    iconBg: 'bg-blue-50',
    title: 'No rush, {{name}}',
    message: 'We\'ve paused our follow-ups. We\'ll check in with you in a couple of weeks — no pressure.',
    showContact: true,
  },
  'book-visit': {
    icon: '🏠',
    iconBg: 'bg-violet-50',
    title: 'Book your visit',
    message: 'Redirecting you to book a site visit...',
    showContact: false,
  },
  'book-meet2': {
    icon: '📹',
    iconBg: 'bg-cyan-50',
    title: 'Book your call',
    message: 'Redirecting you to book a follow-up call...',
    showContact: false,
  },
  'select-fitting': {
    icon: '📅',
    iconBg: 'bg-amber-50',
    title: 'Choose your fitting date',
    message: 'Redirecting you to select a fitting date...',
    showContact: false,
  },
  'pay-deposit': {
    icon: '💳',
    iconBg: 'bg-emerald-50',
    title: 'Pay deposit',
    message: 'Redirecting you to secure payment...',
    showContact: false,
  },
  'proceed': {
    icon: '✅',
    iconBg: 'bg-emerald-50',
    title: 'Let\'s go, {{name}}!',
    message: 'We\'re preparing your deposit invoice now. Check your email shortly for the payment link.',
    showContact: false,
  },
}

async function executeAction(
  supabase: ReturnType<typeof createAdminClient>,
  opp: { id: string; stage: string; lead_id: string; owner_user_id: string | null; value_estimate: number | null },
  action: CTAAction
): Promise<{ redirect?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'

  switch (action) {
    case 'not-interested': {
      await supabase
        .from('opportunities')
        .update({
          stage: 'closed_not_interested' as OpportunityStage,
          closed_reason: 'Client clicked "Not Interested" in email',
        })
        .eq('id', opp.id)

      await supabase.from('stage_log').insert({
        opportunity_id: opp.id,
        from_stage: opp.stage,
        to_stage: 'closed_not_interested',
        notes: 'Client opted out via email CTA',
      })

      // Cancel all queued messages
      await supabase
        .from('message_logs')
        .update({ status: 'cancelled' })
        .eq('lead_id', opp.lead_id)
        .eq('status', 'queued')

      return {}
    }

    case 'need-more-time': {
      await supabase
        .from('opportunities')
        .update({
          stage: 'on_hold' as OpportunityStage,
          on_hold_at: new Date().toISOString(),
        })
        .eq('id', opp.id)

      await supabase.from('stage_log').insert({
        opportunity_id: opp.id,
        from_stage: opp.stage,
        to_stage: 'on_hold',
        notes: 'Client clicked "Need More Time" in email',
      })

      // Cancel pressure follow-ups (keep nurture)
      await supabase
        .from('message_logs')
        .update({ status: 'cancelled' })
        .eq('lead_id', opp.lead_id)
        .eq('status', 'queued')

      return {}
    }

    case 'book-visit': {
      const { data: lead } = await supabase
        .from('leads')
        .select('name, email, phone')
        .eq('id', opp.lead_id)
        .single()

      const params = new URLSearchParams({
        type: 'visit',
        opp: opp.id,
        name: lead?.name ?? '',
        email: lead?.email ?? '',
        phone: lead?.phone ?? '',
      })
      return { redirect: `${baseUrl}/book?${params.toString()}` }
    }

    case 'book-meet2': {
      const { data: lead } = await supabase
        .from('leads')
        .select('name, email, phone')
        .eq('id', opp.lead_id)
        .single()

      const params = new URLSearchParams({
        type: 'call2',
        opp: opp.id,
        name: lead?.name ?? '',
        email: lead?.email ?? '',
        phone: lead?.phone ?? '',
      })
      return { redirect: `${baseUrl}/book?${params.toString()}` }
    }

    case 'select-fitting': {
      // Redirect to fitting selection page
      const { generateCTAToken } = await import('@/lib/crm/cta-tokens')
      const fittingToken = generateCTAToken(opp.id, 'select-fitting', 14)
      return { redirect: `${baseUrl}/fitting/select?token=${fittingToken}` }
    }

    case 'pay-deposit': {
      // Find or create invoice, redirect to Stripe
      const { data: invoice } = await supabase
        .from('invoices')
        .select('id, stripe_session_id')
        .eq('opportunity_id', opp.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (invoice?.stripe_session_id) {
        // Retrieve existing Stripe session URL
        const { getStripe } = await import('@/lib/crm/stripe')
        const stripe = getStripe()
        try {
          const session = await stripe.checkout.sessions.retrieve(invoice.stripe_session_id)
          if (session.url) return { redirect: session.url }
        } catch {
          // Session expired, create new one below
        }
      }

      // Create new Stripe session
      if (opp.value_estimate) {
        const { data: lead } = await supabase
          .from('leads')
          .select('name, email')
          .eq('id', opp.lead_id)
          .single()

        const depositAmount = Math.round(opp.value_estimate * 0.3)
        const { getStripe } = await import('@/lib/crm/stripe')
        const stripe = getStripe()

        const invoiceId = invoice?.id
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card'],
          customer_email: lead?.email ?? undefined,
          line_items: [{
            price_data: {
              currency: 'gbp',
              unit_amount: depositAmount * 100,
              product_data: {
                name: `PaxBespoke Deposit — ${lead?.name ?? 'Project'}`,
                description: 'Deposit payment for your bespoke wardrobe project',
              },
            },
            quantity: 1,
          }],
          metadata: { invoice_id: invoiceId ?? '', opportunity_id: opp.id },
          success_url: `${baseUrl}/action/payment-success`,
          cancel_url: `${baseUrl}/action/payment-cancelled`,
        })

        if (session.url) return { redirect: session.url }
      }

      return {}
    }

    case 'proceed': {
      // Move to awaiting_deposit — the automation engine will create the invoice
      if (opp.stage !== 'awaiting_deposit' && opp.stage !== 'deposit_paid') {
        await supabase
          .from('opportunities')
          .update({ stage: 'awaiting_deposit' as OpportunityStage })
          .eq('id', opp.id)

        await supabase.from('stage_log').insert({
          opportunity_id: opp.id,
          from_stage: opp.stage,
          to_stage: 'awaiting_deposit',
          notes: 'Client clicked "I want to proceed" in email',
        })

        // Trigger automation for awaiting_deposit
        const { runStageAutomations } = await import('@/lib/crm/automation')
        await runStageAutomations(supabase, opp.id, 'awaiting_deposit')
      }

      return {}
    }

    default:
      return {}
  }
}
