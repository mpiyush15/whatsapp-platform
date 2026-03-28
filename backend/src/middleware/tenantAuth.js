import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import { AccountType } from '../constants/enums.js';

/**
 * TENANT AUTH MIDDLEWARE
 * Verifies JWT and extracts accountId
 * Applied to ALL protected routes
 */
export const tenantAuth = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization token'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach to request
    req.user = decoded;
    req.accountId = decoded.accountId;
    req.userType = decoded.type;

    // If client, add automatic accountId filter
    if (decoded.type === AccountType.CLIENT) {
      req.tenantFilter = { accountId: decoded.accountId };
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * SUPERADMIN ONLY MIDDLEWARE
 * Ensures only internal/superadmin users can access
 * Must be used AFTER tenantAuth
 */
export const superadminOnly = (req, res, next) => {
  if (req.user.type !== AccountType.INTERNAL) {
    logger.warn(`Unauthorized superadmin access attempt: ${req.user.email}`);
    return res.status(403).json({
      success: false,
      error: 'Superadmin access required'
    });
  }
  next();
};

/**
 * CLIENT ONLY MIDDLEWARE
 * Ensures only client users can access
 * Must be used AFTER tenantAuth
 */
export const clientOnly = (req, res, next) => {
  if (req.user.type !== AccountType.CLIENT) {
    logger.warn(`Unauthorized client access attempt: ${req.user.email}`);
    return res.status(403).json({
      success: false,
      error: 'Client access required'
    });
  }
  next();
};

/**
 * ACCOUNT ID VALIDATION MIDDLEWARE
 * Validates that request data belongs to user's accountId
 * Prevents cross-tenant data access
 * Must be used AFTER tenantAuth
 */
export const validateAccountId = (req, res, next) => {
  // For superadmin, skip validation (they can access all)
  if (req.user.type === AccountType.INTERNAL) {
    return next();
  }

  // For clients, verify all data requests match their accountId
  const requestAccountId = req.body?.accountId || req.query?.accountId || req.params?.accountId;

  if (requestAccountId && requestAccountId !== req.user.accountId) {
    logger.warn(
      `Cross-tenant access attempt: ${req.user.email} trying to access accountId ${requestAccountId}`
    );
    return res.status(403).json({
      success: false,
      error: 'Access denied: Cannot access other account data'
    });
  }

  next();
};

/**
 * OPTIONAL AUTH MIDDLEWARE
 * Allows both authenticated and unauthenticated requests
 * Useful for public routes that have better functionality when logged in
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue as anonymous
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.accountId = decoded.accountId;
  } catch (error) {
    // Token invalid, continue as anonymous
  }
  next();
};

export default {
  tenantAuth,
  superadminOnly,
  clientOnly,
  validateAccountId,
  optionalAuth
};
