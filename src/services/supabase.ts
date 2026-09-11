import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta?.env?.[key]) {
      return import.meta.env[key];
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process?.env?.[key]) {
      return process.env[key] as string;
    }
  } catch {}
  return '';
};

const DEFAULT_SUPABASE_URL = 'https://lpkquznudtqrpuzmwhdt.supabase.co';
const rawUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || '';
const rawKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || '';

const isValidUrl = Boolean(rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')));

// Synchronize with production Supabase instance
const supabaseUrl = isValidUrl ? rawUrl : DEFAULT_SUPABASE_URL;
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
