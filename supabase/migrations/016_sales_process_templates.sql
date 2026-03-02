-- Email templates for the sales process stages.
-- Each template includes CTA placeholders that are resolved at send time.
-- {{cta_not_interested}} and {{cta_need_more_time}} are mandatory in all follow-ups.

INSERT INTO message_templates (slug, name, subject, body, channels, trigger_stage, delay_rule, delay_minutes, sort_order) VALUES

-- Meet 1 completed
('meet1_thanks', 'Meet 1 Thank You', 'Thanks for the call, {{first_name}}',
E'Hi {{first_name}},\n\nThank you for taking the time to chat with us today. It was great learning about your project.\n\nWe''re now working on your 3D design and will have it ready for you shortly, along with a detailed quote.\n\nIf you have any questions in the meantime, just reply to this email.\n\nBest,\n{{owner_name}}',
'{email}', 'meet1_completed', 'immediate', 0, 30),

-- Quote sent
('quote_sent_main', 'Quote Sent', 'Your PaxBespoke quote is ready, {{first_name}}',
E'Hi {{first_name}},\n\nYour design and quote are ready:\n\n• Design: {{design_link}}\n• Quote: {{quote_amount}}\n• Deposit (to secure your fitting): {{deposit_amount}}\n\nAvailable fitting dates: {{fitting_dates}}\n\nReady to go?\n→ I want to proceed: {{cta_proceed}}\n\nNeed to discuss changes?\n→ Book a follow-up call: {{cta_book_meet2}}\n\nBest,\n{{owner_name}}\n\n---\nChanged your mind? No worries.\n{{cta_not_interested}} · {{cta_need_more_time}}',
'{email}', 'quote_sent', 'immediate', 0, 31),

('quote_followup_48h', 'Quote Follow-up (48h)', 'Have you had a chance to review your quote, {{first_name}}?',
E'Hi {{first_name}},\n\nJust checking in — have you had a chance to look at your design and quote?\n\nQuick recap:\n• Quote: {{quote_amount}}\n• Deposit: {{deposit_amount}}\n\nIf you''re happy to proceed, you can lock in your fitting date here:\n→ {{cta_proceed}}\n\nHave questions? Book a quick call:\n→ {{cta_book_meet2}}\n\nBest,\n{{owner_name}}\n\n---\n{{cta_not_interested}} · {{cta_need_more_time}}',
'{email}', 'quote_sent', 'minutes_after_stage', 2880, 32),

('quote_followup_5d', 'Quote Follow-up (5 days)', 'Your fitting dates are filling up, {{first_name}}',
E'Hi {{first_name}},\n\nWe wanted to let you know that fitting availability is getting busy over the coming weeks.\n\nYour quote ({{quote_amount}}) is still valid, and we''d love to get your project booked in.\n\n→ Ready to proceed: {{cta_proceed}}\n→ Need to discuss: {{cta_book_meet2}}\n\nBest,\n{{owner_name}}\n\n---\n{{cta_not_interested}} · {{cta_need_more_time}}',
'{email}', 'quote_sent', 'minutes_after_stage', 7200, 33),

-- Visit required
('visit_invite', 'Visit Invitation', 'Let''s visit your space, {{first_name}}',
E'Hi {{first_name}},\n\nTo make sure we get the design exactly right for your space, we''d like to arrange a site visit.\n\nThis is a quick visit where we''ll take precise measurements and check any tricky areas (angles, bulkheads, etc.).\n\n→ Book your visit: {{cta_book_visit}}\n\nBest,\n{{owner_name}}\n\n---\n{{cta_not_interested}} · {{cta_need_more_time}}',
'{email}', 'visit_required', 'immediate', 0, 34),

('visit_invite_followup', 'Visit Invite Follow-up', 'Still want us to visit, {{first_name}}?',
E'Hi {{first_name}},\n\nJust a quick follow-up — we''d love to come and see your space so we can finalise your design.\n\nIt only takes about 30 minutes and there''s no obligation.\n\n→ Book your visit: {{cta_book_visit}}\n\nBest,\n{{owner_name}}\n\n---\n{{cta_not_interested}} · {{cta_need_more_time}}',
'{email}', 'visit_required', 'minutes_after_stage', 4320, 35),

-- Visit scheduled
('visit_confirmed', 'Visit Confirmed', 'Your visit is confirmed for {{visit_date}}, {{first_name}}',
E'Hi {{first_name}},\n\nYour site visit is confirmed:\n\n📅 {{visit_date}} at {{visit_time}}\n\nWe''ll come to your address to take measurements and review the space. Please make sure the area where the wardrobes will go is accessible.\n\nSee you then!\n{{owner_name}}',
'{email}', 'visit_scheduled', 'immediate', 0, 36),

('visit_reminder_24h', 'Visit Reminder (24h)', 'See you tomorrow, {{first_name}}',
E'Hi {{first_name}},\n\nJust a reminder — we''re visiting tomorrow at {{visit_time}}.\n\nPlease make sure the wardrobe area is clear and accessible.\n\nSee you then!\n{{owner_name}}',
'{email,sms}', 'visit_scheduled', 'minutes_before_booking', 1440, 37),

-- Visit completed
('visit_thanks', 'Visit Thank You', 'Thanks for having us, {{first_name}}',
E'Hi {{first_name}},\n\nThanks for having us over today. We''ve got all the measurements we need.\n\nWe''re now updating your design and quote based on what we saw. You''ll receive the revised version shortly.\n\nBest,\n{{owner_name}}',
'{email}', 'visit_completed', 'immediate', 0, 38),

-- Fitting proposed
('fitting_proposed_main', 'Fitting Dates Available', 'Choose your fitting date, {{first_name}}',
E'Hi {{first_name}},\n\nWe have the following fitting dates available for your project:\n\n{{fitting_dates}}\n\n→ Select your preferred date: {{cta_select_fitting}}\n\nOnce you''ve chosen a date, we''ll send you the deposit invoice ({{deposit_amount}}) to secure it.\n\nBest,\n{{owner_name}}\n\n---\n{{cta_not_interested}} · {{cta_need_more_time}}',
'{email}', 'fitting_proposed', 'immediate', 0, 39),

('fitting_followup_48h', 'Fitting Follow-up (48h)', 'Fitting dates are going fast, {{first_name}}',
E'Hi {{first_name}},\n\nJust a heads up — the fitting dates we sent are filling up. If you''d like to secure one, please select your preferred date:\n\n→ {{cta_select_fitting}}\n\nBest,\n{{owner_name}}\n\n---\n{{cta_not_interested}} · {{cta_need_more_time}}',
'{email}', 'fitting_proposed', 'minutes_after_stage', 2880, 40),

-- Fitting confirmed
('fitting_confirmed_email', 'Fitting Confirmed', 'Your fitting is confirmed for {{confirmed_fitting_date}}',
E'Hi {{first_name}},\n\nYour fitting is locked in:\n\n📅 {{confirmed_fitting_date}}\n\nWe''re now preparing everything for your installation. We''ll send you a reminder a couple of days before.\n\nIf you need to make any changes, please reply to this email.\n\nBest,\n{{owner_name}}',
'{email}', 'fitting_confirmed', 'immediate', 0, 41),

('fitting_reminder_48h', 'Fitting Reminder (48h)', 'Your fitting is in 2 days, {{first_name}}',
E'Hi {{first_name}},\n\nJust a reminder — your wardrobe fitting is in 2 days ({{confirmed_fitting_date}}).\n\nPlease make sure:\n• The installation area is clear\n• You (or someone) will be home to let us in\n\nSee you soon!\n{{owner_name}}',
'{email,sms}', 'fitting_confirmed', 'minutes_before_booking', 2880, 42),

-- Nurture (on hold)
('nurture_1', 'Nurture Email 1', 'A recent project you might like, {{first_name}}',
E'Hi {{first_name}},\n\nWe recently completed a beautiful wardrobe project and thought you might like to see it.\n\nWhen you''re ready to pick up where we left off, your design and quote are still saved:\n→ {{cta_proceed}}\n\nNo rush at all.\n\nBest,\n{{owner_name}}\n\n---\n{{cta_not_interested}}',
'{email}', 'on_hold', 'minutes_after_stage', 20160, 50),

('nurture_2', 'Nurture Email 2', 'Still thinking about your wardrobe, {{first_name}}?',
E'Hi {{first_name}},\n\nJust a gentle check-in. Your bespoke wardrobe design is still ready whenever you are.\n\nIf anything has changed or you have new questions, just reply to this email.\n\n→ Ready to proceed: {{cta_proceed}}\n\nBest,\n{{owner_name}}\n\n---\n{{cta_not_interested}}',
'{email}', 'on_hold', 'minutes_after_stage', 40320, 51),

('nurture_3', 'Nurture Email 3 (Final)', 'Last check-in, {{first_name}}',
E'Hi {{first_name}},\n\nThis is our last check-in. We don''t want to bother you, so if we don''t hear back, we''ll close your file.\n\nIf you''d still like to go ahead with your wardrobe project, just reply or click below:\n→ {{cta_proceed}}\n\nEither way, it''s been a pleasure.\n\nBest,\n{{owner_name}}\n\n---\n{{cta_not_interested}}',
'{email}', 'on_hold', 'minutes_after_stage', 60480, 52)

ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  channels = EXCLUDED.channels,
  trigger_stage = EXCLUDED.trigger_stage,
  delay_rule = EXCLUDED.delay_rule,
  delay_minutes = EXCLUDED.delay_minutes,
  sort_order = EXCLUDED.sort_order;
