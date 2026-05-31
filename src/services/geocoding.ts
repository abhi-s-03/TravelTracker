// Geocoding service using OpenStreetMap Nominatim API (100% Free, no keys required)
// Rates are capped at 1 req/sec, so we use a robust local cache to prevent overloading.

export interface GeocodeResult {
  placeName: string;
  placeType: 'country' | 'state' | 'district' | 'city' | 'neighborhood' | 'landmark';
  countryCode: string; // ISO 2-letter uppercase
  countryName: string;
  stateName?: string;
  cityName?: string;
  latitude: number;
  longitude: number;
}

// Simple in-memory cache for the session to prevent repeating duplicate queries during search typeaheads
const searchCache: Record<string, GeocodeResult[]> = {};

export const searchPlaces = async (query: string): Promise<GeocodeResult[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  // Check cache first
  if (searchCache[trimmed.toLowerCase()]) {
    return searchCache[trimmed.toLowerCase()];
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&addressdetails=1&limit=8`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'WorldTrackerPersonalTravelJournalApp/2.0' // Nominatim requires a descriptive User-Agent
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.statusText}`);
    }

    const data = await response.json();
    
    const results: GeocodeResult[] = data.map((item: any) => {
      const addr = item.address || {};
      
      // Determine place granularity
      let type: GeocodeResult['placeType'] = 'landmark';
      if (item.type === 'administrative' || item.class === 'boundary') {
        if (addr.country && !addr.state && !addr.city && !addr.town) {
          type = 'country';
        } else if (addr.state && !addr.city && !addr.town && !addr.village) {
          type = 'state';
        } else if (addr.county && !addr.city && !addr.town) {
          type = 'district';
        } else {
          type = 'city';
        }
      } else if (item.type === 'city' || item.type === 'town' || item.type === 'village') {
        type = 'city';
      } else if (item.type === 'suburb' || item.type === 'neighbourhood') {
        type = 'neighborhood';
      }

      // Safe fallback names
      const countryName = addr.country || '';
      const countryCode = (addr.country_code || '').toUpperCase();
      const stateName = addr.state || addr.region || addr.province || undefined;
      const cityName = addr.city || addr.town || addr.municipality || addr.village || undefined;

      return {
        placeName: item.display_name,
        placeType: type,
        countryCode,
        countryName,
        stateName,
        cityName,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      };
    });

    // Save to cache
    searchCache[trimmed.toLowerCase()] = results;
    return results;
  } catch (error) {
    console.error('Nominatim geocoding failed, falling back to local fallback search', error);
    return fallbackSearch(trimmed);
  }
};

// Fallback search that works completely offline using standard static landmarks
const STATIC_FALLBACK_PLACES: GeocodeResult[] = [
  { placeName: 'Tokyo, Japan', placeType: 'city', countryCode: 'JP', countryName: 'Japan', cityName: 'Tokyo', latitude: 35.6762, longitude: 139.6503 },
  { placeName: 'London, United Kingdom', placeType: 'city', countryCode: 'GB', countryName: 'United Kingdom', cityName: 'London', latitude: 51.5074, longitude: -0.1278 },
  { placeName: 'New York City, USA', placeType: 'city', countryCode: 'US', countryName: 'United States', cityName: 'New York', latitude: 40.7128, longitude: -74.0060 },
  { placeName: 'Sydney Opera House, Australia', placeType: 'landmark', countryCode: 'AU', countryName: 'Australia', cityName: 'Sydney', latitude: -33.8568, longitude: 151.2153 },
  { placeName: 'Machu Picchu, Cusco, Peru', placeType: 'landmark', countryCode: 'PE', countryName: 'Peru', latitude: -13.1631, longitude: -72.5450 },
  { placeName: 'Great Pyramids of Giza, Egypt', placeType: 'landmark', countryCode: 'EG', countryName: 'Egypt', latitude: 29.9792, longitude: 31.1342 },
  { placeName: 'Petra, Jordan', placeType: 'landmark', countryCode: 'JO', countryName: 'Jordan', latitude: 30.3285, longitude: 35.4444 },
  { placeName: 'Rio de Janeiro, Brazil', placeType: 'city', countryCode: 'BR', countryName: 'Brazil', cityName: 'Rio de Janeiro', latitude: -22.9068, longitude: -43.1729 },
  { placeName: 'Singapore Changi, Singapore', placeType: 'landmark', countryCode: 'SG', countryName: 'Singapore', cityName: 'Singapore', latitude: 1.3521, longitude: 103.8198 },
];

const fallbackSearch = (query: string): GeocodeResult[] => {
  const lowercase = query.toLowerCase();
  return STATIC_FALLBACK_PLACES.filter(place => 
    place.placeName.toLowerCase().includes(lowercase) ||
    place.countryName.toLowerCase().includes(lowercase)
  );
};
