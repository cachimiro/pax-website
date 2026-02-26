import type { SupabaseClient } from '@supabase/supabase-js'
import type { OpportunityStage } from './types'

interface AutomationContext {
  supabase: SupabaseClient
  opportunityId: string
  leadId: string
  ownerId: string | null
  leadName: string
}

type AutomationAction = (ctx: AutomationContext) => Promise<void>

/**
 * Actions to run when an opportunity enters a given stage.
 * Called from the useMoveOpportunityStage hook or webhook handlers.
 */
const stageAutomations: Partial<Record<OpportunityStage, AutomationAction[]>> = {
  new_enquiry: [
    // Create initial call task
    async (ctx) => {
      await ctx.supabase.from('tasks').insert({
        opportunity_id: ctx.opportunityId,
        type: 'call1_attempt',
        due_at: new Date().toISOString(),
        owner_user_id: ctx.ownerId,
        status: 'open',
        description: `First call attempt for ${ctx.leadName}`,
      })
    },
    // Log message (placeholder — actual sending handled by messaging integration)
    async (ctx) => {
      await ctx.supabase.from('message_logs').insert({
        lead_id: ctx.leadId,
        channel: 'email',
        template: 'confirmation_enquiry',
        status: 'queued',
      })
    },
  ],

  call1_scheduled: [
    // Create reminder tasks
    async (ctx) => {
      const { data: booking } = await ctx.supabase
        .from('bookings')
        .select('scheduled_at')
        .eq('opportunity_id', ctx.opportunityId)
        .eq('type', 'call1')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (booking?.scheduled_at) {
        const scheduledAt = new Date(booking.scheduled_at)

        // T-24h reminder
        const reminder24h = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000)
        if (reminder24h > new Date()) {
          await ctx.supabase.from('tasks').insert({
            opportunity_id: ctx.opportunityId,
            type: 'call1_reminder_24h',
            due_at: reminder24h.toISOString(),
            owner_user_id: ctx.ownerId,
            status: 'open',
            description: `Send 24h reminder to ${ctx.leadName}`,
          })
        }

        // T-2h reminder
        const reminder2h = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000)
        if (reminder2h > new Date()) {
          await ctx.supabase.from('tasks').insert({
            opportunity_id: ctx.opportunityId,
            type: 'call1_reminder_2h',
            due_at: reminder2h.toISOString(),
            owner_user_id: ctx.ownerId,
            status: 'open',
            description: `Send 2h reminder to ${ctx.leadName}`,
          })
        }
      }
    },
  ],

  qualified: [
    async (ctx) => {
      await ctx.supabase.from('tasks').insert({
        opportunity_id: ctx.opportunityId,
        type: 'schedule_call2',
        due_at: new Date().toISOString(),
        owner_user_id: ctx.ownerId,
        status: 'open',
        description: `Schedule Call 2 with ${ctx.leadName}`,
      })
    },
    async (ctx) => {
      await ctx.supabase.from('message_logs').insert({
        lead_id: ctx.leadId,
        channel: 'email',
        template: 'call2_invite',
        status: 'queued',
      })
    },
  ],

  call2_scheduled: [
    // Same reminder pattern as call1
    async (ctx) => {
      const { data: booking } = await ctx.supabase
        .from('bookings')
        .select('scheduled_at')
        .eq('opportunity_id', ctx.opportunityId)
        .eq('type', 'call2')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (booking?.scheduled_at) {
        const scheduledAt = new Date(booking.scheduled_at)
        const reminder24h = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000)
        if (reminder24h > new Date()) {
          await ctx.supabase.from('tasks').insert({
            opportunity_id: ctx.opportunityId,
            type: 'call2_reminder_24h',
            due_at: reminder24h.toISOString(),
            owner_user_id: ctx.ownerId,
            status: 'open',
            description: `Send 24h reminder for Call 2 with ${ctx.leadName}`,
          })
        }
      }
    },
  ],

  awaiting_deposit: [
    async (ctx) => {
      await ctx.supabase.from('message_logs').insert({
        lead_id: ctx.leadId,
        channel: 'email',
        template: 'deposit_request',
        status: 'queued',
      })
    },
  ],

  deposit_paid: [
    async (ctx) => {
      await ctx.supabase.from('tasks').insert({
        opportunity_id: ctx.opportunityId,
        type: 'schedule_onboarding',
        due_at: new Date().toISOString(),
        owner_user_id: ctx.ownerId,
        status: 'open',
        description: `Schedule onboarding for ${ctx.leadName}`,
      })
    },
    async (ctx) => {
      await ctx.supabase.from('message_logs').insert({
        lead_id: ctx.leadId,
        channel: 'email',
        template: 'onboarding_invite',
        status: 'queued',
      })
    },
  ],

  onboarding_scheduled: [
    async (ctx) => {
      const { data: booking } = await ctx.supabase
        .from('bookings')
        .select('scheduled_at')
        .eq('opportunity_id', ctx.opportunityId)
        .eq('type', 'onboarding')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (booking?.scheduled_at) {
        const scheduledAt = new Date(booking.scheduled_at)
        const reminder24h = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000)
        if (reminder24h > new Date()) {
          await ctx.supabase.from('tasks').insert({
            opportunity_id: ctx.opportunityId,
            type: 'onboarding_reminder_24h',
            due_at: reminder24h.toISOString(),
            owner_user_id: ctx.ownerId,
            status: 'open',
            description: `Send 24h onboarding reminder to ${ctx.leadName}`,
          })
        }
      }
    },
  ],

  complete: [
    async (ctx) => {
      await ctx.supabase.from('message_logs').insert({
        lead_id: ctx.leadId,
        channel: 'email',
        template: 'review_request',
        status: 'queued',
      })
    },
  ],
}

/**
 * Run all automation actions for a stage transition.
 * Errors in individual actions are logged but don't block the transition.
 */
export async function runStageAutomations(
  supabase: SupabaseClient,
  opportunityId: string,
  stage: OpportunityStage
): Promise<void> {
  const actions = stageAutomations[stage]
  if (!actions?.length) return

  // Fetch context
  const { data: opp } = await supabase
    .from('opportunities')
    .select('lead_id, owner_user_id')
    .eq('id', opportunityId)
    .single()

  if (!opp) return

  const { data: lead } = await supabase
    .from('leads')
    .select('name')
    .eq('id', opp.lead_id)
    .single()

  const ctx: AutomationContext = {
    supabase,
    opportunityId,
    leadId: opp.lead_id,
    ownerId: opp.owner_user_id,
    leadName: lead?.name ?? 'Unknown',
  }

  for (const action of actions) {
    try {
      await action(ctx)
    } catch (err) {
      console.error(`Automation error for stage ${stage}:`, err)
    }
  }
}
