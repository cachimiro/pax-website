'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
  Lead,
  Opportunity,
  OpportunityStage,
  Booking,
  Task,
  Onboarding,
  Invoice,
  Payment,
  MessageLog,
  StageLog,
  Profile,
  LostReason,
  OpportunityWithLead,
  ServiceRegion,
  RegionStatus,
  MessageChannel,
  EmailThread,
  EmailMessage,
  EmailEvent,
  MessageTemplate,
} from './types'
import { toast } from 'sonner'
import { runStageAutomations } from './automation'

function supabase() {
  return createClient()
}

// ─── Profiles ────────────────────────────────────────────────────────────────

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('profiles')
        .select('*')
        .eq('active', true)
        .order('full_name')
      if (error) throw error
      return data as Profile[]
    },
  })
}

export function useProfile(id: string) {
  return useQuery({
    queryKey: ['profiles', id],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: !!id,
  })
}

// ─── Leads ───────────────────────────────────────────────────────────────────

export function useLeads(filters?: { status?: string; owner_user_id?: string; deleted?: boolean }) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      let query = supabase()
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.deleted) {
        query = query.not('deleted_at', 'is', null)
      } else {
        query = query.is('deleted_at', null)
      }

      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.owner_user_id) query = query.eq('owner_user_id', filters.owner_user_id)

      const { data, error } = await query

      // Fallback if deleted_at column doesn't exist yet
      if (error?.code === '42703') {
        let fallback = supabase().from('leads').select('*').order('created_at', { ascending: false })
        if (filters?.status) fallback = fallback.eq('status', filters.status)
        if (filters?.owner_user_id) fallback = fallback.eq('owner_user_id', filters.owner_user_id)
        const { data: d2, error: e2 } = await fallback
        if (e2) throw e2
        return (filters?.deleted ? [] : d2) as Lead[]
      }

      if (error) throw error
      return data as Lead[]
    },
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('leads')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Lead
    },
    enabled: !!id,
  })
}

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (lead: Partial<Lead> & Pick<Lead, 'name'>) => {
      const { data, error } = await supabase()
        .from('leads')
        .insert(lead)
        .select()
        .single()
      if (error) throw error
      return data as Lead
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead created')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase()
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Lead
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['leads', data.id] })
      toast.success('Lead updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useSoftDeleteLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase()
        .from('leads')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['opportunities'] })
      toast.success('Lead moved to trash')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useRestoreLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase()
        .from('leads')
        .update({ deleted_at: null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead restored')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function usePermanentDeleteLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase()
        .from('leads')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead permanently deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ─── Opportunities ──────────────────────────────────────────────────────────

export function useOpportunities(filters?: { stage?: OpportunityStage; owner_user_id?: string }) {
  return useQuery({
    queryKey: ['opportunities', filters],
    queryFn: async () => {
      let query = supabase()
        .from('opportunities')
        .select('*, lead:leads(*), owner:profiles!owner_user_id(id, full_name, avatar_url)')
        .order('updated_at', { ascending: false })

      if (filters?.stage) query = query.eq('stage', filters.stage)
      if (filters?.owner_user_id) query = query.eq('owner_user_id', filters.owner_user_id)

      const { data, error } = await query
      if (error) throw error
      // Filter out opportunities whose lead is soft-deleted
      return (data as OpportunityWithLead[]).filter((o) => !(o.lead as any)?.deleted_at)
    },
  })
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: ['opportunities', id],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('opportunities')
        .select('*, lead:leads(*), owner:profiles!owner_user_id(id, full_name, avatar_url)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as OpportunityWithLead
    },
    enabled: !!id,
  })
}

export function useCreateOpportunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (opp: Partial<Opportunity> & Pick<Opportunity, 'lead_id'>) => {
      const { data, error } = await supabase()
        .from('opportunities')
        .insert(opp)
        .select()
        .single()
      if (error) throw error
      return data as Opportunity
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] })
      toast.success('Opportunity created')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateOpportunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Opportunity> & { id: string }) => {
      const { data, error } = await supabase()
        .from('opportunities')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Opportunity
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['opportunities'] })
      qc.invalidateQueries({ queryKey: ['opportunities', data.id] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useMoveOpportunityStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      stage,
      lost_reason,
    }: {
      id: string
      stage: OpportunityStage
      lost_reason?: LostReason
    }) => {
      const updates: Partial<Opportunity> = { stage }
      if (lost_reason) updates.lost_reason = lost_reason

      // Set KPI timestamps
      if (stage === 'complete') updates.completed_at = new Date().toISOString()
      if (stage === 'deposit_paid') updates.deposit_paid_at = new Date().toISOString()
      if (stage === 'onboarding_complete') updates.onboarding_completed_at = new Date().toISOString()
      if (stage === 'qualified') updates.call1_completed_at = new Date().toISOString()

      const { data, error } = await supabase()
        .from('opportunities')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      // Log stage change
      const { data: { user } } = await supabase().auth.getUser()
      await supabase().from('stage_log').insert({
        opportunity_id: id,
        to_stage: stage,
        changed_by: user?.id,
      })

      // Run stage automations (non-blocking)
      runStageAutomations(supabase(), id, stage).catch(console.error)

      return data as Opportunity
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] })
      toast.success('Stage updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export function useBookings(opportunityId?: string) {
  return useQuery({
    queryKey: ['bookings', { opportunityId }],
    queryFn: async () => {
      let query = supabase()
        .from('bookings')
        .select('*')
        .order('scheduled_at', { ascending: false })

      if (opportunityId) query = query.eq('opportunity_id', opportunityId)

      const { data, error } = await query
      if (error) throw error
      return data as Booking[]
    },
  })
}

export function useBookingsByLead(leadId: string) {
  return useQuery({
    queryKey: ['bookings', 'lead', leadId],
    queryFn: async () => {
      const { data: opps } = await supabase()
        .from('opportunities')
        .select('id')
        .eq('lead_id', leadId)

      if (!opps?.length) return []

      const oppIds = opps.map((o) => o.id)
      const { data, error } = await supabase()
        .from('bookings')
        .select('*')
        .in('opportunity_id', oppIds)
        .order('scheduled_at', { ascending: false })

      if (error) throw error
      return data as Booking[]
    },
    enabled: !!leadId,
  })
}

export function useRescheduleBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, scheduled_at }: { id: string; scheduled_at: string }) => {
      const res = await fetch('/api/crm/bookings/reschedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id, scheduled_at }),
      })
      if (!res.ok) throw new Error('Failed to reschedule')
      return (await res.json()) as Booking
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export function useTasks(filters?: { status?: string; owner_user_id?: string }) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let query = supabase()
        .from('tasks')
        .select('*')
        .order('due_at', { ascending: true })

      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.owner_user_id) query = query.eq('owner_user_id', filters.owner_user_id)

      const { data, error } = await query
      if (error) throw error
      return data as Task[]
    },
  })
}

export function useTasksByLead(leadId: string) {
  return useQuery({
    queryKey: ['tasks', 'lead', leadId],
    queryFn: async () => {
      const { data: opps } = await supabase()
        .from('opportunities')
        .select('id')
        .eq('lead_id', leadId)

      if (!opps?.length) return []

      const oppIds = opps.map((o) => o.id)
      const { data, error } = await supabase()
        .from('tasks')
        .select('*')
        .in('opportunity_id', oppIds)
        .order('due_at', { ascending: true })

      if (error) throw error
      return data as Task[]
    },
    enabled: !!leadId,
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase()
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    onSuccess: async (data, variables) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })

      if ('status' in variables && variables.status === 'done') {
        toast.success('Task completed')

        // Auto-stage progression based on task type
        if (data.opportunity_id) {
          const autoMoveMap: Record<string, OpportunityStage> = {
            call1_attempt: 'qualified',
            call2_attempt: 'proposal_agreed',
            onboarding_session: 'onboarding_complete',
          }
          const targetStage = autoMoveMap[data.type]
          if (targetStage) {
            const { error: moveErr } = await supabase()
              .from('opportunities')
              .update({ stage: targetStage, updated_at: new Date().toISOString() })
              .eq('id', data.opportunity_id)
            if (!moveErr) {
              qc.invalidateQueries({ queryKey: ['opportunities'] })
              toast.success(`Auto-moved to ${targetStage.replace(/_/g, ' ')}`, { duration: 4000 })
            }
          }
        }
      } else if ('status' in variables && variables.status === 'open') {
        toast.success('Task reopened')
      } else {
        toast.success('Task updated')
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ─── Onboardings ─────────────────────────────────────────────────────────────

export function useOnboarding(opportunityId: string) {
  return useQuery({
    queryKey: ['onboardings', opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('onboardings')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .maybeSingle()
      if (error) throw error
      return data as Onboarding | null
    },
    enabled: !!opportunityId,
  })
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export function useInvoices(opportunityId?: string) {
  return useQuery({
    queryKey: ['invoices', { opportunityId }],
    queryFn: async () => {
      let query = supabase()
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })

      if (opportunityId) query = query.eq('opportunity_id', opportunityId)

      const { data, error } = await query
      if (error) throw error
      return data as Invoice[]
    },
  })
}

export function useInvoicesByLead(leadId: string) {
  return useQuery({
    queryKey: ['invoices', 'lead', leadId],
    queryFn: async () => {
      const { data: opps } = await supabase()
        .from('opportunities')
        .select('id')
        .eq('lead_id', leadId)

      if (!opps?.length) return []

      const oppIds = opps.map((o) => o.id)
      const { data, error } = await supabase()
        .from('invoices')
        .select('*')
        .in('opportunity_id', oppIds)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Invoice[]
    },
    enabled: !!leadId,
  })
}

// ─── Payments ────────────────────────────────────────────────────────────────

export function usePayments(invoiceId: string) {
  return useQuery({
    queryKey: ['payments', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('paid_at', { ascending: false })
      if (error) throw error
      return data as Payment[]
    },
    enabled: !!invoiceId,
  })
}

export function usePaymentsByLead(invoiceIds: string[]) {
  return useQuery({
    queryKey: ['payments_by_lead', invoiceIds],
    queryFn: async () => {
      if (invoiceIds.length === 0) return [] as Payment[]
      const { data, error } = await supabase()
        .from('payments')
        .select('*')
        .in('invoice_id', invoiceIds)
        .order('paid_at', { ascending: false })
      if (error) throw error
      return data as Payment[]
    },
    enabled: invoiceIds.length > 0,
  })
}

// ─── Message Logs ────────────────────────────────────────────────────────────

export function useMessageLogs(leadId: string) {
  return useQuery({
    queryKey: ['message_logs', leadId],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('message_logs')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
      if (error) throw error
      return data as MessageLog[]
    },
    enabled: !!leadId,
  })
}

// ─── Send Message ────────────────────────────────────────────────────────────

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { lead_id: string; channel: MessageChannel; subject?: string; body: string }) => {
      const res = await fetch('/api/crm/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to send message')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['message_logs', variables.lead_id] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ─── Google Integration Status ───────────────────────────────────────────────

export interface GoogleStatus {
  connected: boolean
  email?: string
  email_active?: boolean
  calendar_active?: boolean
  needs_reauth?: boolean
  connected_at?: string
  connected_by_name?: string
  stats?: {
    sent_this_week: number
    opens_this_week: number
    clicks_this_week: number
  }
  calendar_stats?: {
    synced_upcoming: number
  }
}

export function useGoogleStatus() {
  return useQuery<GoogleStatus>({
    queryKey: ['google_status'],
    queryFn: async () => {
      const res = await fetch('/api/crm/google/status')
      if (!res.ok) throw new Error('Failed to fetch Google status')
      return res.json()
    },
    staleTime: 60 * 1000,
    retry: 1,
  })
}

export function useGoogleConnect() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/crm/google/auth-url')
      if (!res.ok) throw new Error('Failed to get auth URL')
      const { url } = await res.json()
      window.location.href = url
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useGoogleDisconnect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/crm/google/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to disconnect')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['google_status'] })
      toast.success('Google account disconnected')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useGoogleToggle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { email_active?: boolean; calendar_active?: boolean }) => {
      const sb = supabase()
      const { error } = await sb
        .from('google_config')
        .update(payload)
        .neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['google_status'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ─── Email Threads & Messages ────────────────────────────────────────────────

export function useEmailThreadsByLead(leadId: string) {
  return useQuery({
    queryKey: ['email_threads', leadId],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('email_threads')
        .select('*')
        .eq('lead_id', leadId)
        .order('last_message_at', { ascending: false })
      if (error) throw error
      return data as EmailThread[]
    },
    enabled: !!leadId,
  })
}

export function useEmailMessagesByLead(leadId: string) {
  return useQuery({
    queryKey: ['email_messages', leadId],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('email_messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('received_at', { ascending: true })
      if (error) throw error
      return data as EmailMessage[]
    },
    enabled: !!leadId,
  })
}

export function useEmailEventsByLead(leadId: string) {
  return useQuery({
    queryKey: ['email_events', leadId],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('email_events')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as EmailEvent[]
    },
    enabled: !!leadId,
  })
}

// ─── Message Templates ───────────────────────────────────────────────────────

export function useMessageTemplates() {
  return useQuery({
    queryKey: ['message_templates'],
    queryFn: async () => {
      const res = await fetch('/api/crm/templates')
      if (!res.ok) throw new Error('Failed to fetch templates')
      return (await res.json()) as MessageTemplate[]
    },
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<MessageTemplate>) => {
      const res = await fetch('/api/crm/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to create')
      return (await res.json()) as MessageTemplate
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['message_templates'] }),
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<MessageTemplate> & { id: string }) => {
      const res = await fetch(`/api/crm/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to update')
      return (await res.json()) as MessageTemplate
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['message_templates'] }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/crm/templates/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['message_templates'] }),
  })
}

// ─── Stage Log ───────────────────────────────────────────────────────────────

export function useStageLog(opportunityId: string) {
  return useQuery({
    queryKey: ['stage_log', opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('stage_log')
        .select('*, changed_by_profile:profiles!changed_by(full_name)')
        .eq('opportunity_id', opportunityId)
        .order('changed_at', { ascending: false })
      if (error) throw error
      return data as (StageLog & { changed_by_profile: { full_name: string } | null })[]
    },
    enabled: !!opportunityId,
  })
}

export function useStageLogByOpportunityIds(opportunityIds: string[]) {
  return useQuery({
    queryKey: ['stage_log_by_opps', opportunityIds],
    queryFn: async () => {
      if (opportunityIds.length === 0) return [] as StageLog[]
      const { data, error } = await supabase()
        .from('stage_log')
        .select('*')
        .in('opportunity_id', opportunityIds)
        .order('changed_at', { ascending: false })
      if (error) throw error
      return data as StageLog[]
    },
    enabled: opportunityIds.length > 0,
  })
}

// ─── Service Regions ─────────────────────────────────────────────────────────

export function useServiceRegions() {
  return useQuery({
    queryKey: ['service_regions'],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('service_regions')
        .select('*')
        .order('name')
      if (error) throw error
      return data as ServiceRegion[]
    },
  })
}

export function useUpdateServiceRegion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RegionStatus }) => {
      const { error } = await supabase()
        .from('service_regions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service_regions'] })
      toast.success('Region updated')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

// ─── Channel Status ──────────────────────────────────────────────────────────

export interface ChannelStatus {
  email: { configured: boolean; provider: 'gmail' | 'resend' | 'none'; detail: string }
  sms: { configured: boolean; detail: string }
  whatsapp: { configured: boolean; detail: string }
}

export function useChannelStatus() {
  return useQuery<ChannelStatus>({
    queryKey: ['channel-status'],
    queryFn: async () => {
      const res = await fetch('/api/crm/channels/status')
      if (!res.ok) throw new Error('Failed to fetch channel status')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Email Signature ─────────────────────────────────────────────────────────

export interface SignatureConfig {
  name: string
  role: string
  phone: string
  email: string
  tagline: string
  logo_url: string
  website_url: string
}

export function useSignature() {
  return useQuery<SignatureConfig>({
    queryKey: ['email-signature'],
    queryFn: async () => {
      const res = await fetch('/api/crm/signature')
      const data = await res.json()
      return data.signature
    },
  })
}

export function useUpdateSignature() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sig: Partial<SignatureConfig>) => {
      const res = await fetch('/api/crm/signature', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sig),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to update signature')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-signature'] })
      toast.success('Signature updated')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

