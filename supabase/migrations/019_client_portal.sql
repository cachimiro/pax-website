-- Client self-service portal: verification codes + audit log

-- Verification codes for email+phone lookup flow
CREATE TABLE IF NOT EXISTS portal_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  email text NOT NULL,
  phone text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  session_token text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_verifications_email ON portal_verifications(email);
CREATE INDEX idx_portal_verifications_session ON portal_verifications(session_token) WHERE session_token IS NOT NULL;
CREATE INDEX idx_portal_verifications_expires ON portal_verifications(expires_at);

-- Audit log for all portal actions
CREATE TABLE IF NOT EXISTS portal_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  booking_id uuid,
  action text NOT NULL,
  ip_address text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_audit_lead ON portal_audit_log(lead_id);
CREATE INDEX idx_portal_audit_action ON portal_audit_log(action);

-- New email templates for the portal
INSERT INTO message_templates (slug, name, subject, body, channels, active) VALUES
  ('portal_verification_code', 'Portal Verification Code', 'Your PaxBespoke verification code', 'Hi {{first_name}},

Your verification code is: {{code}}

This code expires in 10 minutes. If you did not request this, please ignore this message.

PaxBespoke', ARRAY['email'], true),

  ('portal_reschedule_confirmed', 'Portal Reschedule Confirmed', 'Your booking has been rescheduled', 'Hi {{first_name}},

Your booking has been rescheduled to {{date}} at {{time}}.

Join your video call here:
{{meet_link}}

Need to make another change? Manage your booking:
{{cta_manage_booking}}

See you then!
PaxBespoke', ARRAY['email', 'sms', 'whatsapp'], true),

  ('portal_cancel_confirmed', 'Portal Cancellation Confirmed', 'Your booking has been cancelled', 'Hi {{first_name}},

Your booking on {{date}} at {{time}} has been cancelled as requested.

If you change your mind, you can book a new consultation anytime at:
https://paxbespoke.uk/book

Best wishes,
PaxBespoke', ARRAY['email'], true),

  ('portal_not_my_booking_ack', 'Not My Booking Acknowledgement', 'We''re looking into your report', 'Hi {{first_name}},

Thank you for letting us know. We''ve flagged this booking for review and our team will investigate.

If you have any questions, reply to this email or call us.

PaxBespoke', ARRAY['email'], true)
ON CONFLICT (slug) DO NOTHING;
