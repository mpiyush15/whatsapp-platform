import Account from '../models/Account.js';
import logger from '../utils/logger.js';

export const securityHeaders = (req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * API Key Authentication Middleware (External Integrations)
 * ✅ AUTH TYPE: API Key (wpk_live_xxx)
 * ❌ NOT for: Dashboard, JWT tokens, internal requests
 * 
 * Used by: /api/external/* routes for third-party integrations
 * Validates API key format and looks up account by key
 */

export const authenticate = async (req, res, next) => {
  try {
    // Extract API key from Authorization header
    const authHeader = req.headers.authorization;
    
    logger.info('🔑 API Key Check:');
    logger.info('  Path:', req.path);
    logger.info('  Auth Header:', !!authHeader ? '✅ Present' : '❌ Missing');
    
    if (!authHeader) {
      logger.info('  → Rejecting: No auth header');
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide API key in Authorization header.',
        hint: 'Authorization: Bearer wpk_live_...'
      });
    }
    
    // Check Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      logger.info('  → Rejecting: Invalid format (missing "Bearer ")');
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization format. Use: Authorization: Bearer <api_key>'
      });
    }
    
    // Extract API key
    const apiKey = authHeader.substring(7); // Remove "Bearer "
    
    logger.info('  Token prefix:', apiKey.substring(0, 15) + '...');
    
    if (!apiKey || apiKey.trim() === '') {
      logger.info('  → Rejecting: Empty token');
      return res.status(401).json({
        success: false,
        message: 'API key is empty'
      });
    }
    
    // Validate API key format (wpk_live_<64 hex chars>)
    if (!apiKey.startsWith('wpk_live_')) {
      logger.info('  → Rejecting: Invalid API key format (does not start with wpk_live_)');
      return res.status(401).json({
        success: false,
        message: 'Invalid API key format'
      });
    }
    
    // Find account by API key
    const account = await Account.findByApiKey(apiKey);
    
    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key or account inactive'
      });
    }
    
    // Update last used timestamp (async, don't wait)
    Account.updateOne(
      { _id: account._id },
      { apiKeyLastUsedAt: new Date() }
    ).catch(err => logger.error('Error updating apiKeyLastUsedAt:', err));
    
    // Inject account info into request
    req.accountId = account.accountId;
    req.account = {
      id: account._id,
      accountId: account.accountId,
      name: account.name,
      email: account.email,
      type: account.type,
      plan: account.plan,
      status: account.status
    };
    
    // Continue to next middleware/route
    next();
    
  } catch (error) {
    logger.error('❌ Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

/**
 * Optional Authentication Middleware
 * Allows requests without auth but injects account if provided
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth provided, continue without account
      return next();
    }
    
    const apiKey = authHeader.substring(7);
    const account = await Account.findByApiKey(apiKey);
    
    if (account) {
      req.accountId = account.accountId;
      req.account = {
        id: account._id,
        accountId: account.accountId,
        name: account.name,
        email: account.email,
        type: account.type,
        plan: account.plan,
        status: account.status
      };
    }
    
    next();
  } catch (error) {
    // If optional auth fails, just continue without account
    next();
  }
};

export default { authenticate, optionalAuth, securityHeaders };
