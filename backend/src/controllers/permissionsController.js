import Account from '../models/Account.js';
import PhoneNumber from '../models/PhoneNumber.js';
import { sendSuccess, sendError, sendValidationError, sendNotFound, sendForbidden } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';

export const getPermissionStatus = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const account = await Account.findOne({ accountId });
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    return sendSuccess(res, {
      accountId,
      permissionLevel: account.businessPermissions?.permissionLevel || 'basic',
      advancedManagementEnabled: account.businessPermissions?.advancedManagementEnabled || false,
      approvedScopes: account.businessPermissions?.approvedScopes || [],
      status: account.businessPermissions?.approvedAt ? 'approved' : 'pending'
    }, 'Permission status retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getPermissionStatus');
  }
};

export const requestPermissions = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { requestedScopes = [] } = req.body;
    const validScopes = ['templates', 'campaigns', 'contacts', 'broadcasts', 'analytics'];
    const invalidScopes = requestedScopes.filter(scope => !validScopes.includes(scope));
    
    if (invalidScopes.length > 0) {
      return sendValidationError(res, `Invalid scopes: ${invalidScopes.join(', ')}`);
    }

    const account = await Account.findOne({ accountId });
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }

    if (account.businessPermissions?.approvedAt) {
      return sendValidationError(res, 'Account already has approved permissions');
    }

    account.businessPermissions = account.businessPermissions || {};
    account.businessPermissions.requestedAt = new Date();
    account.businessPermissions.requestedBy = req.account.email;
    account.businessPermissions.approvedScopes = requestedScopes;

    await account.save();
    logger.info('Permission request submitted', { accountId, requestedScopes });

    return sendSuccess(res, {
      accountId,
      requestedAt: account.businessPermissions.requestedAt,
      requestedScopes,
      status: 'pending'
    }, 'Permission request submitted');
  } catch (error) {
    return handleControllerError(res, error, 'requestPermissions');
  }
};

export const approvePermissions = async (req, res) => {
  try {
    const { accountId, approvedScopes } = req.body;

    if (!accountId) {
      return sendValidationError(res, 'accountId is required');
    }

    const account = await Account.findOne({ accountId });
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }

    account.businessPermissions = account.businessPermissions || {};
    account.businessPermissions.approvedAt = new Date();
    account.businessPermissions.approvedBy = req.account.email;
    account.businessPermissions.permissionLevel = 'advanced';
    account.businessPermissions.advancedManagementEnabled = true;
    account.businessPermissions.approvedScopes = approvedScopes || [];

    await account.save();
    logger.info('Permissions approved', { accountId, approvedScopes });

    return sendSuccess(res, {
      accountId,
      approvedAt: account.businessPermissions.approvedAt,
      approvedScopes: account.businessPermissions.approvedScopes
    }, 'Permissions approved');
  } catch (error) {
    return handleControllerError(res, error, 'approvePermissions');
  }
};

export const rejectPermissions = async (req, res) => {
  try {
    const { accountId, rejectionReason } = req.body;

    if (!accountId) {
      return sendValidationError(res, 'accountId is required');
    }

    const account = await Account.findOne({ accountId });
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }

    account.businessPermissions = account.businessPermissions || {};
    account.businessPermissions.rejectedAt = new Date();
    account.businessPermissions.rejectionReason = rejectionReason || 'Not specified';

    await account.save();
    logger.info('Permissions rejected', { accountId });

    return sendSuccess(res, {
      accountId,
      rejectedAt: account.businessPermissions.rejectedAt,
      rejectionReason: account.businessPermissions.rejectionReason
    }, 'Permissions rejected');
  } catch (error) {
    return handleControllerError(res, error, 'rejectPermissions');
  }
};

export const hasScope = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { scope } = req.query;

    if (!scope) {
      return sendValidationError(res, 'scope parameter required');
    }

    const account = await Account.findOne({ accountId });
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }

    const hasAccess = account.businessPermissions?.approvedScopes?.includes(scope) || false;

    return sendSuccess(res, {
      accountId,
      scope,
      hasAccess
    }, 'Scope check completed');
  } catch (error) {
    return handleControllerError(res, error, 'hasScope');
  }
};

export const getPhonePermissions = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { phoneNumberId } = req.params;

    const phone = await PhoneNumber.findOne({ accountId, phoneNumberId });
    if (!phone) {
      return sendNotFound(res, 'Phone number not found');
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
    return handleControllerError(res, error, 'getPhonePermissions');
  }
};

export const updatePhonePermissions = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { phoneNumberId } = req.params;
    const { advancedFeaturesEnabled, enabledFeatures, permissionLevel } = req.body;

    const phone = await PhoneNumber.findOne({ accountId, phoneNumberId });
    if (!phone) {
      return sendNotFound(res, 'Phone number not found');
    }

    if (enabledFeatures) {
      const validFeatures = ['templates', 'campaigns', 'contacts', 'broadcasts'];
      const invalidFeatures = enabledFeatures.filter(f => !validFeatures.includes(f));
      
      if (invalidFeatures.length > 0) {
        return sendValidationError(res, `Invalid features: ${invalidFeatures.join(', ')}`);
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

    logger.info('Phone permissions updated', { accountId, phoneNumberId });

    return sendSuccess(res, {
      accountId,
      phoneNumberId,
      permissionLevel: phone.phonePermissions.permissionLevel,
      advancedFeaturesEnabled: phone.phonePermissions.advancedFeaturesEnabled,
      enabledFeatures: phone.phonePermissions.enabledFeatures
    }, 'Phone permissions updated');
  } catch (error) {
    return handleControllerError(res, error, 'updatePhonePermissions');
  }
};

export const requireScope = (requiredScope) => {
  return async (req, res, next) => {
    try {
      const accountId = req.account.accountId;

      const account = await Account.findOne({ accountId });
      if (!account) {
        return sendNotFound(res, 'Account not found');
      }

      const hasAccess = account.businessPermissions?.approvedScopes?.includes(requiredScope);

      if (!hasAccess) {
        return sendForbidden(res, `Account does not have '${requiredScope}' permission`);
      }

      req.accountPermissions = {
        level: account.businessPermissions?.permissionLevel,
        scopes: account.businessPermissions?.approvedScopes,
        enabled: account.businessPermissions?.advancedManagementEnabled
      };

      next();
    } catch (error) {
      return handleControllerError(res, error, 'requireScope');
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
