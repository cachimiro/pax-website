import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import QuoteAgreementClient from './QuoteAgreementClient'

interface Props {
  params: Promise<{ token: string }>
}

export default async function QuotePage({ params }: Props) {
  const { token } = await params
  const admin = createAdminClient()

  // Validate token
  const { data: tokenRow } = await admin
    .from('quote_tokens')
    .select('id, quote_id, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (!tokenRow) return notFound()
  if (new Date(tokenRow.expires_at) < new Date()) return notFound()

  // Load quote + opportunity + lead
  const { data: quote } = await admin
    .from('quotes')
    .select(`
      id, amount, deposit_amount, items, status, sent_at, accepted_at, accepted_name,
      opportunities (
        id, package_complexity, value_estimate,
        leads (
          id, name, email, phone, postcode, project_type, style,
          budget_band, timeline, space_constraints
        ),
        meet1_notes (
          finish_type, call_notes, room_confirmed
        )
      )
    `)
    .eq('id', tokenRow.quote_id)
    .single()

  if (!quote) return notFound()

  const opp = quote.opportunities as Record<string, unknown>
  const lead = opp?.leads as Record<string, unknown>
  const meet1 = (opp?.meet1_notes as Record<string, unknown>[] | null)?.[0] ?? null

  return (
    <QuoteAgreementClient
      token={token}
      quote={{
        id: quote.id,
        amount: quote.amount,
        deposit_amount: quote.deposit_amount ?? Math.round(quote.amount * 0.3),
        items: (quote.items ?? []) as Array<{ description: string; quantity: number; unit_price: number; amount: number }>,
        status: quote.status,
        accepted_at: quote.accepted_at ?? null,
        accepted_name: quote.accepted_name ?? null,
      }}
      lead={{
        name: lead?.name as string,
        email: lead?.email as string | null,
        postcode: lead?.postcode as string | null,
        project_type: lead?.project_type as string | null,
        style: lead?.style as string | null,
        budget_band: lead?.budget_band as string | null,
        timeline: lead?.timeline as string | null,
        space_constraints: (lead?.space_constraints as string[] | null) ?? [],
      }}
      opportunity={{
        package_complexity: opp?.package_complexity as string | null,
      }}
      meet1={{
        finish_type: meet1?.finish_type as string | null,
        call_notes: meet1?.call_notes as string | null,
        room_confirmed: meet1?.room_confirmed as string | null,
      }}
    />
  )
}
