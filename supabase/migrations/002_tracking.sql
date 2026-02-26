-- Tracking & attribution fields on leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS traffic_source text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS landing_page text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS device_type text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_visit_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS visitor_id text;

-- Site sessions (lightweight pageview tracking)
CREATE TABLE IF NOT EXISTS site_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  page_path text NOT NULL,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text,
  created_at timestamptz DEFAULT now()
);

-- No RLS on site_sessions — written by public API with no auth
-- Read access restricted to CRM users via server-side queries only

CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON site_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON site_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_page ON site_sessions(page_path);
CREATE INDEX IF NOT EXISTS idx_sessions_source ON site_sessions(utm_source);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(traffic_source);
CREATE INDEX IF NOT EXISTS idx_leads_visitor ON leads(visitor_id);
CREATE INDEX IF NOT EXISTS idx_leads_landing ON leads(landing_page);
