-- Structured notes captured during Meet 1 (call1) via the in-CRM Call Guide.
-- One row per opportunity. Upserted as the salesperson fills in the guide live.
-- On call completion the call_notes field is also written to bookings.post_call_notes
-- so the existing AI post-call flow picks it up automatically.

CREATE TABLE IF NOT EXISTS meet1_notes (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id          uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  booking_id              uuid REFERENCES bookings(id) ON DELETE SET NULL,
  lead_id                 uuid REFERENCES leads(id) ON DELETE CASCADE,

  -- Section 1: Space
  room_confirmed          text,
  space_constraints       text[],
  photos_on_file          boolean DEFAULT false,
  photos_note             text,

  -- Section 2: Package
  package_confirmed       text CHECK (package_confirmed IN ('budget', 'paxbespoke', 'select')),
  budget_responsibility_confirmed boolean DEFAULT false,  -- Budget only: customer confirmed they own measurements

  -- Section 3: Obstacles (tri-state per item: 'present' | 'not_present' | 'unknown')
  obstacle_bed            text DEFAULT 'unknown',
  obstacle_radiator       text DEFAULT 'unknown',
  obstacle_curtain_rail   text DEFAULT 'unknown',
  obstacle_coving         text DEFAULT 'unknown',
  obstacle_picture_rail   text DEFAULT 'unknown',
  obstacle_other          text,

  -- Section 4: Finish details (PaxBespoke / Select only)
  finish_type             text,  -- 'skirting_board' | 'flush_fit' | 'cornice' | 'other'
  finish_details          jsonb DEFAULT '{}',
  -- skirting_board: { height_mm: number, photos_received: bool }
  -- flush_fit:      { gap_noted: bool, notes: string }
  -- cornice:        { height_mm: number, photos_received: bool }
  -- other:          { description: string }

  -- Section 5: Call notes
  call_notes              text,
  next_action             text,

  -- Meta
  completed               boolean DEFAULT false,
  completed_by            uuid REFERENCES profiles(id),
  completed_at            timestamptz,
  created_by              uuid REFERENCES profiles(id),
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meet1_notes_opportunity
  ON meet1_notes(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_meet1_notes_lead
  ON meet1_notes(lead_id);

CREATE INDEX IF NOT EXISTS idx_meet1_notes_booking
  ON meet1_notes(booking_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_meet1_notes_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_meet1_notes_updated_at
  BEFORE UPDATE ON meet1_notes
  FOR EACH ROW EXECUTE FUNCTION update_meet1_notes_updated_at();

-- RLS: authenticated staff only
ALTER TABLE meet1_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read meet1_notes"
  ON meet1_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage meet1_notes"
  ON meet1_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
