import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment Variables for Supabase
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

let supabaseInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return supabaseInstance;
}

// Spatial helper: invoke get_nearby_pigs RPC
export async function fetchNearbyPigsRpc(lat: number, lng: number, radiusMeters: number = 1500) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.rpc('get_nearby_pigs', {
      center_lat: lat,
      center_lng: lng,
      radius_meters: radiusMeters,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase Spatial RPC Error]', err);
    return null;
  }
}

// Subscribe to real-time changes on pig_records
export function subscribeToPigRecordUpdates(onInsertOrUpdate: (record: any) => void) {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:pig_records_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pig_records' },
      (payload) => {
        onInsertOrUpdate(payload.new || payload.old);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
