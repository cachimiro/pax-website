-- B1: Add call1_confirmed template (immediate confirmation when customer books)
-- and update existing templates to include meet_link

-- New: immediate confirmation sent when booking is created
INSERT INTO message_templates (slug, name, subject, body, channels, trigger_stage, delay_rule, delay_minutes, sort_order) VALUES
(
  'call1_confirmed',
  'Call 1 Booking Confirmation',
  'Your consultation is confirmed, {{first_name}}',
  E'Hi {{first_name}},\n\nYour free consultation with {{owner_name}} is confirmed for {{date}} at {{time}}.\n\nJoin your video call here:\n{{meet_link}}\n\nWhat to have ready (optional):\n• A few photos of the space\n• Any inspiration images you like\n• Rough dimensions if you have them\n\nNeed to reschedule? Just reply to this message.\n\nSee you soon!\nPaxBespoke',
  '{email,sms,whatsapp}',
  'call1_scheduled',
  'immediate',
  0,
  1
)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  channels = EXCLUDED.channels,
  trigger_stage = EXCLUDED.trigger_stage,
  delay_rule = EXCLUDED.delay_rule,
  delay_minutes = EXCLUDED.delay_minutes,
  sort_order = EXCLUDED.sort_order;

-- Move confirmation_enquiry to manual-only (booking form skips new_enquiry stage)
UPDATE message_templates
SET trigger_stage = NULL, active = false
WHERE slug = 'confirmation_enquiry';

-- Update call1_reminder to include meet link
UPDATE message_templates
SET body = E'Hi {{first_name}},\n\nJust a reminder about your consultation with {{owner_name}} tomorrow, {{date}} at {{time}}.\n\nJoin your video call here:\n{{meet_link}}\n\nPlease have a few photos of your space ready if possible — it helps us give you the best advice.\n\nSee you soon!\nPaxBespoke',
    sort_order = 2
WHERE slug = 'call1_reminder';

-- Update call1_reminder_2h to include meet link
UPDATE message_templates
SET body = E'Hi {{first_name}},\n\nQuick reminder — your consultation with {{owner_name}} is in 2 hours at {{time}}.\n\nJoin here: {{meet_link}}\n\nSpeak soon!\nPaxBespoke',
    sort_order = 3
WHERE slug = 'call1_reminder_2h';

-- Update call2_reminder to include meet link
UPDATE message_templates
SET body = E'Hi {{first_name}},\n\nJust a reminder about your design call with {{owner_name}} tomorrow, {{date}} at {{time}}.\n\nJoin your video call here:\n{{meet_link}}\n\nWe''ll walk through the options we''ve prepared for your {{project_type}} project.\n\nSee you then!\nPaxBespoke',
    sort_order = 5
WHERE slug = 'call2_reminder';

-- Add a call2_confirmed template (immediate confirmation when call2 is booked)
INSERT INTO message_templates (slug, name, subject, body, channels, trigger_stage, delay_rule, delay_minutes, sort_order) VALUES
(
  'call2_confirmed',
  'Call 2 Booking Confirmation',
  'Your design call is confirmed, {{first_name}}',
  E'Hi {{first_name}},\n\nYour design call with {{owner_name}} is confirmed for {{date}} at {{time}}.\n\nJoin your video call here:\n{{meet_link}}\n\nWe''ve prepared some options for your {{project_type}} project and can''t wait to show you.\n\nSee you then!\n{{owner_name}}',
  '{email,sms,whatsapp}',
  'call2_scheduled',
  'immediate',
  0,
  4
)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  channels = EXCLUDED.channels,
  trigger_stage = EXCLUDED.trigger_stage,
  delay_rule = EXCLUDED.delay_rule,
  delay_minutes = EXCLUDED.delay_minutes,
  sort_order = EXCLUDED.sort_order;

-- Add call2_reminder_2h
INSERT INTO message_templates (slug, name, subject, body, channels, trigger_stage, delay_rule, delay_minutes, sort_order) VALUES
(
  'call2_reminder_2h',
  'Call 2 Reminder (2h)',
  'Your design call is in 2 hours',
  E'Hi {{first_name}},\n\nQuick reminder — your design call with {{owner_name}} is in 2 hours at {{time}}.\n\nJoin here: {{meet_link}}\n\nSee you soon!\nPaxBespoke',
  '{sms,whatsapp}',
  'call2_scheduled',
  'minutes_before_booking',
  120,
  6
)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  channels = EXCLUDED.channels,
  trigger_stage = EXCLUDED.trigger_stage,
  delay_rule = EXCLUDED.delay_rule,
  delay_minutes = EXCLUDED.delay_minutes,
  sort_order = EXCLUDED.sort_order;

-- Onboarding reminder: no meet link (in-person), but add address note
UPDATE message_templates
SET body = E'Hi {{first_name}},\n\nJust a reminder about your onboarding visit tomorrow, {{date}} at {{time}}.\n\nPlease make sure the wardrobe area is accessible and cleared of any items against the walls.\n\nIf you need to reschedule, just reply to this message.\n\nSee you then!\n{{owner_name}}'
WHERE slug = 'onboarding_reminder';

-- Add onboarding_confirmed template
INSERT INTO message_templates (slug, name, subject, body, channels, trigger_stage, delay_rule, delay_minutes, sort_order) VALUES
(
  'onboarding_confirmed',
  'Onboarding Booking Confirmation',
  'Your onboarding visit is confirmed, {{first_name}}',
  E'Hi {{first_name}},\n\nYour onboarding visit with {{owner_name}} is confirmed for {{date}} at {{time}}.\n\nDuring the visit we''ll:\n• Take detailed measurements\n• Finalise your design choices\n• Confirm materials and finishes\n\nPlease make sure the wardrobe area is accessible.\n\nSee you then!\n{{owner_name}}',
  '{email,sms,whatsapp}',
  'onboarding_scheduled',
  'immediate',
  0,
  7
)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  channels = EXCLUDED.channels,
  trigger_stage = EXCLUDED.trigger_stage,
  delay_rule = EXCLUDED.delay_rule,
  delay_minutes = EXCLUDED.delay_minutes,
  sort_order = EXCLUDED.sort_order;

-- Add onboarding_reminder_2h
INSERT INTO message_templates (slug, name, subject, body, channels, trigger_stage, delay_rule, delay_minutes, sort_order) VALUES
(
  'onboarding_reminder_2h',
  'Onboarding Reminder (2h)',
  'Your onboarding visit is in 2 hours',
  E'Hi {{first_name}},\n\nQuick reminder — your onboarding visit with {{owner_name}} is in 2 hours at {{time}}.\n\nPlease make sure the wardrobe area is accessible.\n\nSee you soon!\n{{owner_name}}',
  '{sms,whatsapp}',
  'onboarding_scheduled',
  'minutes_before_booking',
  120,
  9
)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  channels = EXCLUDED.channels,
  trigger_stage = EXCLUDED.trigger_stage,
  delay_rule = EXCLUDED.delay_rule,
  delay_minutes = EXCLUDED.delay_minutes,
  sort_order = EXCLUDED.sort_order;
