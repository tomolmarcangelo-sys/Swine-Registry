// Backend API Service - Hinunangan Swine GIS Render Connection

const API_BASE_URL = (import.meta.env.VITE_API_BACKEND_URL as string) || '';

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

export async function checkBackendHealth(): Promise<{ healthy: boolean; details?: any }> {
  if (!API_BASE_URL) {
    return { healthy: false, details: 'VITE_API_BACKEND_URL not set' };
  }
  try {
    const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { healthy: true, details: data };
  } catch (err: any) {
    return { healthy: false, details: err.message };
  }
}

export async function fetchNearbyPigsFromApi(
  lat: number,
  lng: number,
  radiusMeters: number = 1500
): Promise<NearbyRecord[]> {
  if (!API_BASE_URL) return [];
  try {
    const res = await fetch(
      `${API_BASE_URL.replace(/\/$/, '')}/api/spatial/nearby?lat=${lat}&lng=${lng}&radius=${radiusMeters}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('[BackendApi] fetchNearbyPigs error:', err);
    return [];
  }
}
