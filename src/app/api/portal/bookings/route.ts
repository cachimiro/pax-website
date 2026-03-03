import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolvePortalAuth } from '@/lib/crm/portal-auth'

/**
 * Fetch active bookings for a verified client.
 * Auth: CTA token (?token=...) or session token (Authorization: Bearer ...)
 */
export async function GET(request: NextRequest) {
  const admin = createAdminClient()

  const token = request.nextUrl.searchParams.get('token') ?? undefined
  const authHeader = request.headers.get('authorization')
  const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined

  const auth = await resolvePortalAuth(admin, { token, session_token: sessionToken })
  if (!auth) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
  }

  const { leadId, opportunityIds } = auth

  if (opportunityIds.length === 0) {
    return NextResponse.json({ bookings: [], lead: null })
  }

  // Fetch lead info
  const { data: lead } = await admin
    .from('leads')
    .select('id, name, email, phone')
    .eq('id', leadId)
    .single()

  // Fetch active bookings
  const { data: bookings } = await admin
    .from('bookings')
    .select('id, opportunity_id, type, scheduled_at, duration_min, outcome, meet_link, google_event_id')
    .in('opportunity_id', opportunityIds)
    .eq('outcome', 'pending')
    .order('scheduled_at', { ascending: true })

  // Fetch visits
  const { data: visits } = await admin
    .from('visits')
    .select('id, opportunity_id, scheduled_at, address, outcome')
    .in('opportunity_id', opportunityIds)
    .in('outcome', ['pending', 'scheduled'])
    .not('scheduled_at', 'is', null)
    .order('scheduled_at', { ascending: true })

  // Fetch fittings
  const { data: fittings } = await admin
    .from('fitting_slots')
    .select('id, opportunity_id, confirmed_date, status')
    .in('opportunity_id', opportunityIds)
    .eq('status', 'confirmed')
    .not('confirmed_date', 'is', null)
    .order('confirmed_date', { ascending: true })

  // Fetch opportunity context for each
  const { data: opps } = await admin
    .from('opportunities')
    .select('id, stage, value_estimate, package_complexity, reschedule_count, no_show_count')
    .in('id', opportunityIds)

  const oppMap = new Map(opps?.map(o => [o.id, o]) ?? [])

  // Check deposit status
  const { data: deposits } = await admin
    .from('invoices')
    .select('opportunity_id, status')
    .in('opportunity_id', opportunityIds)
    .eq('status', 'paid')

  const depositPaidSet = new Set(deposits?.map(d => d.opportunity_id) ?? [])

  // Build unified booking list
  type PortalBooking = {
    id: string
    type: string
    label: string
    scheduled_at: string
    duration_min: number
    meet_link?: string
    address?: string
    source_table: string
    opportunity_id: string
    package?: string
    reschedule_count: number
    deposit_paid: boolean
  }

  const result: PortalBooking[] = []

  for (const b of bookings ?? []) {
    const opp = oppMap.get(b.opportunity_id)
    const typeLabels: Record<string, string> = {
      call1: 'Discovery Call', call2: 'Design Review', onboarding: 'Onboarding Session',
    }
    result.push({
      id: b.id,
      type: b.type,
      label: typeLabels[b.type] ?? b.type,
      scheduled_at: b.scheduled_at,
      duration_min: b.duration_min ?? 30,
      meet_link: b.meet_link ?? undefined,
      source_table: 'bookings',
      opportunity_id: b.opportunity_id,
      package: opp?.package_complexity ?? undefined,
      reschedule_count: opp?.reschedule_count ?? 0,
      deposit_paid: depositPaidSet.has(b.opportunity_id),
    })
  }

  for (const v of visits ?? []) {
    if (!v.scheduled_at) continue
    const opp = oppMap.get(v.opportunity_id)
    result.push({
      id: v.id,
      type: 'visit',
      label: 'Site Visit',
      scheduled_at: v.scheduled_at,
      duration_min: 60,
      address: v.address ?? undefined,
      source_table: 'visits',
      opportunity_id: v.opportunity_id,
      package: opp?.package_complexity ?? undefined,
      reschedule_count: opp?.reschedule_count ?? 0,
      deposit_paid: depositPaidSet.has(v.opportunity_id),
    })
  }

  for (const f of fittings ?? []) {
    if (!f.confirmed_date) continue
    const opp = oppMap.get(f.opportunity_id)
    result.push({
      id: f.id,
      type: 'fitting',
      label: 'Fitting',
      scheduled_at: f.confirmed_date,
      duration_min: 240,
      source_table: 'fitting_slots',
      opportunity_id: f.opportunity_id,
      package: opp?.package_complexity ?? undefined,
      reschedule_count: opp?.reschedule_count ?? 0,
      deposit_paid: depositPaidSet.has(f.opportunity_id),
    })
  }

  // Sort by date
  result.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  return NextResponse.json({
    bookings: result,
    lead: lead ? { name: lead.name, email: lead.email } : null,
  })
}
