-- Form abandonment tracking: captures progressive form data so we can
-- re-engage visitors who start the booking form but don't complete it.

-- Add 'abandoned' to leads status check constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'contacted', 'lost', 'abandoned'));

CREATE TABLE IF NOT EXISTS form_abandonments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  -- Contact info (captured at step 1)
  name text,
  email text,
  phone text,
  whatsapp_opt_in boolean DEFAULT false,
  -- Form progress snapshot
  last_step int NOT NULL DEFAULT 1,
  last_step_label text,
  postcode text,
  postcode_location text,
  room text,
  style text,
  package_choice text,
  budget_range text,
  timeline text,
  -- Attribution
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  landing_page text,
  referrer text,
  device_type text,
  -- Status tracking
  status text DEFAULT 'active' CHECK (status IN ('active', 'converted', 'contacted', 'unsubscribed')),
  converted_lead_id uuid REFERENCES leads(id),
  followup_count int DEFAULT 0,
  last_followup_at timestamptz,
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abandonments_email ON form_abandonments(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_abandonments_visitor ON form_abandonments(visitor_id);
CREATE INDEX IF NOT EXISTS idx_abandonments_status ON form_abandonments(status);
CREATE INDEX IF NOT EXISTS idx_abandonments_last_activity ON form_abandonments(last_activity_at) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_abandonments_visitor_active ON form_abandonments(visitor_id) WHERE status = 'active';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_abandonment_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_abandonment_updated_at
  BEFORE UPDATE ON form_abandonments
  FOR EACH ROW EXECUTE FUNCTION update_abandonment_updated_at();

-- No RLS — written by public API with no auth, read by server-side admin queries only
