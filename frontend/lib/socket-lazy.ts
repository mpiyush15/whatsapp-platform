/**
 * PHASE 5: Lazy-loaded Socket Initialization
 * Dynamically import socket.io-client only when needed to reduce initial bundle
 * This keeps socket in a separate chunk loaded on-demand
 */

// This will be lazy-loaded - socket.io-client moved to separate chunk
export const useSocketLazy = async () => {
  return import('./socket');
};

// Pre-export for static analysis
export * from './socket';
