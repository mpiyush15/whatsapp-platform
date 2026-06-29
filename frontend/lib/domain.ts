/**
 * Domain Detection & Routing
 * Separates admin.domain and app.domain traffic
 */

export type AppDomain = 'admin' | 'app' | 'support' | 'public';

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
  if (host.startsWith('admin.') || host === '187.127.147.166') {
    return 'admin';
  }
  
  // Check for app subdomain
  if (host.startsWith('app.')) {
    return 'app';
  }

  // Check for support subdomain
  if (host.startsWith('support.')) {
    return 'support';
  }
  
  // Localhost defaults to app (for development)
  if (host === 'localhost' || host.startsWith('127.')) {
    // Check URL param for override: ?domain=admin
    const params = new URLSearchParams(window.location.search);
    const override = params.get('domain');
    if (override === 'admin') return 'admin';
    if (override === 'support') return 'support';
    return 'app';
  }

  // Bare domain (e.g. replysys.com — no subdomain) = public marketing site
  if (!host.includes('.') || host.split('.').length === 2) {
    return 'public';
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
 * Check if current domain is support
 */
export const isSupportDomain = (): boolean => {
  return getCurrentDomain() === 'support';
};

/**
 * Check if current domain is the public marketing site (no subdomain)
 */
export const isPublicDomain = (): boolean => {
  return getCurrentDomain() === 'public';
};

/**
 * Get domain display name
 */
export const getDomainName = (): string => {
  const domain = getCurrentDomain();
  if (domain === 'admin') return 'Admin Dashboard';
  if (domain === 'support') return 'Support Dashboard';
  if (domain === 'public') return 'Public Site';
  return 'WhatsApp Chat';
};

/**
 * Redirect to other domain
 */
export const redirectToDomain = (targetDomain: AppDomain, path: string = '/') => {
  if (typeof window === 'undefined') return;
  
  const host = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : '';
  const protocol = window.location.protocol;

  if (targetDomain === 'public') {
    window.location.href = `${protocol}//${host}${port}${path}`;
    return;
  }
  
  // Replace subdomain
  let newHost = host;
  if (host.startsWith('admin.') || host.startsWith('app.') || host.startsWith('support.')) {
    newHost = host.replace(/^(admin|app|support)\./, `${targetDomain}.`);
  } else if (!host.includes('.') || host.split('.').length === 2) {
    // Bare domain (e.g. replysys.com) — prepend the target subdomain
    newHost = `${targetDomain}.${host}`;
  } else if (host === 'localhost' || host.startsWith('127.')) {
    // For localhost, just change the search param
    const url = new URL(`${protocol}//${host}${port}${path}`);
    url.searchParams.set('domain', targetDomain);
    window.location.href = url.toString();
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
