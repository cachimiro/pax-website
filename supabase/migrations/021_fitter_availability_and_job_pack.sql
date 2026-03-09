-- Fitter Availability, Job Pack, and Smart Offering

-- ─── Subcontractor enhancements ──────────────────────────────────────────────

ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS travel_radius_miles integer DEFAULT 30;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS service_areas text[] DEFAULT '{}';
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS available_for_jobs boolean NOT NULL DEFAULT true;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS google_token jsonb;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS google_calendar_id text;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS calendar_sync_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2);
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS total_jobs_completed integer NOT NULL DEFAULT 0;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS decline_rate numeric(5,2) DEFAULT 0;

-- ─── Fitter weekly availability schedule ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS fitter_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id uuid NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time time NOT NULL DEFAULT '08:00',
  end_time time NOT NULL DEFAULT '17:00',
  max_jobs_per_day integer NOT NULL DEFAULT 1,
  is_available boolean NOT NULL DEFAULT true,
  effective_from date DEFAULT CURRENT_DATE,
  effective_until date, -- null = indefinite
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subcontractor_id, day_of_week, effective_from)
);

CREATE INDEX idx_fitter_availability_sub ON fitter_availability(subcontractor_id);
CREATE INDEX idx_fitter_availability_day ON fitter_availability(day_of_week, is_available);

-- ─── Fitter blocked dates (holidays, personal) ──────────────────────────────

CREATE TABLE IF NOT EXISTS fitter_blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id uuid NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  end_date date, -- null = single day, set for multi-day blocks
  reason text,
  all_day boolean NOT NULL DEFAULT true,
  start_time time, -- if not all_day
  end_time time,   -- if not all_day
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subcontractor_id, blocked_date)
);

CREATE INDEX idx_fitter_blocked_sub ON fitter_blocked_dates(subcontractor_id);
CREATE INDEX idx_fitter_blocked_date ON fitter_blocked_dates(blocked_date);

-- ─── Job pack columns on fitting_jobs ────────────────────────────────────────

ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS fitting_fee numeric(10,2);
ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS scope_of_work text;
ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS access_notes text;
ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS parking_info text;
ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS ikea_order_ref text;
ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS special_instructions text;
ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS design_documents jsonb DEFAULT '[]'::jsonb;
ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS measurement_documents jsonb DEFAULT '[]'::jsonb;
ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS estimated_duration_hours numeric(4,1) DEFAULT 8;
ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS customer_email text;

-- ─── Smart offering columns on fitting_jobs ──────────────────────────────────

-- Update status check to include new statuses
ALTER TABLE fitting_jobs DROP CONSTRAINT IF EXISTS fitting_jobs_status_check;
ALTER TABLE fitting_jobs ADD CONSTRAINT fitting_jobs_status_check
  CHECK (status IN ('offered', 'assigned', 'accepted', 'declined', 'open_board', 'claimed', 'in_progress', 'completed', 'signed_off', 'approved', 'rejected', 'cancelled'));

ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS offered_at timestamptz;
ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS offer_expires_at timestamptz;
ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS offer_response text CHECK (offer_response IS NULL OR offer_response IN ('accepted', 'declined', 'expired'));
ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS decline_reason text;
ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS claimed_from_board boolean NOT NULL DEFAULT false;
ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS open_board_at timestamptz;
ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS google_event_id text;

-- ─── Job offer history (tracks all offers for a job) ─────────────────────────

CREATE TABLE IF NOT EXISTS fitting_job_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fitting_job_id uuid NOT NULL REFERENCES fitting_jobs(id) ON DELETE CASCADE,
  subcontractor_id uuid NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  offered_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  responded_at timestamptz,
  response text CHECK (response IS NULL OR response IN ('accepted', 'declined', 'expired')),
  decline_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_offers_job ON fitting_job_offers(fitting_job_id);
CREATE INDEX idx_job_offers_sub ON fitting_job_offers(subcontractor_id);
CREATE INDEX idx_job_offers_pending ON fitting_job_offers(subcontractor_id) WHERE response IS NULL;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fitter_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitter_blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitting_job_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage fitter_availability" ON fitter_availability FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated manage fitter_blocked_dates" ON fitter_blocked_dates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated manage fitting_job_offers" ON fitting_job_offers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Default availability for existing fitters (Mon-Fri 8-17) ────────────────

INSERT INTO fitter_availability (subcontractor_id, day_of_week, start_time, end_time, max_jobs_per_day, is_available)
SELECT s.id, d.day, '08:00'::time, '17:00'::time, 1, (d.day BETWEEN 1 AND 5)
FROM subcontractors s
CROSS JOIN generate_series(0, 6) AS d(day)
WHERE s.status = 'active'
ON CONFLICT DO NOTHING;
