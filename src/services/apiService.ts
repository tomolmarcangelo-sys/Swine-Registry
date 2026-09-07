/**
 * Secure API Service / Fetch Wrapper for Hinunangan Swine GIS
 * 
 * Includes the Supabase Service Role Key (or public anon key) in headers
 * to ensure secure, authenticated communication between the application,
 * backend API service, and Supabase database endpoints.
 */

// Retrieve Environment Variables safely across Vite client and Node server contexts
export function getSupabaseApiKey(): string {
  // Check Vite client-side environment variables first
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
      return import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;
    }
    if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
      return import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    }
  }

  // Check Node.js process environment variables if running server-side
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
    if (process.env.SUPABASE_ANON_KEY) {
      return process.env.SUPABASE_ANON_KEY;
    }
    if (process.env.VITE_SUPABASE_ANON_KEY) {
      return process.env.VITE_SUPABASE_ANON_KEY;
    }
  }

  return '';
}

export function getApiBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BACKEND_URL) {
    return (import.meta.env.VITE_API_BACKEND_URL as string).replace(/\/$/, '');
  }
  if (typeof process !== 'undefined' && process.env?.VITE_API_BACKEND_URL) {
    return process.env.VITE_API_BACKEND_URL.replace(/\/$/, '');
  }
  return '';
}

export interface ApiFetchOptions extends RequestInit {
  useServiceRoleKey?: boolean;
  customHeaders?: Record<string, string>;
}

/**
 * Custom fetch wrapper that automatically attaches Supabase authentication,
 * API key headers, and Content-Type headers for secure API requests.
 */
export async function apiFetch<T = any>(
  endpointOrUrl: string,
  options: ApiFetchOptions = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  const apiKey = getSupabaseApiKey();
  const baseUrl = getApiBaseUrl();

  // Determine full target URL
  let fullUrl = endpointOrUrl;
  if (!endpointOrUrl.startsWith('http://') && !endpointOrUrl.startsWith('https://')) {
    const formattedEndpoint = endpointOrUrl.startsWith('/') ? endpointOrUrl : `/${endpointOrUrl}`;
    fullUrl = baseUrl ? `${baseUrl}${formattedEndpoint}` : formattedEndpoint;
  }

  // Prepare default headers including Supabase auth & key headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey ? { apikey: apiKey } : {}),
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    ...(apiKey ? { 'x-supabase-auth': apiKey } : {}),
    ...(options.customHeaders || {}),
  };

  // Merge default 5000ms AbortSignal timeout if no custom signal provided
  let signal = options.signal;
  if (!signal && typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    signal = AbortSignal.timeout(5000);
  }

  // Merge headers into request configuration
  const config: RequestInit = {
    ...options,
    signal,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string> || {}),
    },
  };

  try {
    const response = await fetch(fullUrl, config);
    const contentType = response.headers.get('content-type');

    let parsedData: any = null;
    if (contentType && contentType.includes('application/json')) {
      parsedData = await response.json();
    } else {
      parsedData = await response.text();
    }

    if (!response.ok) {
      const errorMessage = typeof parsedData === 'object' && parsedData?.error
        ? parsedData.error
        : `Request failed with status ${response.status}: ${response.statusText}`;
      
      return { data: null, error: errorMessage, status: response.status };
    }

    return { data: parsedData as T, error: null, status: response.status };
  } catch (err: any) {
    console.warn(`[apiService] Network notice requesting ${fullUrl}:`, err?.message || err);
    return {
      data: null,
      error: err?.message || 'Network request failed',
      status: 0,
    };
  }
}

/**
 * Helper methods for HTTP verbs
 */
export const apiService = {
  get: <T = any>(endpoint: string, options?: ApiFetchOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body: any, options?: ApiFetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T = any>(endpoint: string, body: any, options?: ApiFetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T = any>(endpoint: string, options?: ApiFetchOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),

  /**
   * Dedicated Health Check against the backend API
   */
  checkHealth: async () => {
    return apiFetch('/health', { method: 'GET' });
  },

  /**
   * Spatial Proximity Search Endpoint
   */
  fetchNearbyPigs: async (lat: number, lng: number, radiusMeters = 1500) => {
    return apiFetch(`/api/spatial/nearby?lat=${lat}&lng=${lng}&radius=${radiusMeters}`, {
      method: 'GET',
    });
  },

  /**
   * Barangay Biosecurity Summary Endpoint
   */
  getBarangaySummary: async () => {
    return apiFetch('/api/spatial/barangay-summary', { method: 'GET' });
  },
};

export default apiService;
