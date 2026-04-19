/**
 * Simple in-memory store for tracking pending OAuth sessions
 * Maps accountId → { initiatedAt, expiresAt }
 */

const pendingOAuthSessions = new Map();

const OAUTH_EXPIRY_TIME = 120 * 1000; // 2 minutes

export const recordOAuthInitiation = (accountId) => {
  const now = Date.now();
  pendingOAuthSessions.set(accountId, {
    initiatedAt: now,
    expiresAt: now + OAUTH_EXPIRY_TIME
  });
  
  console.log(`📋 OAuth session recorded for account ${accountId}`);
  console.log(`   Expires at: ${new Date(now + OAUTH_EXPIRY_TIME).toISOString()}`);
  console.log(`   Active sessions: ${pendingOAuthSessions.size}`);
  
  // Clean up expired sessions
  cleanupExpiredSessions();
};

export const getRecentOAuthSession = () => {
  const now = Date.now();
  
  // Find the most recently initiated OAuth session that hasn't expired
  let mostRecent = null;
  let mostRecentTime = 0;
  
  console.log(`🔍 Looking for pending OAuth sessions (${pendingOAuthSessions.size} active)`);
  
  for (const [accountId, session] of pendingOAuthSessions.entries()) {
    console.log(`   - Account ${accountId}: expires at ${new Date(session.expiresAt).toISOString()}`);
    if (session.expiresAt > now && session.initiatedAt > mostRecentTime) {
      mostRecent = accountId;
      mostRecentTime = session.initiatedAt;
    }
  }
  
  if (mostRecent) {
    console.log(`✅ Found pending OAuth for account ${mostRecent}`);
    // Remove the session after retrieval (one-time use)
    pendingOAuthSessions.delete(mostRecent);
    console.log(`   Removed from pending sessions`);
  } else {
    console.log(`❌ No valid pending OAuth session found`);
  }
  
  return mostRecent;
};

export const cleanupExpiredSessions = () => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [accountId, session] of pendingOAuthSessions.entries()) {
    if (session.expiresAt <= now) {
      pendingOAuthSessions.delete(accountId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired OAuth sessions`);
  }
};

export default {
  recordOAuthInitiation,
  getRecentOAuthSession,
  cleanupExpiredSessions
};
