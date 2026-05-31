export interface PlaceLog {
  id: string;
  placeName: string;
  placeType: 'country' | 'state' | 'district' | 'city' | 'neighborhood' | 'landmark';
  countryCode: string; // ISO 2-letter code
  countryName: string;
  stateName?: string;
  cityName?: string;
  latitude: number;
  longitude: number;
  visitedAt?: string;    // ISO date string (YYYY-MM-DD) — start date
  visitedAtEnd?: string; // ISO date string — end date (for multi-day trips)
  visitCount: number;
  rating?: number; // 0–5 in 0.5 increments
  notes?: string;
  tags?: string[];
  visibility: 'friends' | 'private';
  aiMemoryId?: string;
  // Photo / media
  photoUrl?: string;         // Supabase Storage public URL (primary photo)
  photoExternalUrl?: string; // User-provided external link (Google Drive, iCloud album, etc.)
  createdAt: string;
  deletedAt?: string; // soft delete timestamp
}

export interface Trip {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  placeLogIds: string[];
  aiDiaryId?: string;
  createdAt: string;
  deletedAt?: string;
}

export interface WishlistItem {
  id: string;
  placeName: string;
  placeType?: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  priority: 1 | 2 | 3; // 1: High, 2: Medium, 3: Low
  notes?: string;
  aiSuggestionSource?: string; // e.g. 'country_panel'
  createdAt: string;
  deletedAt?: string;
}

export interface AIMemory {
  id: string;
  entityType: 'place' | 'trip' | 'year' | 'country' | 'life';
  entityId: string; // placeLogId, tripId, year (e.g. '2025'), countryCode (e.g. 'IN')
  memoryType: 'postcard' | 'diary' | 'year_review' | 'country_story' | 'life_memoir' | 'missed_spots_letter' | 'trip_diary';
  promptUsed: string;
  generatedText: string;
  userEditedText?: string;
  modelUsed: string;
  generatedAt: string;
  deletedAt?: string;
  mood?: string; // e.g. 'adventurous', 'nostalgic', etc.
}

export interface CountryIntelligence {
  id: string;
  countryCode: string;
  coverageScore: number; // 0-100
  missedSpots: {
    name: string;
    description: string;
    whyVisit: string;
  }[];
  suggestedRoute: string; // Markdown summary of 3-day itinerary
  generatedAt: string;
  expiresAt: string;
}

export interface Badge {
  key: string;
  label: string;
  description: string;
  icon: string; // Emoji or Lucide icon key
  earnedAt?: string;
  // Progress tracking for locked badges
  progress?: number;
  target?: number;
}

export interface UserSettings {
  groqApiKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  theme: 'dark' | 'glass';
  globeStyle: 'stylized' | 'realistic';
  defaultVisibility: 'friends' | 'private';
}
