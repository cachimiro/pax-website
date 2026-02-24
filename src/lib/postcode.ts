// Warrington centre coordinates
const WARRINGTON_LAT = 53.3900;
const WARRINGTON_LNG = -2.5970;
const MAX_RADIUS_MILES = 50;

interface PostcodeResult {
  valid: boolean;
  inRange: boolean;
  distance?: number; // miles
  location?: string;
  error?: string;
}

// Haversine formula for distance between two lat/lng points
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check postcode against Warrington radius using postcodes.io (free, no API key)
export async function checkPostcode(postcode: string): Promise<PostcodeResult> {
  const cleaned = postcode.replace(/\s+/g, '').toUpperCase();

  if (!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(cleaned)) {
    return { valid: false, inRange: false, error: 'Please enter a valid UK postcode.' };
  }

  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${cleaned}`);
    const data = await res.json();

    if (data.status !== 200 || !data.result) {
      return { valid: false, inRange: false, error: 'Postcode not found. Please check and try again.' };
    }

    const { latitude, longitude, admin_district, region } = data.result;
    const distance = haversineDistance(WARRINGTON_LAT, WARRINGTON_LNG, latitude, longitude);
    const inRange = distance <= MAX_RADIUS_MILES;

    return {
      valid: true,
      inRange,
      distance: Math.round(distance),
      location: admin_district || region || 'Unknown',
    };
  } catch {
    // If API fails, allow through with a note
    return { valid: true, inRange: true, distance: undefined, location: undefined, error: undefined };
  }
}
