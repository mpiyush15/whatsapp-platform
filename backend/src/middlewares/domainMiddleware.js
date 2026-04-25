/**
 * Domain Validation Middleware
 * Ensures requests come from correct domain
 * Enforces project isolation
 */

import logger from '../utils/logger.js';

/**
 * Get domain type from request
 * admin.domain → 'admin'
 * app.domain → 'app'
 */
export const getDomainFromRequest = (req) => {
  // Check X-App-Domain header (sent by frontend)
  const headerDomain = req.headers['x-app-domain'];
  if (headerDomain && ['admin', 'app'].includes(headerDomain)) {
    return headerDomain;
  }

  // Check origin header
  const origin = req.headers.origin || req.headers.referer || '';
  if (origin.includes('admin.')) return 'admin';
  if (origin.includes('app.')) return 'app';

  // Check Host header
  const host = req.hostname || '';
  if (host.startsWith('admin.')) return 'admin';
  if (host.startsWith('app.')) return 'app';

  // Default to 'app' for development (localhost)
  return 'app';
};

/**
 * Middleware to validate domain access
 * Ensures:
 * - admin.domain can access admin endpoints only
 * - app.domain can access client endpoints only
 * - Project isolation enforced
 */
export const validateDomain = (allowedDomains = ['admin', 'app']) => {
  return (req, res, next) => {
    const domain = getDomainFromRequest(req);
    
    // Store in request for later use
    req.domain = domain;

    // Check if domain is allowed for this route
    if (!allowedDomains.includes(domain)) {
      logger.warn(`🚫 Domain validation failed: ${domain} not in [${allowedDomains.join(', ')}]`);
      return res.status(403).json({
        success: false,
        message: 'Access denied from this domain',
        error: 'DOMAIN_NOT_ALLOWED',
        domain
      });
    }

    logger.debug(`✅ Domain validated: ${domain}`);
    next();
  };
};

/**
 * Admin-only route middleware
 * Only allow admin.domain
 */
export const requireAdminDomain = (req, res, next) => {
  const domain = getDomainFromRequest(req);
  
  if (domain !== 'admin') {
    logger.warn(`🚫 Admin endpoint accessed from ${domain} domain`);
    return res.status(403).json({
      success: false,
      message: 'This endpoint is only available from admin.domain',
      error: 'ADMIN_DOMAIN_REQUIRED'
    });
  }

  req.domain = domain;
  next();
};

/**
 * App-only route middleware
 * Only allow app.domain
 */
export const requireAppDomain = (req, res, next) => {
  const domain = getDomainFromRequest(req);
  
  if (domain !== 'app') {
    logger.warn(`🚫 App endpoint accessed from ${domain} domain`);
    return res.status(403).json({
      success: false,
      message: 'This endpoint is only available from app.domain',
      error: 'APP_DOMAIN_REQUIRED'
    });
  }

  req.domain = domain;
  next();
};

/**
 * Enforce project isolation
 * Ensures user can only access their own projectId
 * Works with both admin and app domains
 */
export const enforceProjectIsolation = (req, res, next) => {
  const { projectId } = req.params;
  const userProjectId = req.account?.defaultProjectId || req.user?.projectId;

  if (!projectId || !userProjectId) {
    logger.warn('⚠️ Missing projectId for isolation check');
    return next(); // Let endpoint handle missing fields
  }

  if (projectId !== userProjectId && req.domain === 'app') {
    logger.warn(`🚫 Project isolation violation: user trying to access ${projectId} but assigned to ${userProjectId}`);
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this project',
      error: 'PROJECT_ACCESS_DENIED',
      projectId
    });
  }

  next();
};

export default {
  getDomainFromRequest,
  validateDomain,
  requireAdminDomain,
  requireAppDomain,
  enforceProjectIsolation
};
