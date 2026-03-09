// ─── Checklist definitions (from PaxBespoke Fitting Checklist PDF) ──────────

export interface ChecklistItem {
  key: string
  label: string
  checked: boolean
  note?: string
}

export interface ChecklistData {
  items: ChecklistItem[]
  completed_at?: string
  additional_notes?: string
}

export const CHECKLIST_BEFORE: Omit<ChecklistItem, 'checked'>[] = [
  { key: 'measurements_checked', label: 'Measurements checked on site against approved design' },
  { key: 'design_verified', label: 'Design matches client approval (layout, finishes, unit count)' },
  { key: 'handles_interior_checked', label: 'Handles and interior components checked (drawers, shelves, rails, accessories)' },
  { key: 'materials_checked', label: 'All materials checked (frames, panels, infills, fixings, trim)' },
  { key: 'wall_condition_checked', label: 'Wall condition assessed (uneven walls, sockets, pipes, cracks, damp)' },
  { key: 'flooring_confirmed', label: 'Carpet/flooring decision confirmed (stays or removed under wardrobe)' },
  { key: 'obstructions_checked', label: 'Curtain rail/obstructions agreed (remove, shorten, or work around)' },
  { key: 'waste_disposal_confirmed', label: 'Waste disposal arrangements confirmed' },
  { key: 'dismantling_confirmed', label: 'Dismantling confirmed if applicable (what is kept vs disposed)' },
  { key: 'photos_before_taken', label: 'Minimum 5 before photos taken (walls, floor, ceiling, any issues)' },
]

export const CHECKLIST_AFTER: Omit<ChecklistItem, 'checked'>[] = [
  { key: 'technical_check', label: 'Technical check completed (door alignment, hinges, drawers, shelves)' },
  { key: 'client_walkthrough', label: 'Final walkthrough completed with client (confirms matches design)' },
  { key: 'walls_checked', label: 'Walls/surrounding areas checked with client (marks/issues explained)' },
  { key: 'cleaning_completed', label: 'Cleaning completed (inside and outside, no dust/offcuts)' },
  { key: 'photos_after_taken', label: 'Minimum 5 after photos taken from different angles (doors open + internal)' },
  { key: 'videos_recorded', label: 'Minimum 2 videos recorded (overall view + door/drawer functionality)' },
  { key: 'client_confirmation', label: 'Client confirmation received before leaving' },
]

export function initChecklist(template: Omit<ChecklistItem, 'checked'>[]): ChecklistData {
  return {
    items: template.map(t => ({ ...t, checked: false })),
  }
}

// ─── Fitting job types ──────────────────────────────────────────────────────

export type FittingJobStatus = 'offered' | 'assigned' | 'accepted' | 'declined' | 'open_board' | 'claimed' | 'in_progress' | 'completed' | 'signed_off' | 'approved' | 'rejected' | 'cancelled'
export type SubcontractorStatus = 'invited' | 'active' | 'suspended'
export type SignerRelation = 'owner' | 'tenant' | 'family_member' | 'other'
export type SignOffMethod = 'in_person' | 'remote_link'
export type OfferResponse = 'accepted' | 'declined' | 'expired'

export interface Subcontractor {
  id: string
  user_id: string | null
  name: string
  contact_name: string | null
  email: string
  phone: string | null
  status: SubcontractorStatus
  invite_sent_at: string | null
  activated_at: string | null
  notes: string | null
  available_for_jobs: boolean
  travel_radius_miles: number
  service_areas: string[]
  google_calendar_id: string | null
  calendar_sync_enabled: boolean
  avg_rating: number | null
  total_jobs_completed: number
  decline_rate: number
  created_at: string
}

export interface FitterAvailability {
  id: string
  subcontractor_id: string
  day_of_week: number // 0=Sunday
  start_time: string
  end_time: string
  max_jobs_per_day: number
  is_available: boolean
  effective_from: string
  effective_until: string | null
}

export interface FitterBlockedDate {
  id: string
  subcontractor_id: string
  blocked_date: string
  end_date: string | null
  reason: string | null
  all_day: boolean
  start_time: string | null
  end_time: string | null
}

export interface JobDocument {
  name: string
  url: string
  uploaded_at: string
}

export interface FittingJob {
  id: string
  fitting_slot_id: string | null
  opportunity_id: string
  subcontractor_id: string
  assigned_by: string | null
  assigned_at: string
  status: FittingJobStatus
  job_code: string
  scheduled_date: string | null
  customer_name: string | null
  customer_address: string | null
  customer_phone: string | null
  customer_email: string | null
  // Job pack
  fitting_fee: number | null
  scope_of_work: string | null
  access_notes: string | null
  parking_info: string | null
  ikea_order_ref: string | null
  special_instructions: string | null
  design_documents: JobDocument[]
  measurement_documents: JobDocument[]
  estimated_duration_hours: number
  notes: string | null
  // Offering
  offered_at: string | null
  offer_expires_at: string | null
  offer_response: OfferResponse | null
  decline_reason: string | null
  claimed_from_board: boolean
  open_board_at: string | null
  google_event_id: string | null
  // Checklists
  checklist_before: ChecklistData
  checklist_after: ChecklistData
  photos_before: string[]
  photos_after: string[]
  videos: string[]
  notes_before: string | null
  notes_after: string | null
  // Signatures
  fitter_signature: string | null
  fitter_signed_at: string | null
  customer_signature: string | null
  customer_signed_at: string | null
  customer_signer_name: string | null
  customer_signer_relation: SignerRelation | null
  sign_off_method: SignOffMethod | null
  sign_off_token: string | null
  sign_off_sent_to: string | null
  sign_off_sent_at: string | null
  // Completion
  completed_at: string | null
  approved_at: string | null
  approved_by: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  // Joined data
  subcontractor?: Subcontractor
}

export interface FittingJobOffer {
  id: string
  fitting_job_id: string
  subcontractor_id: string
  offered_at: string
  expires_at: string
  responded_at: string | null
  response: OfferResponse | null
  decline_reason: string | null
}

export interface FittingMessage {
  id: string
  fitting_job_id: string
  sender_type: 'fitter' | 'office'
  sender_id: string
  message: string
  attachments: string[]
  read_at: string | null
  created_at: string
}
