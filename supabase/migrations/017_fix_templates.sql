-- Fix visit_reminder_24h: add visit_date
UPDATE message_templates
SET body = E'Hi {{first_name}},\n\nJust a reminder — we''re visiting tomorrow, {{visit_date}} at {{visit_time}}.\n\nPlease make sure the wardrobe area is clear and accessible.\n\nSee you then!\n{{owner_name}}'
WHERE slug = 'visit_reminder_24h';

-- Fix visit_confirmed: add visit_time
UPDATE message_templates
SET body = E'Hi {{first_name}},\n\nYour site visit is confirmed:\n\n📅 {{visit_date}} at {{visit_time}}\n\nWe''ll come to your address to take measurements and review the space. Please make sure the area where the wardrobes will go is accessible.\n\nSee you then!\n{{owner_name}}'
WHERE slug = 'visit_confirmed';

-- Fix onboarding templates: add meet_link for video onboarding calls
UPDATE message_templates
SET body = E'Hi {{first_name}},\n\nYour onboarding session with {{owner_name}} is confirmed for {{date}} at {{time}}.\n\nJoin your video call here:\n{{meet_link}}\n\nDuring the session we''ll:\n• Take detailed measurements\n• Finalise your design choices\n• Confirm materials and finishes\n\nPlease make sure the wardrobe area is accessible.\n\nSee you then!\n{{owner_name}}'
WHERE slug = 'onboarding_confirmed';

UPDATE message_templates
SET body = E'Hi {{first_name}},\n\nJust a reminder about your onboarding session tomorrow, {{date}} at {{time}}.\n\nJoin your video call here:\n{{meet_link}}\n\nPlease make sure the wardrobe area is accessible and cleared of any items against the walls.\n\nIf you need to reschedule, just reply to this message.\n\nSee you then!\n{{owner_name}}'
WHERE slug = 'onboarding_reminder';

UPDATE message_templates
SET body = E'Hi {{first_name}},\n\nQuick reminder — your onboarding session with {{owner_name}} is in 2 hours at {{time}}.\n\nJoin here: {{meet_link}}\n\nPlease make sure the wardrobe area is accessible.\n\nSee you soon!\n{{owner_name}}'
WHERE slug = 'onboarding_reminder_2h';

-- Fix call2 templates: ensure meet_link and booking_link are present
UPDATE message_templates
SET body = E'Hi {{first_name}},\n\nYour design review call with {{owner_name}} is confirmed for {{date}} at {{time}}.\n\nJoin your video call here:\n{{meet_link}}\n\nWe''ll walk you through your 3D design and discuss any adjustments.\n\nSee you then!\n{{owner_name}}'
WHERE slug = 'call2_confirmed';

UPDATE message_templates
SET body = E'Hi {{first_name}},\n\nJust a reminder about your design review call tomorrow, {{date}} at {{time}}.\n\nJoin your video call here:\n{{meet_link}}\n\nSee you then!\n{{owner_name}}'
WHERE slug = 'call2_reminder';

UPDATE message_templates
SET body = E'Hi {{first_name}},\n\nQuick reminder — your design review call with {{owner_name}} is in 2 hours at {{time}}.\n\nJoin here: {{meet_link}}\n\nSpeak soon!\n{{owner_name}}'
WHERE slug = 'call2_reminder_2h';

-- Fix quote_sent_main: ensure design_link and quote_amount are included
UPDATE message_templates
SET body = E'Hi {{first_name}},\n\nYour design and quote are ready!\n\n💰 Total: {{quote_amount}}\n📐 View your 3D design: {{design_link}}\n\nAvailable fitting dates:\n{{fitting_dates}}\n\n→ Select your preferred date: {{cta_select_fitting}}\n\nThe deposit to secure your fitting slot is {{deposit_amount}}.\n\nIf you have any questions, just reply to this email.\n\nBest,\n{{owner_name}}\n\n---\n{{cta_not_interested}} · {{cta_need_more_time}}'
WHERE slug = 'quote_sent_main';

-- Fix deposit_request: ensure payment_link is included
UPDATE message_templates
SET body = E'Hi {{first_name}},\n\nTo secure your fitting date, please pay the deposit of £{{amount}}.\n\n→ Pay now: {{payment_link}}\n\nOnce paid, we''ll confirm your fitting slot and begin preparing your materials.\n\nIf you have any questions, just reply to this email.\n\nBest,\n{{owner_name}}\n\n---\n{{cta_not_interested}} · {{cta_need_more_time}}'
WHERE slug = 'deposit_request';

-- Fix meet1_thanks: add design timeline expectation
UPDATE message_templates
SET body = E'Hi {{first_name}},\n\nThank you for taking the time to chat with us today. It was great learning about your {{project_type}} project.\n\nWe''re now working on your 3D design and will have it ready for you within 2-3 working days, along with a detailed quote.\n\nIf you have any questions in the meantime, just reply to this email.\n\nBest,\n{{owner_name}}'
WHERE slug = 'meet1_thanks';
