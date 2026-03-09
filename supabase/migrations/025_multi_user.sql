-- Multi-user CRM: per-designer Google Calendar tokens, user colours,
-- onboarding state, and row-level data scoping for non-admin users.

-- ─── Profile additions ────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS color                        text DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS google_access_token_enc      text,
  ADD COLUMN IF NOT EXISTS google_refresh_token_enc     text,
  ADD COLUMN IF NOT EXISTS google_token_expires_at      timestamptz,
  ADD COLUMN IF NOT EXISTS google_email                 text,
  ADD COLUMN IF NOT EXISTS google_calendar_connected    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS invited_by                   uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS onboarding_complete          boolean DEFAULT true;
  -- true for existing users so they aren't redirected to onboarding

-- New invited users will have onboarding_complete = false set explicitly on insert.

COMMENT ON COLUMN profiles.color                     IS 'Hex colour for this user, used for pipeline colour coding';
COMMENT ON COLUMN profiles.google_calendar_connected IS 'True once the user has completed Google Calendar OAuth';
COMMENT ON COLUMN profiles.onboarding_complete       IS 'False for newly invited users until they complete the onboarding flow';

-- ─── RLS: data scoping for non-admin users ────────────────────────────────────
-- Non-admin users may only read/write rows they own.
-- Admin retains unrestricted access (existing policies already cover this).
-- We DROP and RECREATE the relevant policies to add the owner scope.

-- LEADS
DROP POLICY IF EXISTS "Users read own leads" ON leads;
CREATE POLICY "Users read own leads"
  ON leads FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  );

DROP POLICY IF EXISTS "Users write own leads" ON leads;
CREATE POLICY "Users write own leads"
  ON leads FOR ALL
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  );

-- OPPORTUNITIES
DROP POLICY IF EXISTS "Users read own opportunities" ON opportunities;
CREATE POLICY "Users read own opportunities"
  ON opportunities FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  );

DROP POLICY IF EXISTS "Users write own opportunities" ON opportunities;
CREATE POLICY "Users write own opportunities"
  ON opportunities FOR ALL
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  );

-- BOOKINGS (scoped via opportunity ownership)
DROP POLICY IF EXISTS "Users read own bookings" ON bookings;
CREATE POLICY "Users read own bookings"
  ON bookings FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  );

DROP POLICY IF EXISTS "Users write own bookings" ON bookings;
CREATE POLICY "Users write own bookings"
  ON bookings FOR ALL
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  );

-- TASKS
DROP POLICY IF EXISTS "Users read own tasks" ON tasks;
CREATE POLICY "Users read own tasks"
  ON tasks FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  );

DROP POLICY IF EXISTS "Users write own tasks" ON tasks;
CREATE POLICY "Users write own tasks"
  ON tasks FOR ALL
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  );

-- MEET1_NOTES (scoped via lead ownership)
DROP POLICY IF EXISTS "Authenticated users can read meet1_notes" ON meet1_notes;
DROP POLICY IF EXISTS "Authenticated users can manage meet1_notes" ON meet1_notes;

CREATE POLICY "Users read own meet1_notes"
  ON meet1_notes FOR SELECT
  USING (
    lead_id IN (
      SELECT id FROM leads WHERE owner_user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  );

CREATE POLICY "Users manage own meet1_notes"
  ON meet1_notes FOR ALL
  USING (
    lead_id IN (
      SELECT id FROM leads WHERE owner_user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  )
  WITH CHECK (
    lead_id IN (
      SELECT id FROM leads WHERE owner_user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  );

-- ─── Designer colour palette (used by invite API to auto-assign) ──────────────
-- Stored as a reference — the invite API cycles through these.
-- No table needed; palette is defined in application code.
