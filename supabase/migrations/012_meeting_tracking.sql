-- B8a: Meeting tracking schema

-- Extend bookings with meeting attendance data
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS actual_start timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS actual_end timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attendee_count int DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_joined boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS owner_joined boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS post_call_notes text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ai_suggestion jsonb;
-- ai_suggestion shape: { stage: string, confidence: number, reasoning: string, sentiment: string, objections: string[], follow_up_actions: string[] }
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tracking_status text DEFAULT 'pending';
-- tracking_status: pending | checked | manual
-- pending = not yet checked by poller
-- checked = poller has processed this booking
-- manual = owner manually set the outcome

-- Extend booking_outcome enum with new values
ALTER TYPE booking_outcome ADD VALUE IF NOT EXISTS 'owner_no_show';
ALTER TYPE booking_outcome ADD VALUE IF NOT EXISTS 'technical_issue';
ALTER TYPE booking_outcome ADD VALUE IF NOT EXISTS 'partial';
ALTER TYPE booking_outcome ADD VALUE IF NOT EXISTS 'cancelled';

-- Post-call actions audit log
CREATE TABLE IF NOT EXISTS post_call_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- 'ai_suggestion' | 'owner_confirm' | 'owner_override' | 'auto_move' | 'auto_no_show' | 'reminder_sent'
  suggested_stage text,
  actual_stage text,
  confidence int, -- 0-100
  reasoning text,
  ai_response jsonb,
  acted_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE post_call_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read post_call_actions"
  ON post_call_actions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated insert post_call_actions"
  ON post_call_actions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Index for the meeting poller: find bookings that need checking
CREATE INDEX IF NOT EXISTS idx_bookings_tracking_pending
  ON bookings(scheduled_at)
  WHERE tracking_status = 'pending' AND outcome = 'pending';

-- Index for post_call_actions by booking
CREATE INDEX IF NOT EXISTS idx_post_call_actions_booking
  ON post_call_actions(booking_id);
