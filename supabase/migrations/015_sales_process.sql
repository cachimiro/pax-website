-- Sales process upgrade: new stages, entities, and opportunity fields.
-- Maps to the PaxBespoke Sales Process (End-to-End) document.

-- ─── NEW STAGES ──────────────────────────────────────────────────────────────
-- Postgres enums require individual ADD VALUE statements.

ALTER TYPE opportunity_stage ADD VALUE IF NOT EXISTS 'meet1_completed' AFTER 'qualified';
ALTER TYPE opportunity_stage ADD VALUE IF NOT EXISTS 'design_created' AFTER 'meet1_completed';
ALTER TYPE opportunity_stage ADD VALUE IF NOT EXISTS 'quote_sent' AFTER 'design_created';
ALTER TYPE opportunity_stage ADD VALUE IF NOT EXISTS 'visit_required' AFTER 'quote_sent';
ALTER TYPE opportunity_stage ADD VALUE IF NOT EXISTS 'visit_scheduled' AFTER 'visit_required';
ALTER TYPE opportunity_stage ADD VALUE IF NOT EXISTS 'visit_completed' AFTER 'visit_scheduled';
ALTER TYPE opportunity_stage ADD VALUE IF NOT EXISTS 'meet2_completed' AFTER 'call2_scheduled';
ALTER TYPE opportunity_stage ADD VALUE IF NOT EXISTS 'fitting_proposed' AFTER 'meet2_completed';
ALTER TYPE opportunity_stage ADD VALUE IF NOT EXISTS 'fitting_confirmed' AFTER 'deposit_paid';
ALTER TYPE opportunity_stage ADD VALUE IF NOT EXISTS 'on_hold' AFTER 'onboarding_complete';
ALTER TYPE opportunity_stage ADD VALUE IF NOT EXISTS 'closed_not_interested' AFTER 'lost';

-- ─── OPPORTUNITY FIELDS ──────────────────────────────────────────────────────

ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS entry_route text
  CHECK (entry_route IN ('online_consultation', 'video_call', 'direct_visit'));
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS package_complexity text
  CHECK (package_complexity IN ('budget', 'standard', 'select'));
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS visit_required boolean DEFAULT false;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS next_action text;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS next_action_date timestamptz;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS on_hold_at timestamptz;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS closed_reason text;

-- ─── VISITS ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  scheduled_at timestamptz,
  completed_at timestamptz,
  google_event_id text,
  address text,
  notes text,
  outcome text DEFAULT 'pending' CHECK (outcome IN ('pending', 'completed', 'cancelled', 'no_show')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visits_opportunity ON visits(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_visits_scheduled ON visits(scheduled_at) WHERE outcome = 'pending';

-- ─── DESIGNS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  version int DEFAULT 1,
  file_url text,
  planner_link text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_designs_opportunity ON designs(opportunity_id);

-- ─── QUOTES ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  design_id uuid REFERENCES designs(id),
  amount numeric(10,2) NOT NULL,
  deposit_amount numeric(10,2),
  items jsonb DEFAULT '[]',
  pdf_url text,
  sent_at timestamptz,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'revised', 'rejected')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_opportunity ON quotes(opportunity_id);

-- ─── FITTING SLOTS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fitting_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  proposed_dates jsonb DEFAULT '[]',
  confirmed_date timestamptz,
  confirmed_at timestamptz,
  google_event_id text,
  status text DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fittings_opportunity ON fitting_slots(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_fittings_confirmed ON fitting_slots(confirmed_date) WHERE status = 'confirmed';

-- ─── RLS (admin-only for all new tables) ─────────────────────────────────────

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitting_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read visits" ON visits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage visits" ON visits FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read designs" ON designs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage designs" ON designs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read quotes" ON quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage quotes" ON quotes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read fitting_slots" ON fitting_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage fitting_slots" ON fitting_slots FOR ALL TO authenticated USING (true) WITH CHECK (true);
