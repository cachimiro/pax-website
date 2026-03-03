-- Subcontractor Portal & Digital Fitting Checklist

-- Subcontractors table
CREATE TABLE IF NOT EXISTS subcontractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  contact_name text,
  email text NOT NULL UNIQUE,
  phone text,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended')),
  invite_token text,
  invite_sent_at timestamptz,
  activated_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subcontractors_email ON subcontractors(email);
CREATE INDEX idx_subcontractors_user ON subcontractors(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_subcontractors_status ON subcontractors(status);

-- Fitting jobs (links fitting_slot to subcontractor with checklist data)
CREATE TABLE IF NOT EXISTS fitting_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fitting_slot_id uuid REFERENCES fitting_slots(id) ON DELETE SET NULL,
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  subcontractor_id uuid NOT NULL REFERENCES subcontractors(id) ON DELETE RESTRICT,
  assigned_by uuid REFERENCES profiles(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'in_progress', 'completed', 'signed_off', 'approved', 'rejected', 'cancelled')),
  job_code text NOT NULL,
  scheduled_date timestamptz,
  customer_name text,
  customer_address text,
  customer_phone text,
  -- Checklists (JSONB with items array)
  checklist_before jsonb DEFAULT '{"items":[]}'::jsonb,
  checklist_after jsonb DEFAULT '{"items":[]}'::jsonb,
  -- Media
  photos_before text[] DEFAULT '{}',
  photos_after text[] DEFAULT '{}',
  videos text[] DEFAULT '{}',
  -- Notes
  notes_before text,
  notes_after text,
  -- Signatures
  fitter_signature text,
  fitter_signed_at timestamptz,
  customer_signature text,
  customer_signed_at timestamptz,
  customer_signer_name text,
  customer_signer_relation text CHECK (customer_signer_relation IS NULL OR customer_signer_relation IN ('owner', 'tenant', 'family_member', 'other')),
  sign_off_method text CHECK (sign_off_method IS NULL OR sign_off_method IN ('in_person', 'remote_link')),
  sign_off_token text,
  sign_off_sent_to text,
  sign_off_sent_at timestamptz,
  -- Completion
  completed_at timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES profiles(id),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fitting_jobs_subcontractor ON fitting_jobs(subcontractor_id);
CREATE INDEX idx_fitting_jobs_opportunity ON fitting_jobs(opportunity_id);
CREATE INDEX idx_fitting_jobs_status ON fitting_jobs(status);
CREATE INDEX idx_fitting_jobs_code ON fitting_jobs(job_code);
CREATE INDEX idx_fitting_jobs_signoff ON fitting_jobs(sign_off_token) WHERE sign_off_token IS NOT NULL;

-- Fitting messages (fitter <-> office)
CREATE TABLE IF NOT EXISTS fitting_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fitting_job_id uuid NOT NULL REFERENCES fitting_jobs(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('fitter', 'office')),
  sender_id uuid NOT NULL,
  message text NOT NULL,
  attachments text[] DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fitting_messages_job ON fitting_messages(fitting_job_id);
CREATE INDEX idx_fitting_messages_unread ON fitting_messages(fitting_job_id) WHERE read_at IS NULL;

-- RLS policies
ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitting_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitting_messages ENABLE ROW LEVEL SECURITY;

-- CRM users can manage all
CREATE POLICY "CRM users manage subcontractors" ON subcontractors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "CRM users manage fitting_jobs" ON fitting_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "CRM users manage fitting_messages" ON fitting_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Job code sequence
CREATE SEQUENCE IF NOT EXISTS fitting_job_code_seq START 1;

-- Auto-generate job code function
CREATE OR REPLACE FUNCTION generate_job_code()
RETURNS trigger AS $$
BEGIN
  NEW.job_code := 'PB-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(nextval('fitting_job_code_seq')::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fitting_job_code_trigger
  BEFORE INSERT ON fitting_jobs
  FOR EACH ROW
  WHEN (NEW.job_code IS NULL OR NEW.job_code = '')
  EXECUTE FUNCTION generate_job_code();

-- Storage bucket for fitting media
INSERT INTO storage.buckets (id, name, public) VALUES ('fitting-media', 'fitting-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload fitting media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fitting-media');

CREATE POLICY "Anyone can view fitting media"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'fitting-media');

CREATE POLICY "Authenticated users can delete fitting media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fitting-media');
