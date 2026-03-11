-- Add call2_completed_at KPI timestamp to opportunities.
-- Mirrors call1_completed_at; set when an opportunity auto-moves to proposal_agreed
-- via the call2_attempt task completion path.
alter table opportunities
  add column if not exists call2_completed_at timestamptz;
