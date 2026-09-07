import { getSupabaseClient } from './supabaseClient';
import { SystemSettings } from '../types';

export async function fetchSystemSettings(): Promise<SystemSettings> {
  const supabase = getSupabaseClient();
  if (!supabase) return {};

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'landingPage')
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetchSystemSettings notice:', error.message);
      return {};
    }
    return data?.value || {};
  } catch (err) {
    console.error('Error fetching system settings:', err);
    return {};
  }
}

export async function saveSystemSettings(settings: SystemSettings): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'landingPage',
        value: settings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) throw error;
  } catch (err) {
    console.error('Error saving system settings:', err);
    throw err;
  }
}
