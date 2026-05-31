import { createClient, SupabaseClient, type Session, type AuthChangeEvent } from '@supabase/supabase-js';
import type { PlaceLog, WishlistItem, AIMemory } from '../types';

// ─── Singleton Client (env vars only) ────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let _client: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (_client) return _client;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. ' +
      'See .env.example for reference.'
    );
  }

  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return _client;
};

// Check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
};

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || email.split('@')[0] },
    },
  });
  if (error) throw error;
  return data;
};

export const signInWithEmail = async (email: string, password: string) => {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const client = getSupabaseClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
};

export const getSession = async (): Promise<Session | null> => {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
};

export const onAuthStateChange = (
  callback: (event: AuthChangeEvent, session: Session | null) => void
) => {
  const client = getSupabaseClient();
  return client.auth.onAuthStateChange(callback);
};

export const sendPasswordReset = async (email: string) => {
  const client = getSupabaseClient();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback`,
  });
  if (error) throw error;
};

// ─── Photo Storage Helpers ────────────────────────────────────────────────────

/**
 * Compresses an image file using Canvas API to max 800px width at 80% quality.
 * Returns a Blob ready for upload. Works entirely in-browser, no dependencies.
 */
export const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => { if (blob) resolve(blob); else reject(new Error('Compression failed')); },
          'image/jpeg',
          0.82
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Uploads a photo to Supabase Storage bucket 'place-photos'.
 * Returns the public URL string, or null if not configured.
 */
export const uploadPhoto = async (
  file: File,
  userId: string,
  logId: string
): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const client = getSupabaseClient();
    const compressed = await compressImage(file);
    const ext = 'jpg';
    const path = `${userId}/${logId}.${ext}`;

    const { error } = await client.storage
      .from('place-photos')
      .upload(path, compressed, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('[Supabase] Photo upload error:', error);
      return null;
    }

    const { data } = client.storage.from('place-photos').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error('[Supabase] uploadPhoto failed:', e);
    return null;
  }
};

/**
 * Deletes a photo from storage given its public URL.
 */
export const deletePhoto = async (photoUrl: string): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  try {
    const client = getSupabaseClient();
    // Extract path from URL: everything after /place-photos/
    const match = photoUrl.match(/place-photos\/(.+)$/);
    if (!match) return;
    await client.storage.from('place-photos').remove([match[1]]);
  } catch (e) {
    console.error('[Supabase] deletePhoto failed:', e);
  }
};

// ─── Cloud Data Fetching ──────────────────────────────────────────────────────

export const fetchCloudData = async (): Promise<{
  placeLogs: PlaceLog[];
  wishlist: WishlistItem[];
  aiMemories: AIMemory[];
} | null> => {
  try {
    const client = getSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    const [logsRes, wishRes, memoriesRes] = await Promise.all([
      client.from('place_logs').select('*').eq('user_id', user.id),
      client.from('wishlists').select('*').eq('user_id', user.id).is('deleted_at', null),
      client.from('ai_memories').select('*').eq('user_id', user.id).is('deleted_at', null),
    ]);

    return {
      placeLogs: (logsRes.data || []).map(mapDbLogToPlaceLog),
      wishlist: (wishRes.data || []).map(mapDbWishToWishlistItem),
      aiMemories: (memoriesRes.data || []).map(mapDbMemToAIMemory),
    };
  } catch (e) {
    console.error('[Supabase] fetchCloudData error:', e);
    return null;
  }
};

// ─── Cloud Write Operations ───────────────────────────────────────────────────

export const savePlaceLogToCloud = async (log: PlaceLog) => {
  try {
    const client = getSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    await client.from('place_logs').upsert({
      id: log.id,
      user_id: user.id,
      place_name: log.placeName,
      place_type: log.placeType,
      country_code: log.countryCode,
      country_name: log.countryName,
      state_name: log.stateName ?? null,
      city_name: log.cityName ?? null,
      latitude: log.latitude,
      longitude: log.longitude,
      visited_at: log.visitedAt ?? null,
      visited_at_end: log.visitedAtEnd ?? null,
      visit_count: log.visitCount,
      rating: log.rating ?? null,
      notes: log.notes ?? null,
      tags: log.tags ?? [],
      visibility: log.visibility,
      ai_memory_id: log.aiMemoryId ?? null,
      photo_url: log.photoUrl ?? null,
      photo_external_url: log.photoExternalUrl ?? null,
      created_at: log.createdAt,
      deleted_at: log.deletedAt ?? null,
    });
  } catch (e) {
    console.error('[Supabase] savePlaceLog error:', e);
  }
};

export const saveWishlistItemToCloud = async (item: WishlistItem) => {
  try {
    const client = getSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    await client.from('wishlists').upsert({
      id: item.id,
      user_id: user.id,
      place_name: item.placeName,
      place_type: item.placeType ?? null,
      country_code: item.countryCode,
      latitude: item.latitude,
      longitude: item.longitude,
      priority: item.priority,
      notes: item.notes ?? null,
      ai_suggestion_source: item.aiSuggestionSource ?? null,
      created_at: item.createdAt,
      deleted_at: item.deletedAt ?? null,
    });
  } catch (e) {
    console.error('[Supabase] saveWishlistItem error:', e);
  }
};

export const saveAIMemoryToCloud = async (memory: AIMemory) => {
  try {
    const client = getSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    await client.from('ai_memories').upsert({
      id: memory.id,
      user_id: user.id,
      entity_type: memory.entityType,
      entity_id: memory.entityId,
      memory_type: memory.memoryType,
      prompt_used: memory.promptUsed,
      generated_text: memory.generatedText,
      user_edited_text: memory.userEditedText ?? null,
      model_used: memory.modelUsed,
      generated_at: memory.generatedAt,
      deleted_at: memory.deletedAt ?? null,
      mood: memory.mood ?? null,
    });
  } catch (e) {
    console.error('[Supabase] saveAIMemory error:', e);
  }
};

// ─── DB Row Mappers ───────────────────────────────────────────────────────────

const mapDbLogToPlaceLog = (l: Record<string, unknown>): PlaceLog => ({
  id: l.id as string,
  placeName: l.place_name as string,
  placeType: l.place_type as PlaceLog['placeType'],
  countryCode: l.country_code as string,
  countryName: l.country_name as string,
  stateName: (l.state_name as string) || undefined,
  cityName: (l.city_name as string) || undefined,
  latitude: l.latitude as number,
  longitude: l.longitude as number,
  visitedAt: (l.visited_at as string) || undefined,
  visitedAtEnd: (l.visited_at_end as string) || undefined,
  visitCount: (l.visit_count as number) ?? 1,
  rating: (l.rating as number) || undefined,
  notes: (l.notes as string) || undefined,
  tags: (l.tags as string[]) || [],
  visibility: (l.visibility as PlaceLog['visibility']) ?? 'friends',
  aiMemoryId: (l.ai_memory_id as string) || undefined,
  photoUrl: (l.photo_url as string) || undefined,
  photoExternalUrl: (l.photo_external_url as string) || undefined,
  createdAt: l.created_at as string,
  deletedAt: (l.deleted_at as string) || undefined,
});

const mapDbWishToWishlistItem = (w: Record<string, unknown>): WishlistItem => ({
  id: w.id as string,
  placeName: w.place_name as string,
  placeType: (w.place_type as string) || undefined,
  countryCode: w.country_code as string,
  latitude: w.latitude as number,
  longitude: w.longitude as number,
  priority: ((w.priority as number) ?? 2) as WishlistItem['priority'],
  notes: (w.notes as string) || undefined,
  aiSuggestionSource: (w.ai_suggestion_source as string) || undefined,
  createdAt: w.created_at as string,
  deletedAt: (w.deleted_at as string) || undefined,
});

const mapDbMemToAIMemory = (m: Record<string, unknown>): AIMemory => ({
  id: m.id as string,
  entityType: m.entity_type as AIMemory['entityType'],
  entityId: m.entity_id as string,
  memoryType: m.memory_type as AIMemory['memoryType'],
  promptUsed: m.prompt_used as string,
  generatedText: m.generated_text as string,
  userEditedText: (m.user_edited_text as string) || undefined,
  modelUsed: m.model_used as string,
  generatedAt: m.generated_at as string,
  deletedAt: (m.deleted_at as string) || undefined,
  mood: (m.mood as string) || undefined,
});
