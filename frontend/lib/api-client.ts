/**
 * Authenticated API Helper
 * Automatically includes JWT token and handles 401 errors
 */

import { authService } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";

export interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Make authenticated API request with JWT token
 * Automatically handles 401 errors by redirecting to login
 */
export async function fetchAPI(
  endpoint: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipAuth = false, ...fetchOptions } = options;

  const headers: HeadersInit = {};

  // Add JWT token if not skipped
  if (!skipAuth) {
    const token = authService.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  // Only set JSON content-type when there is a request body
  if (fetchOptions.body !== undefined && fetchOptions.body !== null) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // Handle 401 - Token expired or invalid
  if (response.status === 401) {
    console.warn('⚠️  401 Unauthorized - Logging out');
    await authService.logout();
    
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    
    throw new Error('Session expired. Please login again.');
  }

  // Handle 403 - Forbidden
  if (response.status === 403) {
    console.error('❌ 403 Forbidden');
    throw new Error('You do not have permission to access this resource.');
  }

  // Handle 404
  if (response.status === 404) {
    console.error('❌ 404 Not Found');
    throw new Error('Resource not found.');
  }

  // Handle 5xx errors
  if (response.status >= 500) {
    console.error('❌ Server Error:', response.status);
    throw new Error('Server error. Please try again later.');
  }

  return response;
}

/**
 * Make authenticated API request and parse JSON response
 */
export async function fetchJSON<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchAPI(endpoint, options);
  return response.json();
}

/**
 * GET request
 */
export async function apiGet<T = any>(endpoint: string, options?: FetchOptions): Promise<T> {
  return fetchJSON(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request
 */
export async function apiPost<T = any>(
  endpoint: string,
  data?: any,
  options?: FetchOptions
): Promise<T> {
  return fetchJSON(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request
 */
export async function apiPut<T = any>(
  endpoint: string,
  data?: any,
  options?: FetchOptions
): Promise<T> {
  return fetchJSON(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request
 */
export async function apiDelete<T = any>(endpoint: string, options?: FetchOptions): Promise<T> {
  return fetchJSON(endpoint, { ...options, method: 'DELETE' });
}

/**
 * PATCH request
 */
export async function apiPatch<T = any>(
  endpoint: string,
  data?: any,
  options?: FetchOptions
): Promise<T> {
  return fetchJSON(endpoint, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}
