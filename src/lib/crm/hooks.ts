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

export function useLeads(filters?: { status?: string; owner_user_id?: string }) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      let query = supabase()
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.owner_user_id) query = query.eq('owner_user_id', filters.owner_user_id)

      const { data, error } = await query
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
      return data as OpportunityWithLead[]
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
