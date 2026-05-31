import { create } from 'zustand';
import type { PlaceLog, Trip, WishlistItem, AIMemory, CountryIntelligence, Badge, UserSettings } from '../types';
import {
  isSupabaseConfigured,
  getSupabaseClient,
  fetchCloudData,
  savePlaceLogToCloud,
  saveWishlistItemToCloud,
  saveAIMemoryToCloud,
  onAuthStateChange,
  signOut,
} from '../services/supabase';
import type { Session } from '@supabase/supabase-js';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

interface TravelState {
  // Auth
  user: AuthUser | null;
  session: Session | null;
  authLoading: boolean;

  // Data
  placeLogs: PlaceLog[];
  trips: Trip[];
  wishlist: WishlistItem[];
  aiMemories: AIMemory[];
  countryIntelligence: Record<string, CountryIntelligence>;
  settings: UserSettings;
  badges: Badge[];

  // UI
  selectedCountryCode: string | null;
  activeTab: 'globe' | 'timeline' | 'dashboard' | 'settings';
  dataLoading: boolean;

  // Friends
  friendsGlobesEnabled: boolean;
  friendsPlaceLogs: PlaceLog[];

  // Auth Actions
  setSession: (session: Session | null) => void;
  logout: () => Promise<void>;
  toggleFriendsGlobes: () => void;

  // Data Actions
  loadCloudData: () => Promise<void>;
  addPlaceLog: (log: Omit<PlaceLog, 'id' | 'createdAt' | 'visitCount'>) => PlaceLog;
  updatePlaceLog: (id: string, updates: Partial<PlaceLog>) => void;
  deletePlaceLog: (id: string) => void;
  restorePlaceLog: (id: string) => void;

  addTrip: (trip: Omit<Trip, 'id' | 'createdAt'>) => Trip;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;

  addWishlistItem: (item: Omit<WishlistItem, 'id' | 'createdAt'>) => void;
  deleteWishlistItem: (id: string) => void;

  addAIMemory: (memory: Omit<AIMemory, 'id' | 'generatedAt'>) => AIMemory;
  updateAIMemory: (id: string, text: string) => void;
  deleteAIMemory: (id: string) => void;

  cacheCountryIntel: (intel: CountryIntelligence) => void;
  updateSettings: (updates: Partial<UserSettings>) => void;
  setSelectedCountryCode: (code: string | null) => void;
  setActiveTab: (tab: TravelState['activeTab']) => void;

  exportData: () => string;
  importData: (jsonData: string) => boolean;
  clearAllData: () => void;
}

// ─── Badges ───────────────────────────────────────────────────────────────────

const DEFAULT_BADGES: Badge[] = [
  { key: 'first_pin', label: 'First Step', description: 'Log your very first travel memory.', icon: '📍', target: 1 },
  { key: 'globetrotter', label: 'Globetrotter', description: 'Visit 5 or more unique countries.', icon: '🌍', target: 5 },
  { key: 'deep_explorer', label: 'Deep Explorer', description: 'Log 10 or more different places.', icon: '🧭', target: 10 },
  { key: 'time_traveler', label: 'Time Traveler', description: 'Log visits spanning across 3 or more different years.', icon: '⏳', target: 3 },
  { key: 'critic', label: 'Travel Critic', description: 'Rate 5 or more places with star ratings.', icon: '⭐', target: 5 },
  { key: 'ai_storyteller', label: 'AI Storyteller', description: 'Generate 3 or more AI travel memories.', icon: '🤖', target: 3 },
  { key: 'photo_journalist', label: 'Photo Journalist', description: 'Attach photos to 3 or more place logs.', icon: '📸', target: 3 },
  { key: 'world_mapper', label: 'World Mapper', description: 'Visit places in 10 or more countries.', icon: '🗺️', target: 10 },
];

const calculateEarnedBadges = (logs: PlaceLog[], memories: AIMemory[]): { key: string; progress: number }[] => {
  const activeLogs = logs.filter(l => !l.deletedAt);
  const result: { key: string; progress: number }[] = [];

  const uniqueCountries = new Set(activeLogs.map(l => l.countryCode)).size;
  const years = new Set(activeLogs.map(l => (l.visitedAt ? new Date(l.visitedAt).getFullYear() : null)).filter(Boolean)).size;
  const ratedCount = activeLogs.filter(l => typeof l.rating === 'number').length;
  const photoCount = activeLogs.filter(l => l.photoUrl).length;
  const activeMemories = memories.filter(m => !m.deletedAt).length;

  result.push({ key: 'first_pin', progress: Math.min(activeLogs.length, 1) });
  result.push({ key: 'globetrotter', progress: uniqueCountries });
  result.push({ key: 'deep_explorer', progress: activeLogs.length });
  result.push({ key: 'time_traveler', progress: years });
  result.push({ key: 'critic', progress: ratedCount });
  result.push({ key: 'ai_storyteller', progress: activeMemories });
  result.push({ key: 'photo_journalist', progress: photoCount });
  result.push({ key: 'world_mapper', progress: uniqueCountries });

  return result;
};

// ─── Default Settings ──────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: UserSettings = {
  groqApiKey: import.meta.env.VITE_GROQ_API_KEY || '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  theme: 'glass',
  globeStyle: 'stylized',
  defaultVisibility: 'friends',
};

// ─── LocalStorage helpers (trips + settings only) ────────────────────────────

const LS_KEY = 'wt_';

const loadLocalTrips = (): Trip[] => {
  try { return JSON.parse(localStorage.getItem(`${LS_KEY}trips`) || '[]'); } catch { return []; }
};

const saveLocalTrips = (trips: Trip[]) => {
  localStorage.setItem(`${LS_KEY}trips`, JSON.stringify(trips));
};

const loadLocalSettings = (): UserSettings => {
  try {
    const stored = localStorage.getItem(`${LS_KEY}settings`);
    if (!stored) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(stored);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      // Always prefer env vars for keys if set
      groqApiKey: DEFAULT_SETTINGS.groqApiKey || parsed.groqApiKey || '',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const saveLocalSettings = (settings: UserSettings) => {
  localStorage.setItem(`${LS_KEY}settings`, JSON.stringify(settings));
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTravelStore = create<TravelState>((set, get) => {

  // Recalculate badge state after data changes
  const recalcBadges = (logs: PlaceLog[], memories: AIMemory[]) => {
    const prevBadges = get().badges;
    const progressData = calculateEarnedBadges(logs, memories);

    const nextBadges = DEFAULT_BADGES.map(badge => {
      const prog = progressData.find(p => p.key === badge.key);
      const progress = prog?.progress ?? 0;
      const target = badge.target ?? 1;
      const isEarned = progress >= target;
      const prev = prevBadges.find(b => b.key === badge.key);

      return {
        ...badge,
        progress,
        earnedAt: prev?.earnedAt || (isEarned ? new Date().toISOString() : undefined),
      };
    });

    const prevEarnedKeys = prevBadges.filter(b => b.earnedAt).map(b => b.key);
    const newlyEarned = nextBadges.filter(b => b.earnedAt && !prevEarnedKeys.includes(b.key));

    set({ badges: nextBadges });

    if (newlyEarned.length > 0) {
      const event = new CustomEvent('badge-unlocked', { detail: newlyEarned[0] });
      window.dispatchEvent(event);
    }
  };

  // Initialize auth listener
  const initAuth = async () => {
    if (!isSupabaseConfigured()) {
      set({ authLoading: false });
      return;
    }

    try {
      const client = getSupabaseClient();

      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        const user: AuthUser = {
          id: session.user.id,
          email: session.user.email!,
          displayName: (session.user.user_metadata?.display_name as string) || session.user.email!.split('@')[0],
        };
        set({ user, session, authLoading: false });
        get().loadCloudData();
      } else {
        set({ authLoading: false });
      }

      onAuthStateChange((event, newSession) => {
        if (event === 'SIGNED_IN' && newSession?.user) {
          const user: AuthUser = {
            id: newSession.user.id,
            email: newSession.user.email!,
            displayName: (newSession.user.user_metadata?.display_name as string) || newSession.user.email!.split('@')[0],
          };
          set({ user, session: newSession });
          get().loadCloudData();
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, session: null, placeLogs: [], wishlist: [], aiMemories: [], trips: [] });
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          set({ session: newSession });
        }
      });
    } catch (e) {
      console.error('[Store] Auth init failed:', e);
      set({ authLoading: false });
    }
  };

  initAuth();

  return {
    // ─── Initial State ─────────────────────────────────────────────────────
    user: null,
    session: null,
    authLoading: true,
    dataLoading: false,

    placeLogs: [],
    trips: loadLocalTrips(),
    wishlist: [],
    aiMemories: [],
    countryIntelligence: {},
    settings: loadLocalSettings(),
    badges: DEFAULT_BADGES,

    selectedCountryCode: null,
    activeTab: 'globe',

    friendsGlobesEnabled: false,
    friendsPlaceLogs: [],

    // ─── Auth Actions ──────────────────────────────────────────────────────

    setSession: (session) => {
      if (!session) {
        set({ user: null, session: null });
        return;
      }
      const user: AuthUser = {
        id: session.user.id,
        email: session.user.email!,
        displayName: (session.user.user_metadata?.display_name as string) || session.user.email!.split('@')[0],
      };
      set({ user, session });
    },

    logout: async () => {
      try {
        await signOut();
      } catch (e) {
        console.error('[Store] Logout error:', e);
      }
      set({
        user: null,
        session: null,
        placeLogs: [],
        wishlist: [],
        aiMemories: [],
        trips: [],
        badges: DEFAULT_BADGES,
      });
    },

    toggleFriendsGlobes: () => set({ friendsGlobesEnabled: !get().friendsGlobesEnabled }),

    // ─── Cloud Data Loading ────────────────────────────────────────────────

    loadCloudData: async () => {
      set({ dataLoading: true });
      const data = await fetchCloudData();
      if (data) {
        const progressData = calculateEarnedBadges(data.placeLogs, data.aiMemories);
        const badges = DEFAULT_BADGES.map(b => {
          const prog = progressData.find(p => p.key === b.key);
          const progress = prog?.progress ?? 0;
          const target = b.target ?? 1;
          return {
            ...b,
            progress,
            earnedAt: progress >= target ? new Date().toISOString() : undefined,
          };
        });
        set({
          placeLogs: data.placeLogs,
          wishlist: data.wishlist,
          aiMemories: data.aiMemories,
          badges,
          dataLoading: false,
        });
      } else {
        set({ dataLoading: false });
      }
    },

    // ─── Place Logs ────────────────────────────────────────────────────────

    addPlaceLog: (log) => {
      const { settings } = get();
      const newLog: PlaceLog = {
        ...log,
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        visitCount: 1,
        visibility: log.visibility ?? settings.defaultVisibility,
        createdAt: new Date().toISOString(),
      };
      const newLogs = [newLog, ...get().placeLogs];
      set({ placeLogs: newLogs });
      recalcBadges(newLogs, get().aiMemories);
      savePlaceLogToCloud(newLog);
      return newLog;
    },

    updatePlaceLog: (id, updates) => {
      const newLogs = get().placeLogs.map(l => l.id === id ? { ...l, ...updates } : l);
      set({ placeLogs: newLogs });
      recalcBadges(newLogs, get().aiMemories);
      const updated = newLogs.find(l => l.id === id);
      if (updated) savePlaceLogToCloud(updated);
    },

    deletePlaceLog: (id) => {
      const newLogs = get().placeLogs.map(l =>
        l.id === id ? { ...l, deletedAt: new Date().toISOString() } : l
      );
      set({ placeLogs: newLogs });
      recalcBadges(newLogs, get().aiMemories);
      const deleted = newLogs.find(l => l.id === id);
      if (deleted) savePlaceLogToCloud(deleted);
    },

    restorePlaceLog: (id) => {
      const newLogs = get().placeLogs.map(l =>
        l.id === id ? { ...l, deletedAt: undefined } : l
      );
      set({ placeLogs: newLogs });
      recalcBadges(newLogs, get().aiMemories);
      const restored = newLogs.find(l => l.id === id);
      if (restored) savePlaceLogToCloud(restored);
    },

    // ─── Trips ────────────────────────────────────────────────────────────

    addTrip: (trip) => {
      const newTrip: Trip = {
        ...trip,
        id: `trip-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      const newTrips = [newTrip, ...get().trips];
      set({ trips: newTrips });
      saveLocalTrips(newTrips);
      return newTrip;
    },

    updateTrip: (id, updates) => {
      const newTrips = get().trips.map(t => t.id === id ? { ...t, ...updates } : t);
      set({ trips: newTrips });
      saveLocalTrips(newTrips);
    },

    deleteTrip: (id) => {
      const newTrips = get().trips.map(t =>
        t.id === id ? { ...t, deletedAt: new Date().toISOString() } : t
      );
      set({ trips: newTrips });
      saveLocalTrips(newTrips);
    },

    // ─── Wishlist ──────────────────────────────────────────────────────────

    addWishlistItem: (item) => {
      const newItem: WishlistItem = {
        ...item,
        id: `wish-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      const newWish = [newItem, ...get().wishlist];
      set({ wishlist: newWish });
      saveWishlistItemToCloud(newItem);
    },

    deleteWishlistItem: (id) => {
      const item = get().wishlist.find(w => w.id === id);
      const newWish = get().wishlist.filter(w => w.id !== id);
      set({ wishlist: newWish });
      if (item) saveWishlistItemToCloud({ ...item, deletedAt: new Date().toISOString() });
    },

    // ─── AI Memories ───────────────────────────────────────────────────────

    addAIMemory: (memory) => {
      const newMemory: AIMemory = {
        ...memory,
        id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        generatedAt: new Date().toISOString(),
      };
      const newMemories = [newMemory, ...get().aiMemories];
      set({ aiMemories: newMemories });
      recalcBadges(get().placeLogs, newMemories);
      saveAIMemoryToCloud(newMemory);
      return newMemory;
    },

    updateAIMemory: (id, text) => {
      const newMemories = get().aiMemories.map(m => m.id === id ? { ...m, userEditedText: text } : m);
      set({ aiMemories: newMemories });
      const updated = newMemories.find(m => m.id === id);
      if (updated) saveAIMemoryToCloud(updated);
    },

    deleteAIMemory: (id) => {
      const newMemories = get().aiMemories.filter(m => m.id !== id);
      set({ aiMemories: newMemories });
    },

    // ─── Settings & UI ──────────────────────────────────────────────────────

    cacheCountryIntel: (intel) => {
      set({ countryIntelligence: { ...get().countryIntelligence, [intel.countryCode]: intel } });
    },

    updateSettings: (updates) => {
      const newSettings = { ...get().settings, ...updates };
      set({ settings: newSettings });
      saveLocalSettings(newSettings);
    },

    setSelectedCountryCode: (code) => set({ selectedCountryCode: code }),
    setActiveTab: (tab) => set({ activeTab: tab }),

    // ─── Export / Import ───────────────────────────────────────────────────

    exportData: () => JSON.stringify({
      placeLogs: get().placeLogs,
      trips: get().trips,
      wishlist: get().wishlist,
      aiMemories: get().aiMemories,
    }, null, 2),

    importData: (jsonData) => {
      try {
        const parsed = JSON.parse(jsonData);
        if (parsed.placeLogs && Array.isArray(parsed.placeLogs)) {
          set({
            placeLogs: parsed.placeLogs,
            trips: parsed.trips || [],
            wishlist: parsed.wishlist || [],
            aiMemories: parsed.aiMemories || [],
          });
          saveLocalTrips(parsed.trips || []);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },

    clearAllData: () => {
      set({ placeLogs: [], trips: [], wishlist: [], aiMemories: [], countryIntelligence: {}, badges: DEFAULT_BADGES });
      saveLocalTrips([]);
    },
  };
});
