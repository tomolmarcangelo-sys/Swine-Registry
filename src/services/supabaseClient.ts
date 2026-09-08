import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { PigRecord, User } from '../types';

// Export functions for checking configuration and accessing single client instance
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  return supabase;
}

// ----------------- ROW CONVERTERS -----------------

export function pigToRow(pig: PigRecord) {
  return {
    id: pig.id,
    ear_tag: pig.earTag,
    owner_name: pig.ownerName,
    contact: pig.contact,
    address: pig.address,
    barangay: pig.barangay,
    breed: pig.breed,
    sex: pig.sex,
    age: pig.age,
    weight: pig.weight,
    purpose: pig.purpose,
    vaccinated: pig.vaccinated,
    asf_cleared: pig.asfCleared,
    date_registered: pig.dateRegistered,
    lat: pig.lat,
    lng: pig.lng,
    gps_accuracy: pig.gpsAccuracy,
    gps_altitude: pig.gpsAltitude,
    gps_timestamp: pig.gpsTimestamp,
    registered_by: pig.registeredBy,
    notes: pig.notes,
    biosecurity: pig.biosecurity,
    updated_at: new Date().toISOString()
  };
}

export function rowToPig(row: any): PigRecord {
  let lat = Number(row.lat ?? row.latitude ?? 10.3700);
  let lng = Number(row.lng ?? row.longitude ?? 125.2000);

  // If PostGIS GeoJSON or Point string is present
  if (row.location && typeof row.location === 'object' && Array.isArray(row.location.coordinates)) {
    lng = Number(row.location.coordinates[0]);
    lat = Number(row.location.coordinates[1]);
  } else if (typeof row.location === 'string' && row.location.includes('POINT')) {
    const coords = row.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (coords) {
      lng = Number(coords[1]);
      lat = Number(coords[2]);
    }
  }

  return {
    id: String(row.id),
    earTag: row.ear_tag ?? row.earTag ?? '',
    ownerName: row.owner_name ?? row.ownerName ?? '',
    contact: row.contact ?? '',
    address: row.address ?? '',
    barangay: row.barangay ?? 'Poblacion 1',
    breed: row.breed ?? 'Landrace',
    sex: row.sex ?? 'Female',
    age: Number(row.age) || 6,
    weight: Number(row.weight) || 75,
    purpose: row.purpose ?? 'Backyard Raising',
    vaccinated: Boolean(row.vaccinated),
    asfCleared: row.asf_cleared !== undefined ? Boolean(row.asf_cleared) : (row.asfCleared !== undefined ? Boolean(row.asfCleared) : true),
    dateRegistered: row.date_registered ?? row.dateRegistered ?? new Date().toISOString(),
    lat,
    lng,
    gpsAccuracy: row.gps_accuracy ?? row.gpsAccuracy,
    gpsAltitude: row.gps_altitude ?? row.gpsAltitude,
    gpsTimestamp: row.gps_timestamp ?? row.gpsTimestamp,
    registeredBy: row.registered_by ?? row.registeredBy ?? 'focal_person',
    notes: row.notes ?? '',
    biosecurity: row.biosecurity
  };
}

export function userToRow(user: User) {
  return {
    username: user.username.toLowerCase(),
    password: user.password,
    role: user.role,
    full_name: user.fullName,
    barangay: user.barangay,
    email: user.email,
    phone: user.phone,
    updated_at: new Date().toISOString()
  };
}

export function rowToUser(row: any): User {
  return {
    username: row.username,
    password: row.password || '',
    role: row.role || 'user',
    fullName: row.full_name || row.fullName || row.username,
    barangay: row.barangay || null,
    email: row.email,
    phone: row.phone
  };
}

// ----------------- RESILIENT SCHEMA UPSERT HELPERS -----------------

/**
 * Safe helper to upsert pig rows to Supabase table 'pig_records'.
 * Automatically handles missing tables (PGRST205) and missing columns (PGRST204) in schema cache.
 */
async function safeUpsertPigRows(client: SupabaseClient, rows: Record<string, any>[]): Promise<void> {
  if (rows.length === 0) return;
  let payloadRows = rows.map(r => ({ ...r }));
  let maxRetries = 5;

  while (maxRetries > 0) {
    const { error } = await client.from('pig_records').upsert(payloadRows, { onConflict: 'id' });
    if (!error) return;

    // Check if table 'pig_records' is missing from PostgREST schema cache
    const isMissingTableError = error.code === 'PGRST205' ||
      (error.message && (error.message.includes("Could not find the table") || error.message.includes("schema cache")));

    if (isMissingTableError) {
      console.warn(`[Supabase Schema Notice] Table 'public.pig_records' is not present in Supabase schema cache. Local pig data preserved.`);
      return;
    }

    // Check if error is PGRST204 missing column error
    const isMissingColumnError = error.code === 'PGRST204' || 
      (error.message && (error.message.includes("Could not find the '") || error.message.includes("column of 'pig_records'")));

    if (isMissingColumnError) {
      const match = error.message.match(/Could not find the '(.*?)' column/i);
      const missingCol = match && match[1] ? match[1] : null;

      if (missingCol) {
        console.warn(`[Supabase Schema Alignment] Column '${missingCol}' does not exist in table 'pig_records'. Omitting from payload and retrying...`);
        payloadRows = payloadRows.map(r => {
          const updated = { ...r };
          delete updated[missingCol];
          return updated;
        });
        maxRetries--;
        continue;
      }
    }

    // If another error occurred, rethrow
    throw error;
  }
}

/**
 * Safe helper to upsert user rows to Supabase table 'users'.
 * Automatically handles missing tables (PGRST205) and missing columns (PGRST204) in schema cache.
 */
async function safeUpsertUserRows(client: SupabaseClient, rows: Record<string, any>[]): Promise<void> {
  if (rows.length === 0) return;
  let payloadRows = rows.map(r => ({ ...r }));
  let maxRetries = 5;

  while (maxRetries > 0) {
    const { error } = await client.from('users').upsert(payloadRows, { onConflict: 'username' });
    if (!error) return;

    // Check if table 'users' is missing from PostgREST schema cache
    const isMissingTableError = error.code === 'PGRST205' ||
      (error.message && (error.message.includes("Could not find the table") || error.message.includes("schema cache")));

    if (isMissingTableError) {
      console.warn(`[Supabase Schema Notice] Table 'public.users' is not present in Supabase schema cache. Local user authentication state preserved.`);
      return;
    }

    const isMissingColumnError = error.code === 'PGRST204' || 
      (error.message && (error.message.includes("Could not find the '") || error.message.includes("column of 'users'")));

    if (isMissingColumnError) {
      const match = error.message.match(/Could not find the '(.*?)' column/i);
      const missingCol = match && match[1] ? match[1] : null;

      if (missingCol) {
        console.warn(`[Supabase Schema Alignment] Column '${missingCol}' does not exist in table 'users'. Omitting from payload and retrying...`);
        payloadRows = payloadRows.map(r => {
          const updated = { ...r };
          delete updated[missingCol];
          return updated;
        });
        maxRetries--;
        continue;
      }
    }

    throw error;
  }
}

// ----------------- SUPABASE DATA REPOSITORIES -----------------

/**
 * Fetch all pigs from Supabase PostgreSQL Database
 */
export async function fetchPigsFromSupabase(): Promise<PigRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('pig_records')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('[Supabase] fetchPigs error:', error.message);
      return [];
    }
    return (data || []).map(rowToPig);
  } catch (err) {
    console.error('Error fetching pigs from Supabase:', err);
    return [];
  }
}

// Named alias CRUD exports querying Supabase directly via @supabase/supabase-js
export const fetchPigs = fetchPigsFromSupabase;
export const addPig = savePigToSupabase;
export const updatePig = savePigToSupabase;
export const deletePig = deletePigFromSupabase;

/**
 * Save or update single pig record in Supabase
 */
export async function savePigToSupabase(pig: PigRecord): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const row = pigToRow(pig);
    await safeUpsertPigRows(client, [row]);
  } catch (err: any) {
    console.warn('savePigToSupabase notice:', err?.message || err);
  }
}

/**
 * Batch write pigs to Supabase
 */
export async function batchSavePigsToSupabase(pigs: PigRecord[]): Promise<number> {
  if (pigs.length === 0) return 0;
  const client = getSupabaseClient();
  if (!client) return 0;

  try {
    const rows = pigs.map(pigToRow);
    await safeUpsertPigRows(client, rows);
    return pigs.length;
  } catch (err: any) {
    console.warn('batchSavePigsToSupabase notice:', err?.message || err);
    return 0;
  }
}

/**
 * Delete a pig from Supabase
 */
export async function deletePigFromSupabase(pigId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client.from('pig_records').delete().eq('id', pigId);
    if (error) throw error;
  } catch (err) {
    console.error('Error deleting pig from Supabase:', err);
    throw err;
  }
}

/**
 * Fetch all users from Supabase
 */
export async function fetchUsersFromSupabase(): Promise<User[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client.from('users').select('*');
    if (error) {
      console.warn('[Supabase] fetchUsers error:', error.message);
      return [];
    }
    return (data || []).map(rowToUser);
  } catch (err) {
    console.error('Error fetching users from Supabase:', err);
    return [];
  }
}

/**
 * Save user to Supabase
 */
export async function saveUserToSupabase(user: User): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const row = userToRow(user);
    await safeUpsertUserRows(client, [row]);
  } catch (err: any) {
    console.warn('saveUserToSupabase notice:', err?.message || err);
  }
}

/**
 * Batch write users to Supabase
 */
export async function batchSaveUsersToSupabase(users: User[]): Promise<number> {
  if (users.length === 0) return 0;
  const client = getSupabaseClient();
  if (!client) return 0;

  try {
    const rows = users.map(userToRow);
    await safeUpsertUserRows(client, rows);
    return users.length;
  } catch (err: any) {
    console.warn('batchSaveUsersToSupabase notice:', err?.message || err);
    return 0;
  }
}

/**
 * Spatial helper: invoke get_nearby_pigs RPC
 */
export async function fetchNearbyPigsRpc(lat: number, lng: number, radiusMeters: number = 1500) {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.rpc('get_nearby_pigs', {
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

/**
 * Spatial GIS Queries: Execute spatial PostGIS calls directly using RPC functions (supabase.rpc('get_farms_geojson'))
 * or client-side coordinate parsing for Leaflet map markers.
 */
export async function fetchFarmsGeoJson(): Promise<any | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.rpc('get_farms_geojson');
    if (!error && data) return data;
  } catch (err) {
    console.warn('[Supabase GIS RPC Notice] get_farms_geojson RPC fallback to client parsing:', err);
  }

  // Client-side GeoJSON fallback
  try {
    const pigs = await fetchPigsFromSupabase();
    return {
      type: 'FeatureCollection',
      features: pigs.map(p => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.lng, p.lat]
        },
        properties: { ...p }
      }))
    };
  } catch (err) {
    console.warn('[Supabase GIS Fallback Notice]', err);
    return null;
  }
}

/**
 * Executes a trivial select('id', { count: 'exact', head: true }) call on 'pig_records'
 * and logs the connection status to verify API keys and network accessibility.
 */
export async function testDatabaseConnection(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('[Supabase Test Connection] Client unavailable or invalid configuration.');
    return false;
  }

  try {
    const { count, error } = await client
      .from('pig_records')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('[Supabase Test Connection Failed]:', error.message);
      return false;
    }

    console.log(`%c[Supabase Backend Connected]%c Successfully verified pig_records table (${count ?? 0} records)`, 'color: #10b981; font-weight: bold;', 'color: inherit;');
    return true;
  } catch (err: any) {
    console.error('[Supabase Test Connection Exception]:', err?.message || err);
    return false;
  }
}

/**
 * Diagnostic function that performs a SELECT count(*) from 'pig_records' table
 * and logs the result to verify database connection and API keys.
 */
export async function verifySupabaseConnection(): Promise<{ success: boolean; count: number | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    const errorMsg = 'Supabase client is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
    console.error('[Supabase Diagnostic Error]', errorMsg);
    return { success: false, count: null, error: errorMsg };
  }

  try {
    const startMs = performance.now();
    const { count, error } = await client
      .from('pig_records')
      .select('*', { count: 'exact', head: true });

    const durationMs = Math.round(performance.now() - startMs);

    if (error) {
      console.error(`[Supabase Diagnostic Failed] (${durationMs}ms):`, error.message);
      return { success: false, count: null, error: error.message };
    }

    const recordCount = count ?? 0;
    console.log(`%c[Supabase Connection Verified]%c SELECT count(*) from 'pig_records' = ${recordCount} (${durationMs}ms)`, 'color: #10b981; font-weight: bold;', 'color: inherit;');
    return { success: true, count: recordCount, error: null };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error('[Supabase Diagnostic Exception]:', errorMsg);
    return { success: false, count: null, error: errorMsg };
  }
}

/**
 * Realtime listener for live GIS & Swine heatmap synchronization using Supabase Realtime Channels
 */
export function subscribeToPigRecordUpdates(onUpdate: (pigs: PigRecord[]) => void) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel('public:pig_records_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pig_records' },
      async () => {
        const latestPigs = await fetchPigsFromSupabase();
        if (latestPigs && latestPigs.length >= 0) {
          onUpdate(latestPigs);
        }
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
