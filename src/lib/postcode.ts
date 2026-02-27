// Base coordinates for distance calculation (logistics planning)
const BASE_LAT = 53.3900;
const BASE_LNG = -2.5970;

interface PostcodeResult {
  valid: boolean;
  inRange: boolean;
  distance?: number; // miles from base
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

// Validate a UK postcode and return distance for logistics. All valid UK postcodes are accepted.
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
    const distance = haversineDistance(BASE_LAT, BASE_LNG, latitude, longitude);

    return {
      valid: true,
      inRange: true, // All UK postcodes accepted
      distance: Math.round(distance),
      location: admin_district || region || 'Unknown',
    };
  } catch {
    // If API fails, allow through
    return { valid: true, inRange: true, distance: undefined, location: undefined, error: undefined };
  }
}
