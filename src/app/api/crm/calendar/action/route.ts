import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateCalendarEvent, deleteCalendarEvent, queryFreeBusy } from '@/lib/crm/calendar'
import { cancelQueuedMessages, runStageAutomations } from '@/lib/crm/automation'
import { getTemplatesForStage, interpolate } from '@/lib/crm/messaging/templates'
import type { OpportunityStage } from '@/lib/crm/types'

type Action = 'complete' | 'no_show' | 'cancel' | 'reschedule'
type EventType = 'call1' | 'call2' | 'onboarding' | 'visit' | 'fitting' | 'task'

interface ActionRequest {
  eventId: string
  eventType: EventType
  action: Action
  scheduled_at?: string   // for reschedule
  notes?: string
  reason?: string
  confirm?: boolean       // for cancel with deposit
}

// Stage to advance to when completing an event
const COMPLETE_STAGE_MAP: Record<string, { from: OpportunityStage; to: OpportunityStage }> = {
  call1:      { from: 'call1_scheduled', to: 'meet1_completed' },
  call2:      { from: 'call2_scheduled', to: 'meet2_completed' },
  visit:      { from: 'visit_scheduled', to: 'visit_completed' },
  onboarding: { from: 'onboarding_scheduled', to: 'onboarding_complete' },
}

// Template slugs for each action
const ACTION_TEMPLATES: Record<string, Record<string, string>> = {
  reschedule: { call1: 'booking_rescheduled', call2: 'booking_rescheduled', onboarding: 'booking_rescheduled', visit: 'visit_rescheduled', fitting: 'fitting_rescheduled' },
  cancel:     { call1: 'booking_cancelled', call2: 'booking_cancelled', onboarding: 'booking_cancelled' },
  no_show:    { call1: 'no_show_followup', call2: 'no_show_followup', onboarding: 'no_show_followup' },
  complete:   { call1: 'meet1_thanks', visit: 'visit_thanks' },
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: ActionRequest = await request.json()
  const { eventId, eventType, action, scheduled_at, notes, reason, confirm } = body

  if (!eventId || !eventType || !action) {
    return NextResponse.json({ error: 'eventId, eventType, and action are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    // ─── Resolve event context ─────────────────────────────────────────
    let opportunityId: string | null = null
    let leadId: string | null = null
    let googleEventId: string | null = null
    let currentOutcome: string | null = null

    if (eventType === 'task') {
      const { data: task } = await admin.from('tasks').select('opportunity_id, status').eq('id', eventId).single()
      if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      opportunityId = task.opportunity_id
      currentOutcome = task.status
    } else if (eventType === 'visit') {
      const { data: visit } = await admin.from('visits').select('opportunity_id, google_event_id, outcome').eq('id', eventId).single()
      if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
      opportunityId = visit.opportunity_id
      googleEventId = visit.google_event_id
      currentOutcome = visit.outcome
    } else if (eventType === 'fitting') {
      const { data: fitting } = await admin.from('fitting_slots').select('opportunity_id, google_event_id, status').eq('id', eventId).single()
      if (!fitting) return NextResponse.json({ error: 'Fitting not found' }, { status: 404 })
      opportunityId = fitting.opportunity_id
      googleEventId = fitting.google_event_id
      currentOutcome = fitting.status
    } else {
      // booking (call1, call2, onboarding)
      const { data: booking } = await admin.from('bookings').select('opportunity_id, google_event_id, outcome').eq('id', eventId).single()
      if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      opportunityId = booking.opportunity_id
      googleEventId = booking.google_event_id
      currentOutcome = booking.outcome
    }

    // Get lead ID from opportunity
    if (opportunityId) {
      const { data: opp } = await admin.from('opportunities').select('lead_id, stage').eq('id', opportunityId).single()
      if (opp) leadId = opp.lead_id
    }

    // ─── COMPLETE ──────────────────────────────────────────────────────
    if (action === 'complete') {
      if (eventType === 'task') {
        await admin.from('tasks').update({ status: 'done' }).eq('id', eventId)
      } else if (eventType === 'visit') {
        await admin.from('visits').update({
          outcome: 'completed',
          completed_at: new Date().toISOString(),
          notes: notes ?? undefined,
        }).eq('id', eventId)
      } else {
        // booking
        await admin.from('bookings').update({
          outcome: 'completed',
          post_call_notes: notes ?? undefined,
        }).eq('id', eventId)
      }

      // Cancel queued reminders
      if (leadId) await cancelQueuedMessages(admin, leadId, opportunityId ?? undefined)

      // Log to stage_log
      if (opportunityId) {
        const stageAdvance = COMPLETE_STAGE_MAP[eventType]
        if (stageAdvance) {
          const { data: opp } = await admin.from('opportunities').select('stage').eq('id', opportunityId).single()
          if (opp?.stage === stageAdvance.from) {
            await admin.from('opportunities').update({ stage: stageAdvance.to }).eq('id', opportunityId)
            await admin.from('stage_log').insert({
              opportunity_id: opportunityId,
              from_stage: stageAdvance.from,
              to_stage: stageAdvance.to,
              changed_by: user.id,
              notes: `${eventType} completed`,
            })

            // Trigger automations for the new stage
            try {
              await runStageAutomations(admin, opportunityId!, stageAdvance.to)
            } catch (err) {
              console.error('[CALENDAR ACTION] Automation error:', err)
            }
          }
        }
      }

      // Queue thanks email
      const templateSlug = ACTION_TEMPLATES.complete?.[eventType]
      if (templateSlug && leadId) {
        await queueActionEmail(admin, leadId, opportunityId, templateSlug)
      }

      return NextResponse.json({ success: true, action: 'complete', stageAdvanced: !!COMPLETE_STAGE_MAP[eventType] })
    }

    // ─── NO SHOW ───────────────────────────────────────────────────────
    if (action === 'no_show') {
      if (eventType === 'visit') {
        await admin.from('visits').update({ outcome: 'no_show' }).eq('id', eventId)
      } else if (eventType === 'fitting') {
        // Fittings don't really have no-shows in the same way
        return NextResponse.json({ error: 'Cannot mark fitting as no-show' }, { status: 400 })
      } else if (eventType === 'task') {
        return NextResponse.json({ error: 'Cannot mark task as no-show' }, { status: 400 })
      } else {
        await admin.from('bookings').update({ outcome: 'no_show' }).eq('id', eventId)
      }

      // Cancel queued reminders
      if (leadId) await cancelQueuedMessages(admin, leadId, opportunityId ?? undefined)

      // Delete Google Calendar event
      if (googleEventId) {
        try { await deleteCalendarEvent(admin, googleEventId) } catch {}
      }

      // Increment no_show_count
      if (opportunityId) {
        const { data: opp } = await admin.from('opportunities').select('no_show_count').eq('id', opportunityId).single()
        if (opp) {
          await admin.from('opportunities').update({ no_show_count: (opp.no_show_count ?? 0) + 1 }).eq('id', opportunityId)
        }
      }

      // Log to stage_log
      if (opportunityId) {
        try {
          await admin.from('stage_log').insert({
            opportunity_id: opportunityId,
            from_stage: null,
            to_stage: null,
            changed_by: user.id,
            notes: `No-show on ${eventType}${reason ? ': ' + reason : ''}`,
          })
        } catch {} // stage_log may require from/to
      }

      // Queue no-show follow-up email
      const templateSlug = ACTION_TEMPLATES.no_show?.[eventType]
      if (templateSlug && leadId) {
        await queueActionEmail(admin, leadId, opportunityId, templateSlug)
      }

      // Check if 2+ no-shows → flag as risk
      let riskWarning: string | null = null
      if (opportunityId) {
        const { data: opp } = await admin.from('opportunities').select('no_show_count').eq('id', opportunityId).single()
        if (opp && (opp.no_show_count ?? 0) >= 2) {
          riskWarning = 'This lead has 2+ no-shows. Consider moving to on_hold or reaching out via a different channel.'
        }
      }

      return NextResponse.json({ success: true, action: 'no_show', riskWarning })
    }

    // ─── CANCEL ────────────────────────────────────────────────────────
    if (action === 'cancel') {
      // Check for deposit-paid edge case
      if (opportunityId && !confirm) {
        const { data: opp } = await admin.from('opportunities').select('stage').eq('id', opportunityId).single()
        const depositStages: OpportunityStage[] = ['deposit_paid', 'fitting_confirmed', 'onboarding_scheduled', 'onboarding_complete', 'production', 'installation']
        if (opp && depositStages.includes(opp.stage as OpportunityStage)) {
          return NextResponse.json({
            requiresConfirmation: true,
            warning: 'This client has paid a deposit. Cancelling may require a refund. Set confirm: true to proceed.',
          }, { status: 409 })
        }
      }

      if (eventType === 'visit') {
        await admin.from('visits').update({ outcome: 'cancelled' }).eq('id', eventId)
      } else if (eventType === 'fitting') {
        await admin.from('fitting_slots').update({ status: 'cancelled' }).eq('id', eventId)
      } else if (eventType === 'task') {
        await admin.from('tasks').update({ status: 'cancelled' }).eq('id', eventId)
      } else {
        await admin.from('bookings').update({ outcome: 'cancelled' }).eq('id', eventId)
      }

      // Cancel queued reminders
      if (leadId) await cancelQueuedMessages(admin, leadId, opportunityId ?? undefined)

      // Delete Google Calendar event
      if (googleEventId) {
        try { await deleteCalendarEvent(admin, googleEventId) } catch {}
      }

      // Log to stage_log
      if (opportunityId) {
        try {
          await admin.from('stage_log').insert({
            opportunity_id: opportunityId,
            from_stage: null,
            to_stage: null,
            changed_by: user.id,
            notes: `${eventType} cancelled${reason ? ': ' + reason : ''}`,
          })
        } catch {}
      }

      // Queue cancellation email
      const templateSlug = ACTION_TEMPLATES.cancel?.[eventType]
      if (templateSlug && leadId) {
        await queueActionEmail(admin, leadId, opportunityId, templateSlug)
      }

      // Check if this was the only active booking
      let suggestStage: string | null = null
      if (opportunityId && ['call1', 'call2', 'onboarding'].includes(eventType)) {
        const { count } = await admin.from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('opportunity_id', opportunityId)
          .in('outcome', ['pending'])
        if (count === 0) {
          suggestStage = 'on_hold'
        }
      }

      return NextResponse.json({ success: true, action: 'cancel', suggestStage })
    }

    // ─── RESCHEDULE ────────────────────────────────────────────────────
    if (action === 'reschedule') {
      if (!scheduled_at) {
        return NextResponse.json({ error: 'scheduled_at is required for reschedule' }, { status: 400 })
      }

      const newDate = new Date(scheduled_at)

      // Check FreeBusy for conflicts (bookings and visits only)
      if (['call1', 'call2', 'onboarding', 'visit'].includes(eventType)) {
        try {
          const endTime = new Date(newDate.getTime() + 60 * 60 * 1000) // 1 hour window
          const busy = await queryFreeBusy(admin, newDate.toISOString(), endTime.toISOString())
          if (busy.length > 0) {
            return NextResponse.json({
              conflict: true,
              busy,
              message: 'The selected time conflicts with an existing event.',
            }, { status: 409 })
          }
        } catch {
          // FreeBusy check failed — proceed anyway
        }
      }

      // Update the record
      if (eventType === 'visit') {
        await admin.from('visits').update({ scheduled_at: scheduled_at }).eq('id', eventId)
      } else if (eventType === 'fitting') {
        await admin.from('fitting_slots').update({ confirmed_date: scheduled_at }).eq('id', eventId)
      } else {
        await admin.from('bookings').update({
          scheduled_at: scheduled_at,
          outcome: 'pending', // Reset from 'rescheduled' if it was
        }).eq('id', eventId)
      }

      // Update Google Calendar event
      if (googleEventId) {
        try {
          const durationMin = eventType === 'fitting' ? 240 : 60
          await updateCalendarEvent(admin, googleEventId, {
            startTime: newDate.toISOString(),
            durationMin,
          })
        } catch (err) {
          console.error('[CALENDAR ACTION] Google Calendar update failed:', err)
        }
      }

      // Cancel old queued reminders and queue new ones
      if (leadId) {
        await cancelQueuedMessages(admin, leadId, opportunityId ?? undefined)
      }

      // Increment reschedule_count
      if (opportunityId) {
        const { data: opp } = await admin.from('opportunities').select('reschedule_count').eq('id', opportunityId).single()
        if (opp) {
          await admin.from('opportunities').update({ reschedule_count: (opp.reschedule_count ?? 0) + 1 }).eq('id', opportunityId)
        }
      }

      // Log to stage_log
      if (opportunityId) {
        try {
          await admin.from('stage_log').insert({
            opportunity_id: opportunityId,
            from_stage: null,
            to_stage: null,
            changed_by: user.id,
            notes: `${eventType} rescheduled to ${newDate.toLocaleDateString('en-GB')} ${newDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
          })
        } catch {}
      }

      // Queue reschedule confirmation email
      const templateSlug = ACTION_TEMPLATES.reschedule?.[eventType]
      if (templateSlug && leadId) {
        await queueActionEmail(admin, leadId, opportunityId, templateSlug, {
          date: newDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
          time: newDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          visit_date: newDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
          visit_time: newDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          fitting_date: newDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
        })
      }

      // Check reschedule count for risk warning
      let riskWarning: string | null = null
      if (opportunityId) {
        const { data: opp } = await admin.from('opportunities').select('reschedule_count').eq('id', opportunityId).single()
        if (opp && (opp.reschedule_count ?? 0) >= 3) {
          riskWarning = 'This lead has rescheduled 3+ times. Consider a direct call to confirm commitment.'
        }
      }

      return NextResponse.json({ success: true, action: 'reschedule', riskWarning })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Calendar action failed'
    console.error('[CALENDAR ACTION] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── Helper: queue an action email ──────────────────────────────────────────

async function queueActionEmail(
  supabase: ReturnType<typeof createAdminClient>,
  leadId: string,
  opportunityId: string | null,
  templateSlug: string,
  extraVars?: Record<string, string>
) {
  const { data: lead } = await supabase.from('leads').select('name, email, phone').eq('id', leadId).single()
  if (!lead?.email) return

  const template = await getTemplateBySlug(supabase, templateSlug)
  if (!template) return

  const firstName = lead.name?.split(' ')[0] ?? 'there'

  // Get owner name
  let ownerName = 'PaxBespoke'
  if (opportunityId) {
    const { data: opp } = await supabase.from('opportunities').select('owner_user_id').eq('id', opportunityId).single()
    if (opp?.owner_user_id) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', opp.owner_user_id).single()
      if (profile?.full_name) ownerName = profile.full_name
    }
  }

  // Get meet link if it's a booking
  let meetLink = ''
  if (opportunityId) {
    const { data: booking } = await supabase.from('bookings')
      .select('meet_link')
      .eq('opportunity_id', opportunityId)
      .not('meet_link', 'is', null)
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (booking?.meet_link) meetLink = booking.meet_link
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'
  const variables: Record<string, string> = {
    first_name: firstName,
    name: lead.name ?? '',
    owner_name: ownerName,
    meet_link: meetLink,
    booking_link: `${baseUrl}/book`,
    ...extraVars,
  }

  const subject = interpolate(template.subject, variables)
  const body = interpolate(template.body, variables)

  for (const channel of template.channels) {
    await supabase.from('message_logs').insert({
      lead_id: leadId,
      channel,
      template: templateSlug,
      status: 'queued',
      scheduled_for: null,
      metadata: {
        subject,
        body,
        opportunity_id: opportunityId,
        trigger: 'calendar_action',
      },
    })
  }
}

async function getTemplateBySlug(
  supabase: ReturnType<typeof createAdminClient>,
  slug: string
): Promise<{ subject: string; body: string; channels: ('email' | 'sms' | 'whatsapp')[] } | null> {
  const { data } = await supabase
    .from('message_templates')
    .select('subject, body, channels, active')
    .eq('slug', slug)
    .single()
  if (data?.active) return { subject: data.subject, body: data.body, channels: data.channels }
  return null
}
