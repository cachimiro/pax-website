-- Migration 022: Add fitting pipeline stages to the opportunity_stage enum
-- and insert notification templates.
-- Run AFTER migration 021.

-- Add new enum values. IF NOT EXISTS prevents errors on re-run.
-- Position them after fitting_confirmed in logical order.
ALTER TYPE opportunity_stage ADD VALUE IF NOT EXISTS 'fitter_assigned' AFTER 'fitting_confirmed';
ALTER TYPE opportunity_stage ADD VALUE IF NOT EXISTS 'fitting_in_progress' AFTER 'fitter_assigned';
ALTER TYPE opportunity_stage ADD VALUE IF NOT EXISTS 'fitting_complete' AFTER 'fitting_in_progress';
ALTER TYPE opportunity_stage ADD VALUE IF NOT EXISTS 'sign_off_pending' AFTER 'fitting_complete';

-- Migrate existing opportunities from old stages to new stages.
-- The old enum values still exist (can't remove from enums) but won't be used by the app.
UPDATE opportunities SET stage = 'fitter_assigned' WHERE stage = 'onboarding_scheduled';
UPDATE opportunities SET stage = 'fitting_in_progress' WHERE stage = 'onboarding_complete';
UPDATE opportunities SET stage = 'fitting_complete' WHERE stage = 'production';
UPDATE opportunities SET stage = 'sign_off_pending' WHERE stage = 'installation';

-- Also update stage_log references
UPDATE stage_log SET to_stage = 'fitter_assigned' WHERE to_stage = 'onboarding_scheduled';
UPDATE stage_log SET to_stage = 'fitting_in_progress' WHERE to_stage = 'onboarding_complete';
UPDATE stage_log SET to_stage = 'fitting_complete' WHERE to_stage = 'production';
UPDATE stage_log SET to_stage = 'sign_off_pending' WHERE to_stage = 'installation';
UPDATE stage_log SET from_stage = 'fitter_assigned' WHERE from_stage = 'onboarding_scheduled';
UPDATE stage_log SET from_stage = 'fitting_in_progress' WHERE from_stage = 'onboarding_complete';
UPDATE stage_log SET from_stage = 'fitting_complete' WHERE from_stage = 'production';
UPDATE stage_log SET from_stage = 'sign_off_pending' WHERE from_stage = 'installation';

-- Insert fitting notification templates
INSERT INTO message_templates (slug, name, subject, body, channels, trigger_stage, delay_rule, delay_minutes, sort_order)
VALUES
  ('fitter_assigned_confirmation', 'Fitter Assigned — Customer Confirmation',
   'Your Fitter is Confirmed — {{confirmed_fitting_date}}',
   E'Hi {{first_name}},\n\nYour fitting has been confirmed!\n\nDate: {{fitting_date}}\nTime: {{fitting_time}}\nFitter: {{fitter_name}}\n\nYour fitter will arrive at the scheduled time. Please ensure the area is clear and accessible.\n\nBest regards,\nPaxBespoke',
   '{email}', 'fitter_assigned', 'immediate', 0, 100),

  ('fitting_complete_signoff', 'Fitting Complete — Sign-Off Request',
   'Your Fitting is Complete — Please Sign Off',
   E'Hi {{first_name}},\n\nYour fitting has been completed by {{fitter_name}}. We hope you are happy with the result!\n\nPlease take a moment to review the work and sign off.\n\nBest regards,\nPaxBespoke',
   '{email}', 'fitting_complete', 'minutes_after_stage', 30, 101),

  ('project_complete_review', 'Project Complete — Review Request',
   'Thank You — How Was Your PaxBespoke Experience?',
   E'Hi {{first_name}},\n\nYour PaxBespoke project is now complete! We hope you love your new wardrobe.\n\nLeave a Google Review: https://g.page/r/paxbespoke/review\n\nThank you for choosing PaxBespoke!\n\nBest regards,\nThe PaxBespoke Team',
   '{email}', 'complete', 'minutes_after_stage', 1440, 102)
ON CONFLICT (slug) DO NOTHING;
