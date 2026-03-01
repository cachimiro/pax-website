-- Add signature config to google_config (single-row table for email settings)
ALTER TABLE google_config ADD COLUMN IF NOT EXISTS signature_config jsonb DEFAULT '{}';

-- signature_config schema:
-- {
--   "name": "John Smith",
--   "role": "Design Consultant",
--   "phone": "+44 7000 000000",
--   "email": "john@paxbespoke.uk",
--   "tagline": "Premium Bespoke Wardrobes",
--   "logo_url": "https://paxbespoke.uk/images/logo-full.png",
--   "website_url": "https://paxbespoke.uk"
-- }
