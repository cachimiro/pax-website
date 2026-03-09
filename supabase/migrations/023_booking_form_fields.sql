-- Adds fields captured by the package-specific booking form to the leads table.
-- These were previously collapsed into the notes text blob; now stored as discrete columns
-- so the CRM can filter, display, and act on them individually.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS measurements       text,
  ADD COLUMN IF NOT EXISTS space_constraints  text[],
  ADD COLUMN IF NOT EXISTS home_visit         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS door_finish_type   text,
  ADD COLUMN IF NOT EXISTS door_model         text,
  ADD COLUMN IF NOT EXISTS planner_link       text;

COMMENT ON COLUMN leads.measurements      IS 'Room measurements provided by the customer at booking time';
COMMENT ON COLUMN leads.space_constraints IS 'Space constraint tags selected in the booking form (e.g. sloped-ceiling, alcoves)';
COMMENT ON COLUMN leads.home_visit        IS 'Customer requested a home visit before the online consultation';
COMMENT ON COLUMN leads.door_finish_type  IS 'Preferred door finish for Select package (spray-painted, vinyl, unsure)';
COMMENT ON COLUMN leads.door_model        IS 'Door style reference or description provided by the customer';
COMMENT ON COLUMN leads.planner_link      IS 'IKEA PAX Planner link provided by Budget package customers';
