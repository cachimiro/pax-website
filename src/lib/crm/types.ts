// ─── Email (Gmail Integration) ───────────────────────────────────────

export interface EmailThread {
  id: string
  gmail_thread_id: string
  lead_id: string | null
  subject: string | null
  last_message_at: string | null
  message_count: number
  created_at: string
}

export interface EmailMessage {
  id: string
  gmail_message_id: string
  thread_id: string | null
  lead_id: string | null
  direction: 'inbound' | 'outbound'
  from_address: string
  to_address: string
  subject: string | null
  body_text: string | null
  body_html: string | null
  snippet: string | null
  gmail_label_ids: string[] | null
  received_at: string
  created_at: string
}

export interface EmailEvent {
  id: string
  message_log_id: string | null
  lead_id: string | null
  event_type: 'open' | 'click'
  url: string | null
  created_at: string
}

// ─── AI Preferences ──────────────────────────────────────────────────

export interface AIPreferences {
  suggestions_enabled?: boolean    // default true
  compose_enabled?: boolean        // default true
  briefing_enabled?: boolean       // default true
  health_check_enabled?: boolean   // default true
  notification_level?: 'quiet' | 'normal' | 'active'  // default 'normal'
  compose_tone?: 'formal' | 'friendly' | 'brief'      // default 'friendly'
  snooze_weekends?: boolean        // default true
  auto_task_enabled?: boolean      // default true — AI creates supplementary tasks on stage transitions
  evening_digest_enabled?: boolean // default true — show evening digest panel after 16:00
  stale_nudge_enabled?: boolean    // default true — surface stale-lead notifications
}

// ─── Enums ───────────────────────────────────────────────────────────────────

export type OpportunityStage =
  | 'new_enquiry'
  | 'call1_scheduled'
  | 'qualified'
  | 'meet1_completed'
  | 'design_created'
  | 'quote_sent'
  | 'visit_required'
  | 'visit_scheduled'
  | 'visit_completed'
  | 'call2_scheduled'
  | 'meet2_completed'
  | 'fitting_proposed'
  | 'proposal_agreed'
  | 'awaiting_deposit'
  | 'deposit_paid'
  | 'fitting_confirmed'
  | 'fitter_assigned'
  | 'fitting_in_progress'
  | 'fitting_complete'
  | 'sign_off_pending'
  | 'complete'
  | 'on_hold'
  | 'lost'
  | 'closed_not_interested'

export type EntryRoute = 'online_consultation' | 'video_call' | 'direct_visit'
export type PackageComplexity = 'budget' | 'standard' | 'select'

export type BookingType = 'call1' | 'call2' | 'onboarding'

export type BookingOutcome = 'pending' | 'completed' | 'no_show' | 'rescheduled' | 'owner_no_show' | 'technical_issue' | 'partial' | 'cancelled'

export type TrackingStatus = 'pending' | 'checked' | 'manual'

export type OnboardingStatus = 'pending' | 'scheduled' | 'completed' | 'verified'

export type InvoiceStatus = 'sent' | 'paid' | 'overdue'

export type MessageChannel = 'email' | 'sms' | 'whatsapp'

export type DelayRule = 'immediate' | 'minutes_before_booking' | 'minutes_after_stage' | 'minutes_after_enquiry'

export interface MessageTemplate {
  id: string
  slug: string
  name: string
  subject: string
  body: string
  channels: MessageChannel[]
  active: boolean
  delay_rule: DelayRule
  delay_minutes: number
  trigger_stage: string | null
  trigger_event: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type LostReason =
  | 'not_qualified'
  | 'price'
  | 'timing'
  | 'no_response'
  | 'cancelled'
  | 'competitor'

export type UserRole = 'admin' | 'sales' | 'operations'

export type RegionStatus = 'active' | 'coming_soon' | 'inactive'

export interface ServiceRegion {
  id: string
  name: string
  status: RegionStatus
  updated_at: string
}

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
  ai_preferences: AIPreferences
  created_at: string
  // Multi-user additions
  color: string
  google_email: string | null
  google_calendar_connected: boolean
  onboarding_complete: boolean
  invited_by: string | null
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
  // AI fields
  opted_out: boolean
  preferred_channel: 'email' | 'sms' | 'whatsapp' | null
  snoozed_until: string | null
  deleted_at: string | null
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
  call2_completed_at: string | null
  deposit_paid_at: string | null
  onboarding_completed_at: string | null
  completed_at: string | null
  // Sales process fields
  entry_route: EntryRoute | null
  package_complexity: PackageComplexity | null
  visit_required: boolean
  next_action: string | null
  next_action_date: string | null
  on_hold_at: string | null
  closed_reason: string | null
}

// ─── Sales Process Entities ──────────────────────────────────────────────────

// ─── Meet 1 Notes ────────────────────────────────────────────────────────────

export type ObstacleState = 'present' | 'not_present' | 'unknown'

export type FinishType = 'skirting_board' | 'flush_fit' | 'cornice' | 'other'

export interface FinishDetails {
  // skirting_board
  height_mm?: number
  photos_received?: boolean
  // flush_fit
  gap_noted?: boolean
  // cornice
  cornice_height_mm?: number
  // other / shared
  notes?: string
}

export interface Meet1Notes {
  id: string
  opportunity_id: string
  booking_id: string | null
  lead_id: string | null
  // Section 1
  room_confirmed: string | null
  space_constraints: string[] | null
  photos_on_file: boolean
  photos_note: string | null
  // Section 2
  package_confirmed: 'budget' | 'paxbespoke' | 'select' | null
  budget_responsibility_confirmed: boolean
  // Section 3
  obstacle_bed: ObstacleState
  obstacle_radiator: ObstacleState
  obstacle_curtain_rail: ObstacleState
  obstacle_coving: ObstacleState
  obstacle_picture_rail: ObstacleState
  obstacle_other: string | null
  // Section 4
  finish_type: FinishType | null
  finish_details: FinishDetails
  // Section 5
  call_notes: string | null
  next_action: string | null
  // Meta
  completed: boolean
  completed_by: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// ─── Designer colour palette ──────────────────────────────────────────────────
export const DESIGNER_COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#f97316', // orange
  '#06b6d4', // cyan
] as const

export interface Visit {
  id: string
  opportunity_id: string
  scheduled_at: string | null
  completed_at: string | null
  google_event_id: string | null
  address: string | null
  notes: string | null
  outcome: 'pending' | 'completed' | 'cancelled' | 'no_show'
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Design {
  id: string
  opportunity_id: string
  version: number
  file_url: string | null
  planner_link: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Quote {
  id: string
  opportunity_id: string
  design_id: string | null
  amount: number
  deposit_amount: number | null
  items: unknown[]
  pdf_url: string | null
  sent_at: string | null
  status: 'draft' | 'sent' | 'accepted' | 'revised' | 'rejected'
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface FittingSlot {
  id: string
  opportunity_id: string
  proposed_dates: string[]
  confirmed_date: string | null
  confirmed_at: string | null
  google_event_id: string | null
  status: 'proposed' | 'confirmed' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  opportunity_id: string
  type: BookingType
  scheduled_at: string
  duration_min: number
  owner_user_id: string | null
  outcome: BookingOutcome
  google_event_id: string | null
  meet_link: string | null
  actual_start: string | null
  actual_end: string | null
  attendee_count: number
  customer_joined: boolean
  owner_joined: boolean
  post_call_notes: string | null
  ai_suggestion: AISuggestion | null
  tracking_status: TrackingStatus
  created_at: string
}

export interface AISuggestion {
  stage: string
  confidence: number
  reasoning: string
  sentiment: 'positive' | 'negative' | 'mixed'
  objections: string[]
  follow_up_actions: string[]
}

export interface PostCallAction {
  id: string
  booking_id: string
  opportunity_id: string
  action_type: 'ai_suggestion' | 'owner_confirm' | 'owner_override' | 'auto_move' | 'auto_no_show' | 'reminder_sent'
  suggested_stage: string | null
  actual_stage: string | null
  confidence: number | null
  reasoning: string | null
  ai_response: Record<string, unknown> | null
  acted_by: string | null
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
  stripe_session_id: string | null
  created_at: string
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  paid_at: string
  method: string | null
}

export type LeadNoteSection = 'general' | 'call' | 'design' | 'site_visit' | 'objections'

export interface LeadNote {
  id: string
  lead_id: string
  section: LeadNoteSection
  body: string
  author_id: string | null
  created_at: string
  updated_at: string
  author?: { id: string; full_name: string | null; avatar_url: string | null } | null
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
      service_regions: { Row: ServiceRegion; Insert: AnyInsert; Update: AnyUpdate }
    }
    Enums: {
      opportunity_stage: OpportunityStage
      region_status: RegionStatus
      booking_type: BookingType
      booking_outcome: BookingOutcome
      onboarding_status: OnboardingStatus
      invoice_status: InvoiceStatus
      message_channel: MessageChannel
      lost_reason: LostReason
    }
  }
}
