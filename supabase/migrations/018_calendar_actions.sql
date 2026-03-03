-- Add reschedule/no-show tracking to opportunities
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS reschedule_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_show_count integer NOT NULL DEFAULT 0;

-- New email templates for calendar actions
INSERT INTO message_templates (slug, name, subject, body, trigger_stage, channels, delay_rule, delay_minutes, active) VALUES

('booking_rescheduled', 'Booking Rescheduled', 'Your appointment has been moved, {{first_name}}',
E'Hi {{first_name}},\n\nYour appointment has been rescheduled to:\n\n📅 {{date}} at {{time}}\n\nJoin your video call here:\n{{meet_link}}\n\nIf this doesn''t work for you, just reply and we''ll find another time.\n\nBest,\n{{owner_name}}',
'call1_scheduled', ARRAY['email','sms','whatsapp'], 'immediate', 0, true),

('booking_cancelled', 'Booking Cancelled', 'Your appointment has been cancelled',
E'Hi {{first_name}},\n\nYour appointment with {{owner_name}} has been cancelled.\n\nIf you''d like to rebook, just reply to this email and we''ll find a time that works.\n\nBest,\n{{owner_name}}',
'call1_scheduled', ARRAY['email'], 'immediate', 0, true),

('no_show_followup', 'No-Show Follow-up', 'We missed you today, {{first_name}}',
E'Hi {{first_name}},\n\nWe had you down for an appointment today but it looks like we missed each other.\n\nNo worries — these things happen! You can rebook at a time that suits you:\n→ {{booking_link}}\n\nIf you have any questions, just reply to this email.\n\nBest,\n{{owner_name}}',
'call1_scheduled', ARRAY['email','sms','whatsapp'], 'immediate', 0, true),

('visit_rescheduled', 'Visit Rescheduled', 'Your site visit has been moved, {{first_name}}',
E'Hi {{first_name}},\n\nYour site visit has been rescheduled to:\n\n📅 {{visit_date}} at {{visit_time}}\n\nPlease make sure the wardrobe area is accessible.\n\nIf this doesn''t work, just reply and we''ll find another time.\n\nBest,\n{{owner_name}}',
'visit_scheduled', ARRAY['email','sms','whatsapp'], 'immediate', 0, true),

('fitting_rescheduled', 'Fitting Rescheduled', 'Your fitting date has been moved, {{first_name}}',
E'Hi {{first_name}},\n\nYour fitting has been rescheduled to:\n\n📅 {{fitting_date}}\n\nWe''ll confirm the exact time closer to the date.\n\nIf this doesn''t work, just reply and we''ll find another time.\n\nBest,\n{{owner_name}}',
'fitting_confirmed', ARRAY['email','sms','whatsapp'], 'immediate', 0, true)

ON CONFLICT (slug) DO NOTHING;
