import { PigRecord, User, AuditLogItem } from '../types';
import { validatePigByPurpose } from '../config/systemLogic';
import {
  fetchPigsFromSupabase,
  savePigToSupabase,
  batchSavePigsToSupabase,
  deletePigFromSupabase,
  fetchUsersFromSupabase,
  saveUserToSupabase,
  batchSaveUsersToSupabase,
  deleteUserFromSupabase,
} from './supabaseClient';

// Base API URL configuration
const API_BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:3000';

/**
 * Validates a pig record against purpose rules before submission
 */
export function validateClientPigRecord(pig: Partial<PigRecord>) {
  return validatePigByPurpose(pig);
}

/**
 * Fetch all pigs via server API (/api/swine) with fallback
 */
export async function fetchPigsFromApi(barangay?: string, search?: string): Promise<PigRecord[]> {
  try {
    const params = new URLSearchParams();
    if (barangay) params.set('barangay', barangay);
    if (search) params.set('search', search);

    const url = `${API_BASE_URL}/api/swine${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });

    if (!res.ok) {
      throw new Error(`Server API HTTP ${res.status}`);
    }

    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data;
    }
    throw new Error('Invalid JSON structure from /api/swine');
  } catch (err) {
    console.warn('[ApiClient] /api/swine fetch warning, falling back to direct client:', err);
    return fetchPigsFromSupabase();
  }
}

/**
 * Save single pig via server API (/api/swine) with fallback
 */
export async function savePigToApi(pig: PigRecord): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/swine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(pig),
    });

    if (res.ok) {
      return true;
    }
    throw new Error(`Server API HTTP ${res.status}`);
  } catch (err) {
    console.warn('[ApiClient] /api/swine POST warning, falling back to direct client:', err);
    await savePigToSupabase(pig);
    return true;
  }
}

/**
 * Batch save pigs via server API (/api/swine/batch) with fallback
 */
export async function batchSavePigsToApi(pigs: PigRecord[]): Promise<number> {
  if (pigs.length === 0) return 0;
  try {
    const res = await fetch(`${API_BASE_URL}/api/swine/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(pigs),
    });

    if (res.ok) {
      const json = await res.json();
      return json.count || pigs.length;
    }
    throw new Error(`Server API HTTP ${res.status}`);
  } catch (err) {
    console.warn('[ApiClient] /api/swine/batch warning, falling back to direct client:', err);
    return batchSavePigsToSupabase(pigs);
  }
}

/**
 * Delete pig via server API (/api/swine/:id) with fallback
 */
export async function deletePigFromApi(pigId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/swine/${encodeURIComponent(pigId)}`, {
      method: 'DELETE',
    });

    if (res.ok) return true;
    throw new Error(`Server API HTTP ${res.status}`);
  } catch (err) {
    console.warn('[ApiClient] /api/swine DELETE warning, falling back to direct client:', err);
    await deletePigFromSupabase(pigId);
    return true;
  }
}

/**
 * Fetch all users via server API (/api/users) with fallback
 */
export async function fetchUsersFromApi(): Promise<User[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) throw new Error(`Server API HTTP ${res.status}`);

    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data;
    }
    throw new Error('Invalid JSON response from /api/users');
  } catch (err) {
    console.warn('[ApiClient] /api/users fetch warning, falling back to direct client:', err);
    return fetchUsersFromSupabase();
  }
}

/**
 * Save single user via server API (/api/users) with fallback
 */
export async function saveUserToApi(user: User): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(user),
    });

    if (res.ok) return true;
    throw new Error(`Server API HTTP ${res.status}`);
  } catch (err) {
    console.warn('[ApiClient] /api/users POST warning, falling back to direct client:', err);
    await saveUserToSupabase(user);
    return true;
  }
}

/**
 * Delete user via server API (/api/users/:username) with fallback
 */
export async function deleteUserFromApi(username: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(username)}`, {
      method: 'DELETE',
    });

    if (res.ok) return true;
    throw new Error(`Server API HTTP ${res.status}`);
  } catch (err) {
    console.warn('[ApiClient] /api/users DELETE warning, falling back to direct client:', err);
    await deleteUserFromSupabase(username);
    return true;
  }
}

/**
 * Check server database health status (/api/db-check)
 */
export async function checkServerApiHealth(): Promise<{ status: string; prisma?: any; supabase?: any }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/db-check`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      return res.json();
    }
    return { status: 'offline' };
  } catch {
    return { status: 'offline' };
  }
}
