/**
 * Consistent API URL configuration for all frontend pages
 * Use this instead of hardcoding fetch URLs
 */

// Base API URL from environment (already includes /api)
const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";

/**
 * Build API endpoint URL
 * @param endpoint - The endpoint path (e.g., '/broadcasts', '/contacts')
 * @returns Full API URL
 * 
 * Examples:
 *  getApiUrl('/broadcasts') → http://localhost:5050/api/broadcasts
 *  getApiUrl('/contacts') → http://localhost:5050/api/contacts
 */
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${BASE_API_URL}${cleanEndpoint}`;
}

/**
 * Make authenticated API fetch request
 * Automatically includes Authorization header with JWT token
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = getApiUrl(endpoint);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 - redirect to login
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      window.location.href = '/login';
    }
  }

  return response;
}

/**
 * Common API helper functions
 */
export async function apiGet(endpoint: string) {
  const response = await apiFetch(endpoint, { method: 'GET' });
  return response.json();
}

export async function apiPost(endpoint: string, data?: any) {
  const response = await apiFetch(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  return response.json();
}

export async function apiPut(endpoint: string, data?: any) {
  const response = await apiFetch(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  return response.json();
}

export async function apiDelete(endpoint: string) {
  const response = await apiFetch(endpoint, { method: 'DELETE' });
  return response.json();
}

export async function apiPatch(endpoint: string, data?: any) {
  const response = await apiFetch(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
  return response.json();
}
