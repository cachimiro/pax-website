-- AI-related fields for leads and profiles

ALTER TABLE leads ADD COLUMN IF NOT EXISTS opted_out boolean DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_channel text CHECK (preferred_channel IN ('email', 'sms', 'whatsapp'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS snoozed_until timestamptz;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_preferences jsonb DEFAULT '{}';
