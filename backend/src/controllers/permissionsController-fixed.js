import Account from '../models/Account.js';
import PhoneNumber from '../models/PhoneNumber.js';
import { sendSuccess, sendError, sendValidationError, sendNotFound, sendConflict, sendInternalError, handleCatch } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
// Get permission status for account
export const getPermissionStatus = async (req, res) => {
  try {
    const { accountId } = req.account;

    const account = await Account.findOne({ accountId });
    if (!account) {
      return sendNotFound(res, 'Account');
    }

    return sendSuccess(res, {
      accountId,
      permissionLevel: account.businessPermissions?.permissionLevel || 'basic',
      advancedManagementEnabled: account.businessPermissions?.advancedManagementEnabled || false,
      approvedScopes: account.businessPermissions?.approvedScopes || [],
      requestedAt: account.businessPermissions?.requestedAt || null,
      approvedAt: account.businessPermissions?.approvedAt || null,
      expiresAt: account.businessPermissions?.expiresAt || null,
      rejectionReason: account.businessPermissions?.rejectionReason || null,
      status: account.businessPermissions?.approvedAt ? 'approved' : 
              account.businessPermissions?.rejectedAt ? 'rejected' : 
              account.businessPermissions?.requestedAt ? 'pending' : 'not_requested'
    }, 'Permission status retrieved');
  } catch (error) {
    logger.error('❌ Error getting permission status:', error);
    return handleCatch(res, error, 'getPermissionStatus');
  }
};

// Request advanced management permissions
export const requestPermissions = async (req, res) => {
  try {
    const { accountId } = req.account;
    const { requestedScopes = [] } = req.body;

    // Validate scope values
    const validScopes = ['templates', 'campaigns', 'contacts', 'broadcasts', 'analytics', 'team_management', 'integrations'];
    const invalidScopes = requestedScopes.filter(scope => !validScopes.includes(scope));
    
    if (invalidScopes.length > 0) {
      return sendValidationError(res, `Invalid scopes: ${invalidScopes.join(', ')}`, {
        validScopes
      });
    }

    const account = await Account.findOne({ accountId });
    if (!account) {
      return sendNotFound(res, 'Account');
    }

    // Don't allow re-requesting if already approved
    if (account.businessPermissions?.approvedAt) {
      return sendValidationError(res, 'Account already has approved permissions');
    }

    // Update permission request
    account.businessPermissions = account.businessPermissions || {};
    account.businessPermissions.requestedAt = new Date();
    account.businessPermissions.requestedBy = req.account.email;
    account.businessPermissions.approvedScopes = requestedScopes;

    await account.save();

    return sendSuccess(res, {
      accountId,
      requestedAt: account.businessPermissions.requestedAt,
      requestedScopes,
      status: 'pending'
    }, 'Permission request submitted successfully');
  } catch (error) {
    logger.error('❌ Error requesting permissions:', error);
    return handleCatch(res, error, 'requestPermissions');
  }
};

// Admin: Approve permissions
export const approvePermissions = async (req, res) => {
  try {
    const { accountId, approvedScopes, expiresAt } = req.body;

    if (!accountId) {
      return sendValidationError(res, 'accountId required');
    }

    const account = await Account.findOne({ accountId });
    if (!account) {
      return sendNotFound(res, 'Account');
    }

    account.businessPermissions = account.businessPermissions || {};
    account.businessPermissions.approvedAt = new Date();
    account.businessPermissions.approvedBy = req.account.email;
    account.businessPermissions.permissionLevel = 'advanced';
    account.businessPermissions.advancedManagementEnabled = true;
    account.businessPermissions.approvedScopes = approvedScopes || account.businessPermissions.approvedScopes || [];
    
    if (expiresAt) {
      account.businessPermissions.expiresAt = new Date(expiresAt);
    }

    await account.save();

    return sendSuccess(res, {
      accountId,
      approvedAt: account.businessPermissions.approvedAt,
      approvedScopes: account.businessPermissions.approvedScopes,
      permissionLevel: account.businessPermissions.permissionLevel
    }, 'Permissions approved successfully');
  } catch (error) {
    logger.error('❌ Error approving permissions:', error);
    return handleCatch(res, error, 'approvePermissions');
  }
};

// Admin: Reject permissions
export const rejectPermissions = async (req, res) => {
  try {
    const { accountId, rejectionReason } = req.body;

    if (!accountId) {
      return sendValidationError(res, 'accountId required');
    }

    const account = await Account.findOne({ accountId });
    if (!account) {
      return sendNotFound(res, 'Account');
    }

    account.businessPermissions = account.businessPermissions || {};
    account.businessPermissions.rejectedAt = new Date();
    account.businessPermissions.rejectionReason = rejectionReason || 'Not specified';

    await account.save();

    return sendSuccess(res, {
      accountId,
      rejectedAt: account.businessPermissions.rejectedAt,
      rejectionReason: account.businessPermissions.rejectionReason
    }, 'Permissions rejected');
  } catch (error) {
    logger.error('❌ Error rejecting permissions:', error);
    return handleCatch(res, error, 'rejectPermissions');
  }
};

// Check if account has specific scope enabled
export const hasScope = async (req, res) => {
  try {
    const { accountId } = req.account;
    const { scope } = req.query;

    if (!scope) {
      return sendValidationError(res, 'scope query parameter required');
    }

    const account = await Account.findOne({ accountId });
    if (!account) {
      return sendNotFound(res, 'Account');
    }

    const hasAccess = account.businessPermissions?.approvedScopes?.includes(scope) || false;

    return sendSuccess(res, {
      accountId,
      scope,
      hasAccess,
      permissionLevel: account.businessPermissions?.permissionLevel || 'basic'
    }, 'Scope check completed');
  } catch (error) {
    logger.error('❌ Error checking scope:', error);
    return handleCatch(res, error, 'hasScope');
  }
};

// Get phone number permissions
export const getPhonePermissions = async (req, res) => {
  try {
    const { accountId } = req.account;
    const { phoneNumberId } = req.params;

    const phone = await PhoneNumber.findOne({ accountId, phoneNumberId });
    if (!phone) {
      return sendNotFound(res, 'Phone number');
    }

    return sendSuccess(res, {
      accountId,
      phoneNumberId,
      displayPhone: phone.displayPhone,
      permissionLevel: phone.phonePermissions?.permissionLevel || 'inherit',
      advancedFeaturesEnabled: phone.phonePermissions?.advancedFeaturesEnabled || false,
      enabledFeatures: phone.phonePermissions?.enabledFeatures || []
    }, 'Phone permissions retrieved');
  } catch (error) {
    logger.error('❌ Error getting phone permissions:', error);
    return handleCatch(res, error, 'getPhonePermissions');
  }
};

// Update phone number permissions
export const updatePhonePermissions = async (req, res) => {
  try {
    const { accountId } = req.account;
    const { phoneNumberId } = req.params;
    const { advancedFeaturesEnabled, enabledFeatures, permissionLevel } = req.body;

    const phone = await PhoneNumber.findOne({ accountId, phoneNumberId });
    if (!phone) {
      return sendNotFound(res, 'Phone number');
    }

    // Validate scopes if provided
    if (enabledFeatures) {
      const validScopes = ['templates', 'campaigns', 'contacts', 'broadcasts', 'analytics', 'team_management', 'integrations'];
      const invalidScopes = enabledFeatures.filter(scope => !validScopes.includes(scope));
      
      if (invalidScopes.length > 0) {
        return sendValidationError(res, `Invalid features: ${invalidScopes.join(', ')}`, {
          validFeatures: validScopes
        });
      }
    }

    phone.phonePermissions = phone.phonePermissions || {};
    
    if (advancedFeaturesEnabled !== undefined) {
      phone.phonePermissions.advancedFeaturesEnabled = advancedFeaturesEnabled;
    }
    
    if (enabledFeatures) {
      phone.phonePermissions.enabledFeatures = enabledFeatures;
    }
    
    if (permissionLevel) {
      phone.phonePermissions.permissionLevel = permissionLevel;
    }
    
    phone.phonePermissions.updatedAt = new Date();

    await phone.save();

    return sendSuccess(res, {
      accountId,
      phoneNumberId,
      permissionLevel: phone.phonePermissions.permissionLevel,
      advancedFeaturesEnabled: phone.phonePermissions.advancedFeaturesEnabled,
      enabledFeatures: phone.phonePermissions.enabledFeatures
    }, 'Phone permissions updated successfully');
  } catch (error) {
    logger.error('❌ Error updating phone permissions:', error);
    return handleCatch(res, error, 'updatePhonePermissions');
  }
};

// Middleware: Check if account has specific scope (use in route protection)
export const requireScope = (requiredScope) => {
  return async (req, res, next) => {
    try {
      const { accountId } = req.account;

      const account = await Account.findOne({ accountId });
      if (!account) {
        return sendNotFound(res, 'Account');
      }

      const hasAccess = account.businessPermissions?.approvedScopes?.includes(requiredScope);

      if (!hasAccess) {
        return sendForbidden(res, `Account does not have '${requiredScope}' permission`, {
          requiredScope,
          approvedScopes: account.businessPermissions?.approvedScopes || []
        });
      }

      // Add permission info to request for later use
      req.accountPermissions = {
        level: account.businessPermissions?.permissionLevel,
        scopes: account.businessPermissions?.approvedScopes,
        enabled: account.businessPermissions?.advancedManagementEnabled
      };

      next();
    } catch (error) {
      logger.error('❌ Error checking scope middleware:', error);
      return handleCatch(res, error, 'requireScope');
    }
  };
};

export default {
  getPermissionStatus,
  requestPermissions,
  approvePermissions,
  rejectPermissions,
  hasScope,
  getPhonePermissions,
  updatePhonePermissions,
  requireScope
};
