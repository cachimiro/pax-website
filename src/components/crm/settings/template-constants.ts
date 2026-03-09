import type { MessageChannel, DelayRule } from '@/lib/crm/types'

export const CHANNEL_OPTIONS: { value: MessageChannel; label: string; icon: string }[] = [
  { value: 'email', label: 'Email', icon: '✉️' },
  { value: 'sms', label: 'SMS', icon: '💬' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '📱' },
]

export const DELAY_LABELS: Record<DelayRule, string> = {
  immediate: 'Send immediately',
  minutes_before_booking: 'Before booking',
  minutes_after_stage: 'After stage change',
  minutes_after_enquiry: 'After enquiry',
}

export const DELAY_HELP: Record<DelayRule, string> = {
  immediate: 'Sends as soon as the stage changes (processed every 2 minutes by the queue).',
  minutes_before_booking: 'Sends X minutes before the scheduled call/visit. Only works when a booking exists for this stage.',
  minutes_after_stage: 'Waits X minutes after the stage changes, then sends. Use for follow-ups.',
  minutes_after_enquiry: 'Waits X minutes after the lead first enquired. Use for drip sequences.',
}

export const TEMPLATE_VARIABLES = [
  { key: 'first_name', label: 'First Name', desc: 'Lead\'s first name (e.g. "Sarah"). Always available.', example: 'Sarah' },
  { key: 'name', label: 'Full Name', desc: 'Lead\'s full name (e.g. "Sarah Mitchell"). Always available.', example: 'Sarah Mitchell' },
  { key: 'owner_name', label: 'Owner Name', desc: 'Name of the team member assigned to this lead.', example: 'John Smith' },
  { key: 'project_type', label: 'Project Type', desc: 'Type of wardrobe project (e.g. "walk-in wardrobe"). From the lead\'s enquiry.', example: 'walk-in wardrobe' },
  { key: 'date', label: 'Booking Date', desc: 'Date of the scheduled call/visit (e.g. "Mon 3 Mar"). Only available when a booking exists.', example: 'Mon 3 Mar' },
  { key: 'time', label: 'Booking Time', desc: 'Time of the scheduled call/visit (e.g. "10:00"). Only available when a booking exists.', example: '10:00' },
  { key: 'amount', label: 'Deposit Amount', desc: 'Deposit amount in GBP (30% of project value). Only available at "Awaiting Deposit" stage.', example: '1,500' },
  { key: 'booking_link', label: 'Booking Link', desc: 'Link to the public booking page where leads can schedule a call.', example: 'https://paxbespoke.uk/book' },
  { key: 'payment_link', label: 'Payment Link', desc: 'Stripe checkout link for deposit payment. Auto-generated at "Awaiting Deposit" stage.', example: 'https://checkout.stripe.com/...' },
  { key: 'meet_link', label: 'Google Meet Link', desc: 'Video call link auto-created when a call is booked. Only available for call1/call2 stages.', example: 'https://meet.google.com/abc-defg-hij' },
  { key: 'cta_manage_booking', label: 'Manage Booking Link', desc: 'Self-service portal link for rescheduling/cancelling. Available for all booking stages.', example: 'https://paxbespoke.uk/my-booking?token=...' },
]

// Ordered by pipeline position
export const STAGE_OPTIONS = [
  { value: '', label: 'Manual only (no trigger)' },
  { value: 'new_enquiry', label: 'New Enquiry' },
  { value: 'call1_scheduled', label: 'Call 1 Scheduled' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'call2_scheduled', label: 'Call 2 Scheduled' },
  { value: 'proposal_agreed', label: 'Proposal Agreed' },
  { value: 'awaiting_deposit', label: 'Awaiting Deposit' },
  { value: 'deposit_paid', label: 'Deposit Paid' },
  { value: 'fitting_confirmed', label: 'Fitting Confirmed' },
  { value: 'fitter_assigned', label: 'Fitter Assigned' },
  { value: 'fitting_in_progress', label: 'Fitting In Progress' },
  { value: 'fitting_complete', label: 'Fitting Complete' },
  { value: 'sign_off_pending', label: 'Sign-Off Pending' },
  { value: 'complete', label: 'Complete' },
]

export function formatDelay(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / 1440)}d`
}

export function toggleChannel(channels: MessageChannel[], ch: MessageChannel): MessageChannel[] {
  return channels.includes(ch) ? channels.filter((c) => c !== ch) : [...channels, ch]
}

export function stageLabel(stage: string | null | undefined): string {
  if (!stage) return 'Manual'
  return STAGE_OPTIONS.find(s => s.value === stage)?.label ?? stage.replace(/_/g, ' ')
}

// Pipeline order index for sorting groups
export function stageOrder(stage: string | null | undefined): number {
  if (!stage) return 999
  const idx = STAGE_OPTIONS.findIndex(s => s.value === stage)
  return idx >= 0 ? idx : 998
}
