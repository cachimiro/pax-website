-- Lead notes: structured per-section timestamped note log
CREATE TABLE IF NOT EXISTS lead_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  section     text NOT NULL CHECK (section IN ('general','call','design','site_visit','objections')),
  body        text NOT NULL,
  author_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_lead_notes_lead ON lead_notes(lead_id);
CREATE INDEX idx_lead_notes_section ON lead_notes(lead_id, section);

ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read lead_notes"
  ON lead_notes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated insert lead_notes"
  ON lead_notes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Author update lead_notes"
  ON lead_notes FOR UPDATE
  USING (auth.uid() = author_id OR auth.uid() IS NOT NULL);

-- Add lead_id to tasks so tasks can be lead-level (not just opportunity-level)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks(lead_id);
