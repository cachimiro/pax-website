-- Soft-delete for leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_leads_deleted ON leads(deleted_at) WHERE deleted_at IS NOT NULL;
