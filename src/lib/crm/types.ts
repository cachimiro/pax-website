// ─── Enums ───────────────────────────────────────────────────────────────────

export type OpportunityStage =
  | 'new_enquiry'
  | 'call1_scheduled'
  | 'qualified'
  | 'call2_scheduled'
  | 'proposal_agreed'
  | 'awaiting_deposit'
  | 'deposit_paid'
  | 'onboarding_scheduled'
  | 'onboarding_complete'
  | 'production'
  | 'installation'
  | 'complete'
  | 'lost'

export type BookingType = 'call1' | 'call2' | 'onboarding'

export type BookingOutcome = 'pending' | 'completed' | 'no_show' | 'rescheduled'

export type OnboardingStatus = 'pending' | 'scheduled' | 'completed' | 'verified'

export type InvoiceStatus = 'sent' | 'paid' | 'overdue'

export type MessageChannel = 'email' | 'sms' | 'whatsapp'

export type LostReason =
  | 'not_qualified'
  | 'price'
  | 'timing'
  | 'no_response'
  | 'cancelled'
  | 'competitor'

export type UserRole = 'admin' | 'sales' | 'operations'

export type LeadStatus = 'new' | 'contacted' | 'lost'

export type TaskStatus = 'open' | 'done'

// ─── Row types ───────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  phone: string | null
  calendar_link: string | null
  service_regions: string[] | null
  active: boolean
  active_opportunities: number
  last_assigned_at: string | null
  avatar_url: string | null
  created_at: string
}

export interface Lead {
  id: string
  created_at: string
  name: string
  phone: string | null
  email: string | null
  postcode: string | null
  project_type: string | null
  budget_band: string | null
  source: string | null
  notes: string | null
  owner_user_id: string | null
  status: LeadStatus
  // Attribution
  traffic_source: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  landing_page: string | null
  referrer: string | null
  device_type: string | null
  first_visit_at: string | null
  visitor_id: string | null
}

export interface SiteSession {
  id: string
  visitor_id: string
  page_path: string
  referrer: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  device_type: string | null
  created_at: string
}

export interface Opportunity {
  id: string
  lead_id: string
  stage: OpportunityStage
  value_estimate: number | null
  lost_reason: LostReason | null
  owner_user_id: string | null
  created_at: string
  updated_at: string
  call1_completed_at: string | null
  deposit_paid_at: string | null
  onboarding_completed_at: string | null
  completed_at: string | null
}

export interface Booking {
  id: string
  opportunity_id: string
  type: BookingType
  scheduled_at: string
  duration_min: number
  owner_user_id: string | null
  outcome: BookingOutcome
  created_at: string
}

export interface Onboarding {
  id: string
  opportunity_id: string
  status: OnboardingStatus
  room_dimensions: string | null
  ceiling_height: string | null
  wall_measurements: string | null
  doors_windows: string | null
  obstacles: string | null
  materials: string | null
  finish: string | null
  access_notes: string | null
  install_conditions: string | null
  media_files: string[] | null
  video_recording_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  opportunity_id: string
  amount: number
  deposit_amount: number | null
  status: InvoiceStatus
  created_at: string
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  paid_at: string
  method: string | null
}

export interface Task {
  id: string
  opportunity_id: string | null
  type: string
  due_at: string | null
  owner_user_id: string | null
  status: TaskStatus
  description: string | null
  created_at: string
}

export interface MessageLog {
  id: string
  lead_id: string | null
  channel: MessageChannel
  template: string | null
  sent_at: string
  status: string | null
  metadata: Record<string, unknown> | null
}

export interface StageLog {
  id: string
  opportunity_id: string | null
  from_stage: OpportunityStage | null
  to_stage: OpportunityStage
  changed_by: string | null
  changed_at: string
  notes: string | null
}

// ─── Joined / enriched types for UI ─────────────────────────────────────────

export interface OpportunityWithLead extends Opportunity {
  lead: Lead
  owner: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

export interface LeadDetail extends Lead {
  opportunities: Opportunity[]
  bookings: Booking[]
  message_logs: MessageLog[]
  tasks: Task[]
}

// ─── Supabase Database type (minimal, for client generics) ──────────────────
// Using Record<string, any> for Insert/Update to avoid strict type conflicts
// with Supabase's generated types. Row types provide read-time safety.

type AnyInsert = Record<string, unknown>
type AnyUpdate = Record<string, unknown>

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: AnyInsert; Update: AnyUpdate }
      leads: { Row: Lead; Insert: AnyInsert; Update: AnyUpdate }
      opportunities: { Row: Opportunity; Insert: AnyInsert; Update: AnyUpdate }
      bookings: { Row: Booking; Insert: AnyInsert; Update: AnyUpdate }
      onboardings: { Row: Onboarding; Insert: AnyInsert; Update: AnyUpdate }
      invoices: { Row: Invoice; Insert: AnyInsert; Update: AnyUpdate }
      payments: { Row: Payment; Insert: AnyInsert; Update: AnyUpdate }
      tasks: { Row: Task; Insert: AnyInsert; Update: AnyUpdate }
      message_logs: { Row: MessageLog; Insert: AnyInsert; Update: AnyUpdate }
      stage_log: { Row: StageLog; Insert: AnyInsert; Update: AnyUpdate }
    }
    Enums: {
      opportunity_stage: OpportunityStage
      booking_type: BookingType
      booking_outcome: BookingOutcome
      onboarding_status: OnboardingStatus
      invoice_status: InvoiceStatus
      message_channel: MessageChannel
      lost_reason: LostReason
    }
  }
}
