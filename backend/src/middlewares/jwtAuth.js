import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.js';
import Account from '../models/Account.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * JWT Authentication Middleware (Dashboard & Internal)
 * ✅ AUTH TYPE: JWT Bearer token (from login)
 * ❌ NOT for: API Keys, external integrations, webhooks
 * 
 * Used by: /api/* routes for dashboard users, admin, superadmin
 * Verifies token signature and looks up account from JWT payload
 */

export const requireJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.',
        redirectTo: '/login'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Inject user info into request
    req.accountId = decoded.accountId;
    req.user = {
      email: decoded.email,
      name: decoded.name,
      accountId: decoded.accountId,
      role: decoded.role
    };
    req.authType = 'jwt';

    // Look up account in database
    let account;
    let accountIdToLookup = decoded.accountId;
    
    // ✅ FALLBACK: Handle old tokens with legacy account IDs (only for pixels_internal)
    if (accountIdToLookup === 'pixels_internal') {
      accountIdToLookup = '2600001';
      req.accountId = '2600001';
      req.user.accountId = '2600001';
    }
    
    // Check if accountId is a valid MongoDB ObjectId format
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(accountIdToLookup);
    
    if (isValidObjectId) {
      // accountId is a valid ObjectId - use findById
      account = await Account.findById(accountIdToLookup);
    } else {
      // accountId is a custom string (like "acc_xxx_yyy" or "2600001") - use findOne with accountId field
      account = await Account.findOne({ accountId: accountIdToLookup });
    }
    
    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Account not found. Please login again.',
        redirectTo: '/login'
      });
    }

    // Inject full account object (like auth.js middleware does)
    req.account = {
      id: account._id,
      accountId: account.accountId,
      name: account.name,
      email: account.email,
      type: account.type,
      plan: account.plan,
      status: account.status,
      _id: account._id  // Include _id explicitly
    };
    
    next();
  } catch (error) {
    // Log JWT errors only in development for debugging
    if (process.env.NODE_ENV === 'development') {
      logger.error('[JWT Error]', error.message);
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please login again.',
      redirectTo: '/login'
    });
  }
};

/**
 * Generate JWT Token
 */
export const generateToken = (user) => {
  return jwt.sign(
    {
      email: user.email,
      name: user.name,
      accountId: user.accountId,
      role: user.role,
      type: user.type // Include type: internal, client, company
    },
    JWT_SECRET,
    { expiresIn: '24h' } // Token valid for 24 hours
  );
};

/**
 * Require Superadmin Role
 * Must be used AFTER requireJWT middleware
 */
export const requireSuperAdmin = (req, res, next) => {
  if (req.account?.type !== 'internal') {
    return res.status(403).json({
      success: false,
      message: 'Superadmin access required'
    });
  }
  next();
};

export default {
  requireJWT,
  requireSuperAdmin,
  generateToken
};
