import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.js';
import Account from '../models/Account.js';
import User from '../models/User.js';
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
    const raw = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
    const token = raw || null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.',
        redirectTo: '/login'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    const emailNorm = decoded.email ? String(decoded.email).trim().toLowerCase() : '';

    // Coerce accountId (JWT JSON may store numeric yyMMdd ids as numbers)
    let accountIdToLookup =
      decoded.accountId != null && decoded.accountId !== ''
        ? String(decoded.accountId).trim()
        : '';

    req.user = {
      email: decoded.email,
      name: decoded.name,
      accountId: accountIdToLookup,
      role: decoded.role,
    };
    req.accountId = accountIdToLookup;
    req.authType = 'jwt';

    // Look up account in database
    let account;

    // ✅ FALLBACK: Handle old tokens with legacy account IDs (only for pixels_internal)
    if (accountIdToLookup === 'pixels_internal') {
      accountIdToLookup = '2600001';
      req.accountId = '2600001';
      req.user.accountId = '2600001';
    }

    const resolveAccount = async (idOrKey) => {
      const key = idOrKey != null && idOrKey !== '' ? String(idOrKey).trim() : '';
      if (!key) return null;
      const isOid = /^[0-9a-fA-F]{24}$/.test(key);
      if (isOid) {
        return Account.findById(key);
      }
      return Account.findOne({ accountId: key });
    };

    if (accountIdToLookup) {
      account = await resolveAccount(accountIdToLookup);
    }

    // Staff / legacy tokens: JWT accountId missing or wrong — resolve org via User.email
    if (!account && emailNorm) {
      const userDoc = await User.findOne({ email: emailNorm }).select('accountId email');
      if (userDoc?.accountId) {
        const orgId = String(userDoc.accountId).trim();
        account = await resolveAccount(orgId);
        if (account) {
          req.accountId = account.accountId;
          req.user.accountId = account.accountId;
        }
      }
    }

    // Client admin token may only guarantee email match on some paths
    if (!account && emailNorm) {
      account = await Account.findOne({ email: emailNorm });
      if (account) {
        req.accountId = account.accountId;
        req.user.accountId = account.accountId;
      }
    }

    if (!account) {
      logger.warn('[requireJWT] Account not found after lookup', {
        hadAccountIdInToken: Boolean(accountIdToLookup),
        email: emailNorm || undefined,
      });
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
      isInternal: Boolean(account.isInternal),
      plan: account.plan,
      status: account.status,
      _id: account._id  // Include _id explicitly
    };
    
    next();
  } catch (error) {
    logger.warn('[requireJWT] verify failed', { name: error?.name, message: error?.message });
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
  const accountId = user?.accountId != null && user.accountId !== '' ? String(user.accountId).trim() : '';
  return jwt.sign(
    {
      email: user.email,
      name: user.name,
      accountId,
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
