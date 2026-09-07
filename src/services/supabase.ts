import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

const isValidUrl = Boolean(rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')));

// Safe fallback URL and key to prevent top-level module load crashes when environment variables are missing
const supabaseUrl = isValidUrl ? rawUrl : 'https://placeholder-project.supabase.co';
const supabaseAnonKey = rawKey || 'placeholder-anon-key';

let supabaseClientInstance: SupabaseClient;

try {
  supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
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
} catch (err) {
  console.warn('[Supabase Client] Safe initialization fallback activated:', err);
  supabaseClientInstance = createClient('https://placeholder-project.supabase.co', 'placeholder-anon-key');
}

export const supabase: SupabaseClient = supabaseClientInstance;
export default supabase;
