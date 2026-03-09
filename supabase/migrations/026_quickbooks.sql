-- ─── Migration 026: QuickBooks integration ───────────────────────────────────
--
-- 1. quickbooks_config  — stores OAuth tokens for the connected QBO company
-- 2. invoices           — add qbo_invoice_id, qbo_invoice_number, line_items,
--                         remove stripe dependency (keep stripe_session_id nullable)
-- 3. quotes             — add accepted_at, accepted_ip for customer agreement audit trail
-- 4. quote_tokens       — secure tokens for the public /quote/[token] agreement page

-- ─── 1. QuickBooks config ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quickbooks_config (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id          text NOT NULL,           -- QBO company ID
  access_token      text NOT NULL,
  refresh_token     text NOT NULL,
  token_expires_at  timestamptz NOT NULL,
  company_name      text,                    -- cached from QBO CompanyInfo
  environment       text NOT NULL DEFAULT 'production', -- 'sandbox' | 'production'
  connected_at      timestamptz NOT NULL DEFAULT now(),
  connected_by      uuid REFERENCES profiles(id),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Only one row ever (single company connection)
CREATE UNIQUE INDEX IF NOT EXISTS quickbooks_config_singleton
  ON quickbooks_config ((true));

ALTER TABLE quickbooks_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage quickbooks_config"
  ON quickbooks_config FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  );

-- ─── 2. Invoices — add QBO columns and line_items ────────────────────────────

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS qbo_invoice_id     text,
  ADD COLUMN IF NOT EXISTS qbo_invoice_number text,
  ADD COLUMN IF NOT EXISTS qbo_pay_url        text,       -- "Pay Now" link from QBO
  ADD COLUMN IF NOT EXISTS line_items         jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS memo               text,       -- project summary shown on invoice
  ADD COLUMN IF NOT EXISTS due_date           date,
  ADD COLUMN IF NOT EXISTS sent_at            timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at            timestamptz;

COMMENT ON COLUMN invoices.qbo_invoice_id     IS 'QuickBooks Online invoice ID (DocNumber internal)';
COMMENT ON COLUMN invoices.qbo_invoice_number IS 'Human-readable QBO invoice number shown to customer';
COMMENT ON COLUMN invoices.qbo_pay_url        IS 'QuickBooks Payments "Pay Now" URL sent to customer';
COMMENT ON COLUMN invoices.line_items         IS 'Array of {description, quantity, unit_price, amount}';
COMMENT ON COLUMN invoices.memo               IS 'Project summary shown on the QBO invoice';

-- ─── 3. Quotes — customer agreement audit trail ───────────────────────────────

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS accepted_at   timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_ip   text,
  ADD COLUMN IF NOT EXISTS accepted_name text;  -- name they typed to confirm

COMMENT ON COLUMN quotes.accepted_at   IS 'When the customer agreed to the quote';
COMMENT ON COLUMN quotes.accepted_ip   IS 'IP address at time of agreement (audit trail)';
COMMENT ON COLUMN quotes.accepted_name IS 'Name the customer typed to confirm agreement';

-- ─── 4. Quote tokens — for public /quote/[token] page ────────────────────────

CREATE TABLE IF NOT EXISTS quote_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id     uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  token        text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quote_tokens_token_idx ON quote_tokens(token);
CREATE INDEX IF NOT EXISTS quote_tokens_quote_id_idx ON quote_tokens(quote_id);

-- Public read (token-gated in application layer, no auth required)
ALTER TABLE quote_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read quote_tokens by token"
  ON quote_tokens FOR SELECT
  USING (true);

CREATE POLICY "Admins manage quote_tokens"
  ON quote_tokens FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations'))
  );

-- Allow public insert for the agree action (application validates token first)
CREATE POLICY "Public insert quote_tokens used_at"
  ON quote_tokens FOR UPDATE
  USING (true)
  WITH CHECK (true);
