/**
 * Authenticated API Helper
 * Automatically includes JWT token and handles 401 errors
 */

import { authService } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";

export interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
  cacheTtlMs?: number;
  forceRefresh?: boolean;
}

const GET_CACHE_TTL_MS = 15_000;
const getJsonCache = new Map<string, { expiresAt: number; value: unknown }>();
const inFlightGetRequests = new Map<string, Promise<unknown>>();

export function clearApiGetCache() {
  getJsonCache.clear();
  inFlightGetRequests.clear();
}

function cacheKey(endpoint: string, options: FetchOptions) {
  const token = options.skipAuth ? 'public' : authService.getToken() || 'anonymous';
  return `${token}:${endpoint}`;
}

/**
 * Make authenticated API request with JWT token
 * Automatically handles 401 errors by redirecting to login
 */
export async function fetchAPI(
  endpoint: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipAuth = false, cacheTtlMs: _cacheTtlMs, forceRefresh: _forceRefresh, ...fetchOptions } = options;

  const headers: HeadersInit = {
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

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

  let finalEndpoint = endpoint;

  // Auto-inject projectId from URL path if present and not already in endpoint
  if (typeof window !== 'undefined') {
    const match = window.location.pathname.match(/\/projects\/(proj_[a-zA-Z0-9_]+)/);
    if (match && match[1]) {
      const projectId = match[1];
      if (!finalEndpoint.includes('projectId=')) {
        finalEndpoint += finalEndpoint.includes('?') ? `&projectId=${projectId}` : `?projectId=${projectId}`;
      }
    }
  }

  const url = finalEndpoint.startsWith('http') ? finalEndpoint : `${API_URL}${finalEndpoint}`;

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

  // Handle 400 - Bad Request
  if (response.status === 400) {
    console.error('❌ 400 Bad Request');
    try {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Bad Request');
    } catch (e) {
      throw new Error('Bad Request');
    }
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
  const method = String(options.method || 'GET').toUpperCase();
  const shouldCache = method === 'GET' && options.cacheTtlMs !== 0 && !options.forceRefresh;

  if (shouldCache) {
    const key = cacheKey(endpoint, options);
    const cached = getJsonCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    const inFlight = inFlightGetRequests.get(key);
    if (inFlight) {
      return inFlight as Promise<T>;
    }

    const request = fetchAPI(endpoint, options)
      .then((response) => response.json())
      .then((value) => {
        getJsonCache.set(key, {
          value,
          expiresAt: Date.now() + (options.cacheTtlMs ?? GET_CACHE_TTL_MS),
        });
        return value;
      })
      .finally(() => {
        inFlightGetRequests.delete(key);
      });

    inFlightGetRequests.set(key, request);
    return request as Promise<T>;
  }

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
  clearApiGetCache();
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
  clearApiGetCache();
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
  clearApiGetCache();
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
  clearApiGetCache();
  return fetchJSON(endpoint, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}
