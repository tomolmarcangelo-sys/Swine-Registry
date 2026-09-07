// Standalone Supabase Backend Service - Direct PostgREST & PostGIS Spatial Operations
import { getSupabaseClient, testDatabaseConnection, fetchPigsFromSupabase } from './supabaseClient';
import { supabase } from './supabase';

export interface NearbyRecord {
  id: string;
  record_id: string;
  owner_name: string;
  barangay: string;
  head_count: number;
  health_status: string;
  biosecurity_level: number;
  is_vaccinated: boolean;
  lat: number;
  lng: number;
  distance_meters: number;
}

/**
 * Haversine distance calculation in meters between two geographical coordinates
 */
function calculateHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check primary Supabase PostgreSQL database health directly
 */
export async function checkBackendHealth(): Promise<{ healthy: boolean; details?: any }> {
  try {
    const isConnected = await testDatabaseConnection();
    if (isConnected) {
      return { healthy: true, details: 'Supabase PostgreSQL Standalone Connected' };
    }
    return { healthy: false, details: 'Supabase connection test failed' };
  } catch (err: any) {
    return { healthy: false, details: err?.message || 'Supabase connectivity error' };
  }
}

/**
 * Fetch nearby pigs directly via PostGIS RPC function or client-side Haversine parsing
 */
export async function fetchNearbyPigsFromApi(
  lat: number,
  lng: number,
  radiusMeters: number = 1500
): Promise<NearbyRecord[]> {
  const client = getSupabaseClient() || supabase;

  // 1. Try PostGIS RPC function first if available
  try {
    const { data: rpcData, error: rpcError } = await client.rpc('get_nearby_pigs', {
      center_lat: lat,
      center_lng: lng,
      radius_meters: radiusMeters,
    });

    if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
      return rpcData.map((row: any) => ({
        id: String(row.id || ''),
        record_id: String(row.record_id || row.ear_tag || row.id || ''),
        owner_name: String(row.owner_name || 'Unknown'),
        barangay: String(row.barangay || ''),
        head_count: Number(row.head_count) || 1,
        health_status: String(row.health_status || 'Healthy'),
        biosecurity_level: Number(row.biosecurity_level) || 1,
        is_vaccinated: Boolean(row.is_vaccinated || row.vaccinated),
        lat: Number(row.lat) || 0,
        lng: Number(row.lng) || 0,
        distance_meters: Math.round(Number(row.distance_meters) || 0)
      }));
    }
  } catch (rpcErr) {
    console.warn('[Supabase Spatial RPC Notice] RPC get_nearby_pigs not present, using direct PostgREST client parsing:', rpcErr);
  }

  // 2. Direct PostgREST Table Query with Client Spatial Distance Calculation
  try {
    const pigs = await fetchPigsFromSupabase();
    if (!pigs || pigs.length === 0) return [];

    return pigs
      .map((pig) => {
        const dist = calculateHaversineMeters(lat, lng, pig.lat, pig.lng);
        let bioLevel = 1;
        if (typeof pig.biosecurity === 'number') {
          bioLevel = pig.biosecurity;
        } else if (pig.biosecurity && typeof pig.biosecurity === 'object') {
          bioLevel = Math.max(1, Object.values(pig.biosecurity).filter(Boolean).length);
        }

        return {
          id: pig.id,
          record_id: pig.earTag || pig.id,
          owner_name: pig.ownerName || 'Unknown',
          barangay: pig.barangay || '',
          head_count: 1,
          health_status: pig.asfCleared ? 'Healthy' : 'Under Monitoring',
          biosecurity_level: bioLevel,
          is_vaccinated: pig.vaccinated,
          lat: pig.lat,
          lng: pig.lng,
          distance_meters: Math.round(dist)
        };
      })
      .filter((rec: NearbyRecord) => rec.lat !== 0 && rec.lng !== 0 && rec.distance_meters <= radiusMeters)
      .sort((a: NearbyRecord, b: NearbyRecord) => a.distance_meters - b.distance_meters);
  } catch (fallbackErr) {
    console.warn('[Supabase Direct Query Exception]:', fallbackErr);
    return [];
  }
}
