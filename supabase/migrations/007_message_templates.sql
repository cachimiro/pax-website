-- Editable message templates (replaces hardcoded DEFAULT_TEMPLATES)
CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  channels text[] NOT NULL DEFAULT '{email}',
  active boolean NOT NULL DEFAULT true,
  -- Scheduling
  delay_rule text NOT NULL DEFAULT 'immediate',  -- immediate | minutes_before_booking | minutes_after_stage | minutes_after_enquiry
  delay_minutes int NOT NULL DEFAULT 0,
  -- Trigger
  trigger_stage text,  -- which stage triggers this template (null = manual only)
  trigger_event text,  -- optional: 'stage_enter', 'booking_created', etc.
  -- Metadata
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read message_templates"
  ON message_templates FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin manage message_templates"
  ON message_templates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Add scheduled_for to message_logs for timed sends
ALTER TABLE message_logs ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
CREATE INDEX IF NOT EXISTS idx_message_logs_scheduled ON message_logs(scheduled_for) WHERE status = 'queued';

-- Add stripe_session_id to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_session_id text;

-- Seed existing templates
INSERT INTO message_templates (slug, name, subject, body, channels, trigger_stage, delay_rule, delay_minutes, sort_order) VALUES
(
  'confirmation_enquiry',
  'Enquiry Confirmation',
  'Thanks for your enquiry, {{first_name}}',
  E'Hi {{first_name}},\n\nThanks for getting in touch about your {{project_type}} project. We''ve received your details and one of our team will be in contact shortly to arrange your free consultation.\n\nIn the meantime, feel free to browse our recent projects at https://paxbespoke.uk/projects\n\nBest regards,\nThe PaxBespoke Team',
  '{email,whatsapp}',
  'new_enquiry',
  'immediate',
  0,
  1
),
(
  'call1_reminder',
  'Call 1 Reminder (24h)',
  'Reminder: Your consultation is coming up',
  E'Hi {{first_name}},\n\nJust a reminder about your consultation with {{owner_name}} on {{date}} at {{time}}.\n\nPlease have a few photos of your space ready if possible — it helps us give you the best advice.\n\nSee you soon!\nPaxBespoke',
  '{email,sms,whatsapp}',
  'call1_scheduled',
  'minutes_before_booking',
  1440,
  2
),
(
  'call1_reminder_2h',
  'Call 1 Reminder (2h)',
  'Your consultation is in 2 hours',
  E'Hi {{first_name}},\n\nQuick reminder — your consultation with {{owner_name}} is in 2 hours at {{time}}.\n\nSpeak soon!\nPaxBespoke',
  '{sms,whatsapp}',
  'call1_scheduled',
  'minutes_before_booking',
  120,
  3
),
(
  'call2_invite',
  'Call 2 Invite',
  'Your design follow-up is ready, {{first_name}}',
  E'Hi {{first_name}},\n\nGreat news — we''ve put together some options for your {{project_type}} project and we''d love to walk you through them.\n\nBook your follow-up call here: {{booking_link}}\n\nLooking forward to it,\n{{owner_name}}',
  '{email,whatsapp}',
  'qualified',
  'immediate',
  0,
  4
),
(
  'call2_reminder',
  'Call 2 Reminder (24h)',
  'Reminder: Your design call is tomorrow',
  E'Hi {{first_name}},\n\nJust a reminder about your design call with {{owner_name}} on {{date}} at {{time}}.\n\nWe''ll walk through the options we''ve prepared for your {{project_type}} project.\n\nSee you then!\nPaxBespoke',
  '{email,sms,whatsapp}',
  'call2_scheduled',
  'minutes_before_booking',
  1440,
  5
),
(
  'deposit_request',
  'Deposit Request',
  'Secure your project — deposit details',
  E'Hi {{first_name}},\n\nThanks for confirming your project. To secure your slot, please pay the deposit of £{{amount}} using the link below:\n\n{{payment_link}}\n\nOnce received, we''ll schedule your onboarding visit.\n\nBest,\n{{owner_name}}',
  '{email,whatsapp}',
  'awaiting_deposit',
  'immediate',
  0,
  6
),
(
  'onboarding_invite',
  'Onboarding Invite',
  'Time to measure up — book your onboarding visit',
  E'Hi {{first_name}},\n\nYour deposit is confirmed — thank you! The next step is your onboarding visit where we''ll take detailed measurements and finalise everything.\n\nBook your onboarding: {{booking_link}}\n\n{{owner_name}}',
  '{email,whatsapp}',
  'deposit_paid',
  'immediate',
  0,
  7
),
(
  'onboarding_reminder',
  'Onboarding Reminder (24h)',
  'Reminder: Your onboarding visit is tomorrow',
  E'Hi {{first_name}},\n\nJust a reminder about your onboarding visit on {{date}} at {{time}}.\n\nPlease make sure the wardrobe area is accessible.\n\nSee you then!\n{{owner_name}}',
  '{email,sms,whatsapp}',
  'onboarding_scheduled',
  'minutes_before_booking',
  1440,
  8
),
(
  'review_request',
  'Review Request',
  'How did we do, {{first_name}}?',
  E'Hi {{first_name}},\n\nYour {{project_type}} project is complete! We hope you love the result.\n\nWe''d really appreciate a quick review — it helps other homeowners find us:\nhttps://g.page/paxbespoke/review\n\nThanks for choosing PaxBespoke!',
  '{email,whatsapp}',
  'complete',
  'minutes_after_stage',
  4320,
  9
)
ON CONFLICT (slug) DO NOTHING;
