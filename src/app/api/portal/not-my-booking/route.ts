import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolvePortalAuth } from '@/lib/crm/portal-auth'
import { sendEmail } from '@/lib/crm/messaging/channels'

/**
 * Client reports a booking is not theirs — escalation flow.
 * Flags the booking, creates an urgent task, notifies the owner.
 */
export async function POST(request: NextRequest) {
  const admin = createAdminClient()
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const body = await request.json()
  const { booking_id, token, session_token } = body

  const auth = await resolvePortalAuth(admin, { token, session_token })
  if (!auth) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
  }

  if (!booking_id) {
    return NextResponse.json({ error: 'booking_id is required' }, { status: 400 })
  }

  // Audit log
  await admin.from('portal_audit_log').insert({
    lead_id: auth.leadId,
    booking_id,
    action: 'not_my_booking',
    ip_address: ip,
    metadata: { reported_by_lead: auth.leadId },
  })

  // Try to find the booking to get the opportunity owner
  let opportunityId: string | null = null

  const { data: booking } = await admin
    .from('bookings')
    .select('opportunity_id')
    .eq('id', booking_id)
    .maybeSingle()

  if (booking) {
    opportunityId = booking.opportunity_id
  } else {
    const { data: visit } = await admin
      .from('visits')
      .select('opportunity_id')
      .eq('id', booking_id)
      .maybeSingle()
    if (visit) opportunityId = visit.opportunity_id
  }

  // Create urgent task
  if (opportunityId) {
    const { data: opp } = await admin
      .from('opportunities')
      .select('owner_user_id')
      .eq('id', opportunityId)
      .single()

    if (opp?.owner_user_id) {
      await admin.from('tasks').insert({
        opportunity_id: opportunityId,
        type: 'follow_up',
        description: 'URGENT: Client reports this booking is not theirs. Investigate immediately.',
        owner_user_id: opp.owner_user_id,
        status: 'open',
        due_at: new Date().toISOString(), // Due now
      })

      // Notify owner
      const { data: profile } = await admin
        .from('profiles')
        .select('full_name, email')
        .eq('id', opp.owner_user_id)
        .single()

      if (profile?.email) {
        await sendEmail(
          profile.email,
          'URGENT: Client reports booking is not theirs',
          `A client has reported that a booking (ID: ${booking_id}) is not theirs.\n\nThis needs immediate investigation. An urgent task has been created in the CRM.\n\nPaxBespoke CRM`,
          admin,
        )
      }
    }
  }

  // Send acknowledgement to the reporting client
  const { data: lead } = await admin
    .from('leads')
    .select('name, email')
    .eq('id', auth.leadId)
    .single()

  if (lead?.email) {
    const firstName = (lead.name ?? '').split(' ')[0] || 'there'
    await sendEmail(
      lead.email,
      "We're looking into your report",
      `Hi ${firstName},\n\nThank you for letting us know. We've flagged this booking for review and our team will investigate.\n\nIf you have any questions, reply to this email or call us.\n\nPaxBespoke`,
      admin,
    )
  }

  return NextResponse.json({
    success: true,
    message: "Thank you for reporting this. We'll investigate and get back to you.",
  })
}
