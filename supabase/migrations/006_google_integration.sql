-- Google integration: OAuth config, email threads/messages, tracking events

-- Single-row table for the connected Google account
CREATE TABLE IF NOT EXISTS google_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  email_active boolean DEFAULT true,
  calendar_active boolean DEFAULT true,
  connected_by uuid REFERENCES profiles(id),
  connected_at timestamptz DEFAULT now(),
  needs_reauth boolean DEFAULT false,
  gmail_history_id text
);

ALTER TABLE google_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read google_config"
  ON google_config FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin write google_config"
  ON google_config FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Email threads linked to leads
CREATE TABLE IF NOT EXISTS email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_thread_id text UNIQUE NOT NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  subject text,
  last_message_at timestamptz,
  message_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read email_threads"
  ON email_threads FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write email_threads"
  ON email_threads FOR ALL
  USING (auth.role() = 'authenticated');

CREATE INDEX idx_email_threads_lead ON email_threads(lead_id);
CREATE INDEX idx_email_threads_gmail ON email_threads(gmail_thread_id);

-- Individual email messages
CREATE TABLE IF NOT EXISTS email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id text UNIQUE NOT NULL,
  thread_id uuid REFERENCES email_threads(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_address text NOT NULL,
  to_address text NOT NULL,
  subject text,
  body_text text,
  body_html text,
  snippet text,
  gmail_label_ids text[],
  received_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read email_messages"
  ON email_messages FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write email_messages"
  ON email_messages FOR ALL
  USING (auth.role() = 'authenticated');

CREATE INDEX idx_email_messages_thread ON email_messages(thread_id);
CREATE INDEX idx_email_messages_lead ON email_messages(lead_id);
CREATE INDEX idx_email_messages_gmail ON email_messages(gmail_message_id);

-- Email tracking events (opens, clicks)
CREATE TABLE IF NOT EXISTS email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_log_id uuid REFERENCES message_logs(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('open', 'click')),
  url text,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read email_events"
  ON email_events FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service write email_events"
  ON email_events FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_email_events_message ON email_events(message_log_id);
CREATE INDEX idx_email_events_lead ON email_events(lead_id);

-- Add google_event_id to bookings for calendar sync
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS google_event_id text;
