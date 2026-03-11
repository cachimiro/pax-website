-- Fitter portal improvements

-- 1. Add en_route status
ALTER TABLE fitting_jobs DROP CONSTRAINT IF EXISTS fitting_jobs_status_check;
ALTER TABLE fitting_jobs ADD CONSTRAINT fitting_jobs_status_check
  CHECK (status IN (
    'offered','assigned','accepted','en_route','declined','open_board',
    'claimed','in_progress','completed','signed_off','approved','rejected','cancelled'
  ));

-- 2. Make subcontractor_id nullable (required for open_board state where no fitter is assigned)
ALTER TABLE fitting_jobs ALTER COLUMN subcontractor_id DROP NOT NULL;

-- 3. Earnings view — monthly aggregation per fitter
CREATE OR REPLACE VIEW fitter_earnings AS
  SELECT
    subcontractor_id,
    DATE_TRUNC('month', completed_at) AS month,
    COUNT(*) AS jobs_completed,
    COALESCE(SUM(fitting_fee), 0) AS total_earned
  FROM fitting_jobs
  WHERE status IN ('completed', 'signed_off', 'approved')
    AND fitting_fee IS NOT NULL
    AND completed_at IS NOT NULL
  GROUP BY subcontractor_id, DATE_TRUNC('month', completed_at);

-- 4. Index for earnings queries
CREATE INDEX IF NOT EXISTS idx_fitting_jobs_earnings
  ON fitting_jobs(subcontractor_id, completed_at)
  WHERE status IN ('completed', 'signed_off', 'approved') AND fitting_fee IS NOT NULL;

-- 5. en_route timestamp
ALTER TABLE fitting_jobs ADD COLUMN IF NOT EXISTS en_route_at timestamptz;
