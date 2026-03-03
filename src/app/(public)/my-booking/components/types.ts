export interface PortalBooking {
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

export type PortalStep =
  | 'lookup'
  | 'code'
  | 'bookings'
  | 'reschedule'
  | 'cancel'
  | 'success'
  | 'no-bookings'
  | 'locked'
  | 'expired'
