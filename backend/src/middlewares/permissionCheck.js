/**
 * Permission Check Middleware & Utilities
 * Validates role-based permissions before allowing operations
 */

import { canPerformFeature, roleHasScope, getScopesForRole } from '../constants/rolePermissions.js';
import Account from '../models/Account.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * Middleware: Check if user role can perform a feature
 * Usage: app.post('/api/templates/create', checkFeaturePermission('template:create'), createTemplate);
 * @param {string} feature - The feature action to check (e.g., 'template:create')
 */
export const checkFeaturePermission = (feature) => {
  return async (req, res, next) => {
    try {
      const userRole = req.account?.role || 'user';

      if (!canPerformFeature(userRole, feature)) {
        logger.error(`❌ Permission denied for ${userRole} attempting ${feature}`);
        return res.status(403).json({
          success: false,
          message: `Your role (${userRole}) doesn't have permission to ${feature}`,
          error: 'FEATURE_PERMISSION_DENIED'
        });
      }

      // ✅ Permission granted, continue to next middleware/controller
      next();
    } catch (error) {
      logger.error(`❌ Permission check error:`, error);
      res.status(500).json({
        success: false,
        message: 'Error checking permissions',
        error: error.message
      });
    }
  };
};

/**
 * Middleware: Check if user role has a specific scope
 * Usage: app.post('/api/broadcasts/send', checkScopePermission('broadcasts'), sendBroadcast);
 * @param {string} scope - The scope to check (e.g., 'templates', 'campaigns')
 */
export const checkScopePermission = (scope) => {
  return async (req, res, next) => {
    try {
      const userRole = req.account?.role || 'user';

      if (!roleHasScope(userRole, scope)) {
        logger.error(`❌ Scope ${scope} not available for ${userRole}`);
        return res.status(403).json({
          success: false,
          message: `Your role doesn't have access to ${scope} scope`,
          error: 'SCOPE_PERMISSION_DENIED'
        });
      }

      // ✅ Scope permission granted
      next();
    } catch (error) {
      logger.error(`❌ Scope permission check error:`, error);
      res.status(500).json({
        success: false,
        message: 'Error checking scope permissions',
        error: error.message
      });
    }
  };
};

/**
 * Validate permissions before operation (for use in controller)
 * Usage: validateFeatureAccess(req, 'template:create')
 * @param {object} req - Express request object
 * @param {string} feature - The feature action to check
 * @returns {object} { allowed: boolean, message: string }
 */
export const validateFeatureAccess = (req, feature) => {
  const userRole = req.account?.role || 'user';
  const allowed = canPerformFeature(userRole, feature);

  return {
    allowed,
    message: allowed ? null : `Your role (${userRole}) doesn't have permission to ${feature}`
  };
};

/**
 * Validate scope access before operation (for use in controller)
 * Usage: validateScopeAccess(req, 'templates')
 * @param {object} req - Express request object
 * @param {string} scope - The scope to check
 * @returns {object} { allowed: boolean, message: string }
 */
export const validateScopeAccess = (req, scope) => {
  const userRole = req.account?.role || 'user';
  const allowed = roleHasScope(userRole, scope);

  return {
    allowed,
    message: allowed ? null : `Your role doesn't have access to ${scope} scope`
  };
};

/**
 * Get user's available scopes
 * @param {object} req - Express request object
 * @returns {array} Array of scopes available to user
 */
export const getUserScopes = (req) => {
  const userRole = req.account?.role || 'user';
  return getScopesForRole(userRole);
};

/**
 * Check multiple permissions (AND logic)
 * Usage: validateAllFeatures(req, ['template:create', 'campaigns:create'])
 * @param {object} req - Express request object
 * @param {array} features - Array of feature actions to check
 * @returns {object} { allowed: boolean, denied: array }
 */
export const validateAllFeatures = (req, features) => {
  const userRole = req.account?.role || 'user';
  const denied = features.filter(feature => !canPerformFeature(userRole, feature));

  return {
    allowed: denied.length === 0,
    denied: denied,
    message: denied.length === 0 ? null : `Missing permissions for: ${denied.join(', ')}`
  };
};

/**
 * Check multiple permissions (OR logic)
 * Usage: validateAnyFeature(req, ['template:create', 'campaign:create'])
 * @param {object} req - Express request object
 * @param {array} features - Array of feature actions to check (any one)
 * @returns {object} { allowed: boolean, message: string }
 */
export const validateAnyFeature = (req, features) => {
  const userRole = req.account?.role || 'user';
  const allowed = features.some(feature => canPerformFeature(userRole, feature));

  return {
    allowed,
    message: allowed ? null : `Your role doesn't have access to any of: ${features.join(', ')}`
  };
};
