-- AI Memory Layer
-- ai_insights: computed business benchmarks updated nightly (no OpenAI cost)
-- ai_suggestion_log: tracks every suggestion shown + staff outcome for feedback loop

CREATE TABLE IF NOT EXISTS ai_insights (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type text NOT NULL,
  -- 'stage_conversion' | 'avg_time_in_stage' | 'lost_reason_pattern'
  -- | 'suggestion_accuracy' | 'message_effectiveness'
  stage        text,
  metric_key   text NOT NULL,
  metric_value jsonb NOT NULL,
  sample_size  int  DEFAULT 0,
  computed_at  timestamptz DEFAULT now(),
  UNIQUE (insight_type, metric_key)
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read ai_insights"
  ON ai_insights FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid()));

-- Service role (used by API routes) can upsert
CREATE POLICY "Service upsert ai_insights"
  ON ai_insights FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_suggestion_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id   uuid REFERENCES opportunities(id) ON DELETE CASCADE,
  suggestion_type  text NOT NULL,
  -- 'next_action' | 'stage_move' | 'message_draft' | 'task_create' | 'stale_alert'
  suggested_value  text NOT NULL,
  actual_value     text,
  outcome          text CHECK (outcome IN ('accepted', 'overridden', 'ignored', 'dismissed')),
  staff_user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  suggested_at     timestamptz DEFAULT now(),
  resolved_at      timestamptz
);

ALTER TABLE ai_suggestion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read own suggestion log"
  ON ai_suggestion_log FOR SELECT
  USING (
    staff_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Staff insert suggestion log"
  ON ai_suggestion_log FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid()));

CREATE POLICY "Staff update own suggestion log"
  ON ai_suggestion_log FOR UPDATE
  USING (staff_user_id = auth.uid())
  WITH CHECK (staff_user_id = auth.uid());

CREATE POLICY "Service manage suggestion log"
  ON ai_suggestion_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Index for fast aggregation in recompute-insights job
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_log_type_outcome
  ON ai_suggestion_log (suggestion_type, outcome);

CREATE INDEX IF NOT EXISTS idx_ai_suggestion_log_opportunity
  ON ai_suggestion_log (opportunity_id);

-- Add draft support to message_logs (status already text, just needs index)
CREATE INDEX IF NOT EXISTS idx_message_logs_draft
  ON message_logs (lead_id, status) WHERE status = 'draft';

-- Add ai_auto_created flag to tasks so UI can badge them
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_auto_created boolean DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_suggestion_log_id uuid REFERENCES ai_suggestion_log(id) ON DELETE SET NULL;
