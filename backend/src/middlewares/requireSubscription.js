import Subscription from '../models/Subscription.js';
import Account from '../models/Account.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * Middleware to require active subscription/payment
 * Blocks dashboard access if user hasn't completed payment
 * EXCEPT:
 *  1. Superadmins (type='internal') can always access
 *  2. Development environment (NODE_ENV=development) can bypass for testing
 *  3. Supradmin role can always access live chat
 *  4. Whitelisted demo accounts (Enromatics, etc.) can bypass for testing
 */
export const requireSubscription = async (req, res, next) => {
  try {
    const accountId = req.accountId; // From JWT middleware (STRING like 'pixels_internal')
    const user = req.user; // From JWT middleware
    
    if (!accountId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        redirectTo: '/login'
      });
    }

    // Find account
    const account = await Account.findOne({ accountId });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
        redirectTo: '/login'
      });
    }

    // ✅ ALLOW: Superadmins (internal accounts) skip subscription check
    if (account.type === 'internal') {
      logger.info(`✅ Superadmin account (${accountId}) allowed - type='internal'`);
      return next();
    }

    // ✅ ALLOW: Superadmin role always gets access (backup check)
    if (user && user.role === 'superadmin') {
      logger.info(`✅ Superadmin user (${user._id}) allowed - role='superadmin'`);
      return next();
    }

    // ✅ ALLOW: Whitelisted demo/test accounts (Enromatics: 2600002, etc.)
    const whitelistedAccounts = ['2600002']; // Enromatics account
    if (whitelistedAccounts.includes(accountId)) {
      logger.info(`✅ Whitelisted account (${accountId}) allowed - demo/test account`);
      return next();
    }

    // ✅ ALLOW: Development environment allows any account to bypass subscription for testing
    if (process.env.NODE_ENV === 'development') {
      logger.info(`✅ Development mode - subscription check bypassed for ${accountId}`);
      return next();
    }

    // ❌ PRODUCTION: Check if account has active subscription
    const subscription = await Subscription.findOne({
      accountId: account.accountId,  // Use Account.accountId (string)
      status: 'active'
    });

    if (!subscription) {
      logger.info(`⚠️ User ${accountId} blocked - no active subscription`);
      return res.status(403).json({
        success: false,
        message: 'Active subscription required. Please complete payment.',
        redirectTo: '/checkout'
      });
    }

    // User has active subscription, continue
    next();
  } catch (error) {
    logger.error('Subscription check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during subscription verification'
    });
  }
};

export default requireSubscription;
