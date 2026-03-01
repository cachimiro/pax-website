-- Add meet_link column to bookings for Google Meet URLs
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meet_link text;
