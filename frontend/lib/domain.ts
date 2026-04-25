/**
 * Domain Detection & Routing
 * Separates admin.domain and app.domain traffic
 */

export type AppDomain = 'admin' | 'app';

/**
 * Get current domain type
 * admin.domain → 'admin'
 * app.domain → 'app'
 * localhost → 'app' (for dev, default to app)
 */
export const getCurrentDomain = (): AppDomain => {
  if (typeof window === 'undefined') return 'app'; // SSR safety
  
  const host = window.location.hostname;
  
  // Check for admin subdomain
  if (host.startsWith('admin.')) {
    return 'admin';
  }
  
  // Check for app subdomain
  if (host.startsWith('app.')) {
    return 'app';
  }
  
  // Localhost defaults to app (for development)
  if (host === 'localhost' || host.startsWith('127.')) {
    // Check URL param for override: ?domain=admin
    const params = new URLSearchParams(window.location.search);
    const override = params.get('domain');
    if (override === 'admin') return 'admin';
    return 'app';
  }
  
  // Default to app for any other domain
  return 'app';
};

/**
 * Check if current domain is admin
 */
export const isAdminDomain = (): boolean => {
  return getCurrentDomain() === 'admin';
};

/**
 * Check if current domain is app (client)
 */
export const isAppDomain = (): boolean => {
  return getCurrentDomain() === 'app';
};

/**
 * Get domain display name
 */
export const getDomainName = (): string => {
  const domain = getCurrentDomain();
  return domain === 'admin' ? 'Admin Dashboard' : 'WhatsApp Chat';
};

/**
 * Redirect to other domain
 */
export const redirectToDomain = (targetDomain: AppDomain, path: string = '/') => {
  if (typeof window === 'undefined') return;
  
  const host = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : '';
  const protocol = window.location.protocol;
  
  // Replace subdomain
  let newHost = host;
  if (host.startsWith('admin.')) {
    newHost = host.replace('admin.', targetDomain === 'admin' ? 'admin.' : 'app.');
  } else if (host.startsWith('app.')) {
    newHost = host.replace('app.', targetDomain === 'app' ? 'app.' : 'admin.');
  } else if (host === 'localhost' || host.startsWith('127.')) {
    // For localhost, just change the search param
    window.location.href = `${protocol}//${host}${port}${path}?domain=${targetDomain}`;
    return;
  }
  
  window.location.href = `${protocol}//${newHost}${port}${path}`;
};

/**
 * Get API headers with domain info
 */
export const getDomainHeaders = () => {
  const domain = getCurrentDomain();
  return {
    'X-App-Domain': domain,
  };
};
