-- Email templates for form abandonment follow-up sequences.
-- These are triggered by the /api/cron/abandonments job, not by stage transitions.
-- trigger_stage = 'form_abandoned' is a virtual stage used only for these templates.

INSERT INTO message_templates (slug, name, subject, body, channels, trigger_stage, delay_rule, delay_minutes, sort_order) VALUES
(
  'form_abandoned_1h',
  'Form Abandoned (1 hour)',
  'Still thinking about your project, {{first_name}}?',
  E'Hi {{first_name}},\n\nWe noticed you started looking into a consultation with PaxBespoke but didn''t finish booking.\n\nNo worries — your progress has been saved. You can pick up right where you left off:\n\n{{resume_link}}\n\nIf you have any questions about the process, just reply to this email and we''ll be happy to help.\n\nBest,\nThe PaxBespoke Team',
  '{email}',
  'form_abandoned',
  'minutes_after_enquiry',
  60,
  20
),
(
  'form_abandoned_24h',
  'Form Abandoned (24 hours)',
  'Your free consultation is still available, {{first_name}}',
  E'Hi {{first_name}},\n\nJust a quick note — your free design consultation with PaxBespoke is still available.\n\nWe''ve helped over 200 homeowners transform their spaces with bespoke fitted wardrobes. Here''s what you can expect from your consultation:\n\n• A 30-minute video call with a design specialist\n• Personalised recommendations for your space\n• A clear quote with no hidden costs\n• Zero obligation — it''s completely free\n\nReady to book? Pick up where you left off:\n{{resume_link}}\n\nSpeak soon,\nThe PaxBespoke Team',
  '{email}',
  'form_abandoned',
  'minutes_after_enquiry',
  1440,
  21
),
(
  'form_abandoned_72h',
  'Form Abandoned (3 days)',
  'Quick question about your wardrobe project',
  E'Hi {{first_name}},\n\nI wanted to reach out personally — I noticed you were looking at a consultation for your home and I wondered if you had any questions I could help with.\n\nSometimes it helps to have a quick chat before committing to a full consultation. If you''d prefer, you can:\n\n• Reply to this email with any questions\n• Call us directly on 020 XXXX XXXX\n• Or book your free consultation here: {{resume_link}}\n\nEither way, no pressure at all. We''re here when you''re ready.\n\nBest regards,\n{{owner_name}}',
  '{email}',
  'form_abandoned',
  'minutes_after_enquiry',
  4320,
  22
),
(
  'form_abandoned_7d',
  'Form Abandoned (7 days)',
  'We saved your spot, {{first_name}}',
  E'Hi {{first_name}},\n\nIt''s been a week since you started exploring a bespoke wardrobe consultation with us, and we wanted to let you know your details are still saved.\n\nAs a thank you for your interest, we''d like to offer you priority scheduling — book this week and we''ll fit you in at a time that works best for you.\n\n{{resume_link}}\n\nIf you''ve decided to go a different direction, no hard feelings. But if you''re still thinking about it, we''d love to help.\n\nWarm regards,\nThe PaxBespoke Team\n\nP.S. If you no longer wish to hear from us, simply reply with "unsubscribe" and we''ll remove you from our list immediately.',
  '{email}',
  'form_abandoned',
  'minutes_after_enquiry',
  10080,
  23
)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  channels = EXCLUDED.channels,
  trigger_stage = EXCLUDED.trigger_stage,
  delay_rule = EXCLUDED.delay_rule,
  delay_minutes = EXCLUDED.delay_minutes,
  sort_order = EXCLUDED.sort_order;
