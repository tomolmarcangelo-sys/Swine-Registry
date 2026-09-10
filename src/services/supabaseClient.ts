import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { PigRecord, User, AuditLogItem } from '../types';

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
    photo_url: pig.photoUrl || null,
    health_status: pig.healthStatus || (pig.isDeceased ? 'Deceased' : (pig.asfCleared ? 'Healthy' : 'Suspect')),
    is_deceased: pig.isDeceased ?? false,
    mortality_date: pig.mortalityDate || null,
    mortality_reason: pig.mortalityReason || null,
    head_count: pig.headCount || 1,
    biosecurity_level: pig.biosecurityLevel || (pig.biosecurity ? Object.values(pig.biosecurity).filter(Boolean).length : 1),
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

  const isDeceased = Boolean(row.is_deceased ?? row.isDeceased ?? (row.health_status === 'Deceased'));
  const healthStatus = row.health_status ?? row.healthStatus ?? (isDeceased ? 'Deceased' : (row.asf_cleared ? 'Healthy' : 'Suspect'));

  return {
    id: String(row.id),
    earTag: row.ear_tag ?? row.earTag ?? '',
    ownerName: row.owner_name ?? row.ownerName ?? '',
    contact: row.contact ?? '',
    address: row.address ?? '',
    barangay: row.barangay ?? 'Poblacion 1',
    breed: row.breed ?? 'Native / Native-cross',
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
    biosecurity: row.biosecurity,
    photoUrl: row.photo_url ?? row.photoUrl ?? '',
    healthStatus,
    isDeceased,
    mortalityDate: row.mortality_date ?? row.mortalityDate,
    mortalityReason: row.mortality_reason ?? row.mortalityReason,
    headCount: Number(row.head_count ?? row.headCount ?? 1),
    biosecurityLevel: Number(row.biosecurity_level ?? row.biosecurityLevel ?? 1)
  };
}

export function userToRow(user: User) {
  return {
    id: user.id,
    username: user.username.toLowerCase(),
    password: user.password,
    password_hash: user.password,
    role: user.role,
    full_name: user.fullName,
    barangay: user.barangay,
    assigned_barangay: user.barangay,
    is_active: user.isActive !== undefined ? user.isActive : (user.is_active !== undefined ? user.is_active : true),
    email: user.email,
    phone: user.phone,
    avatar_url: user.avatarUrl,
    updated_at: new Date().toISOString()
  };
}

export function rowToUser(row: any): User {
  const isUserActive = row.is_active !== undefined ? Boolean(row.is_active) : (row.isActive !== undefined ? Boolean(row.isActive) : true);
  return {
    id: row.id ? String(row.id) : undefined,
    username: row.username,
    password: row.password_hash || row.password || '',
    role: row.role || 'user',
    fullName: row.full_name || row.fullName || row.username,
    barangay: row.assigned_barangay || row.barangay || null,
    assigned_barangay: row.assigned_barangay || row.barangay || null,
    isActive: isUserActive,
    is_active: isUserActive,
    email: row.email,
    phone: row.phone,
    avatarUrl: row.avatar_url || row.avatarUrl,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt
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
  } catch (err: any) {
    console.warn('deletePigFromSupabase notice:', err?.message || err);
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
    const response = await client
      .from('pig_records')
      .select('id', { count: 'exact', head: true });

    console.log('[Supabase Verbose Response]:', response);

    if (response.error) {
      if (response.error.code === 'PGRST205') {
        console.error('[Supabase Test Connection Failed]: Missing table (PGRST205). Ensure schema is correctly created in Supabase.');
      } else if (
        response.error.code === 'PGRST301' || 
        response.error.code === '401' || 
        response.error.message?.includes('JWT') || 
        response.error.message?.includes('auth')
      ) {
        console.error('[Supabase Test Connection Failed]: Authentication failure. Verify your VITE_SUPABASE_ANON_KEY.');
      } else {
        console.error('[Supabase Test Connection Failed]:', response.error.message, response.error);
      }
      return false;
    }

    console.log(`%c[Supabase Backend Connected]%c Successfully verified pig_records table (${response.count ?? 0} records)`, 'color: #10b981; font-weight: bold;', 'color: inherit;');
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

  const channelTopic = 'public:pig_records_changes';

  // Remove any existing channel with the same topic to avoid "cannot add callbacks after subscribe" error
  const existingChannel = client.getChannels().find(c => c.topic === `realtime:${channelTopic}` || c.topic === channelTopic);
  if (existingChannel) {
    client.removeChannel(existingChannel);
  }

  const channel = client
    .channel(channelTopic)
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

/**
 * Realtime listener for live system audit logs synchronization using Supabase Realtime Channels
 */
export function subscribeToAuditLogUpdates(onInsert: (log: AuditLogItem) => void) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channelTopic = 'public:audit_logs_changes';

  // Remove any existing channel with the same topic to avoid "cannot add callbacks after subscribe" error
  const existingChannel = client.getChannels().find(c => c.topic === `realtime:${channelTopic}` || c.topic === channelTopic);
  if (existingChannel) {
    client.removeChannel(existingChannel);
  }

  const channel = client
    .channel(channelTopic)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'audit_logs' },
      (payload) => {
        const row = payload.new;
        const mappedLog: AuditLogItem = {
          id: row.id,
          timestamp: row.timestamp || new Date().toISOString(),
          username: row.username,
          userFullName: row.user_full_name || 'System User',
          role: row.role || 'user',
          action: row.action,
          details: row.details || '',
          barangay: row.barangay || null,
          entityType: row.entity_type || 'system',
          ipAddress: row.ip_address || '127.0.0.1'
        };
        onInsert(mappedLog);
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

/**
 * Uploads an image file to Supabase storage
 */
export async function uploadImageToSupabase(file: File, bucket: string = 'registry_images'): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('[uploadImageToSupabase] Supabase client unavailable.');
    return null;
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await client.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('[uploadImageToSupabase] Upload failed:', error.message);
      return null;
    }

    const { data: publicUrlData } = client.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('[uploadImageToSupabase] Upload exception:', err);
    return null;
  }
}

export async function fetchNearbyPigsRpc(lat: number, lng: number, radiusMeters: number = 1500): Promise<{ data: any, error: any }> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: new Error('Supabase client unavailable') };

  try {
    const { data, error } = await client.rpc('get_nearby_pigs', {
      center_lat: lat,
      center_lng: lng,
      radius_meters: radiusMeters,
    });
    return { data, error };
  } catch (err) {
    console.warn('[Supabase Spatial RPC Error]', err);
    return { data: null, error: err };
  }
}

export async function fetchUsersFromSupabase(): Promise<User[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from('users').select('*').order('full_name', { ascending: true });
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

export async function updateUserInSupabase(user: User): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const row = userToRow(user);
    const { error } = await client
      .from('users')
      .update(row)
      .eq('username', user.username.toLowerCase());
    if (error) throw error;
  } catch (err: any) {
    console.warn('updateUserInSupabase notice:', err?.message || err);
  }
}

export async function deleteUserFromSupabase(username: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const { error } = await client
      .from('users')
      .delete()
      .eq('username', username.toLowerCase());
    if (error) throw error;
  } catch (err: any) {
    console.warn('deleteUserFromSupabase notice:', err?.message || err);
  }
}

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
