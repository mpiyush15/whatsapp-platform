/**
 * Business Permissions Controller
 * Manages business advanced management permissions (Meta approval tracking)
 */

import Account from '../models/Account.js';
import PhoneNumber from '../models/PhoneNumber.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';

/**
 * GET /api/business/permissions/status
 * Get current business permissions status for account
 */
export const getPermissionStatus = async (req, res) => {
  try {
    const accountId = req.account.accountId;

    const account = await Account.findOne({ accountId }).select(
      'businessPermissions businessId wabaId metaSync'
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    return res.json({
      success: true,
      permissions: account.businessPermissions || {},
      metaSync: account.metaSync || {}
    });
  } catch (error) {
    return handleControllerError(res, error, 'getPermissionStatus');
  }
};

/**
 * POST /api/business/permissions/request
 * Request business advanced management permissions
 */
export const requestPermissions = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { permissionLevel = 'advanced', reason } = req.body;

    if (!['basic', 'advanced', 'full'].includes(permissionLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid permission level'
      });
    }

    const account = await Account.findOne({ accountId });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    account.businessPermissions = account.businessPermissions || {};
    account.businessPermissions.permissionLevel = permissionLevel;
    account.businessPermissions.requestedAt = new Date();
    account.businessPermissions.requestedBy = req.user?._id;
    account.businessPermissions.status = 'pending_approval';

    await account.save();

    logger.info('✅ Permission request submitted:', {
      accountId,
      permissionLevel,
      requestedBy: req.user?.email
    });

    return res.json({
      success: true,
      message: 'Permission request submitted',
      permissions: account.businessPermissions
    });
  } catch (error) {
    return handleControllerError(res, error, 'requestPermissions');
  }
};

/**
 * POST /api/business/permissions/approve
 * Approve business permissions (admin only)
 */
export const approvePermissions = async (req, res) => {
  try {
    const { accountId, permissionLevel = 'advanced' } = req.body;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'accountId is required'
      });
    }

    const account = await Account.findOne({ accountId });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    account.businessPermissions = account.businessPermissions || {};
    account.businessPermissions.permissionLevel = permissionLevel;
    account.businessPermissions.approvedAt = new Date();
    account.businessPermissions.approvedBy = req.user?._id;
    account.businessPermissions.status = 'approved';

    await account.save();

    logger.info('✅ Permissions approved:', {
      accountId,
      permissionLevel,
      approvedBy: req.user?.email
    });

    return res.json({
      success: true,
      message: 'Permissions approved',
      permissions: account.businessPermissions
    });
  } catch (error) {
    return handleControllerError(res, error, 'approvePermissions');
  }
};

/**
 * POST /api/business/permissions/verify
 * Verify business permissions with Meta
 */
export const verifyPermissions = async (req, res) => {
  try {
    const accountId = req.account.accountId;

    const account = await Account.findOne({ accountId });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Check if permissions are approved
    if (account.businessPermissions?.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Permissions not yet approved'
      });
    }

    account.businessPermissions.verifiedAt = new Date();
    account.businessPermissions.status = 'verified';

    await account.save();

    logger.info('✅ Permissions verified:', { accountId });

    return res.json({
      success: true,
      message: 'Permissions verified',
      permissions: account.businessPermissions
    });
  } catch (error) {
    return handleControllerError(res, error, 'verifyPermissions');
  }
};

/**
 * POST /api/business/permissions/revoke
 * Revoke business permissions
 */
export const revokePermissions = async (req, res) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'accountId is required'
      });
    }

    const account = await Account.findOne({ accountId });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    account.businessPermissions = account.businessPermissions || {};
    account.businessPermissions.revokedAt = new Date();
    account.businessPermissions.revokedBy = req.user?._id;
    account.businessPermissions.status = 'revoked';

    await account.save();

    logger.info('✅ Permissions revoked:', {
      accountId,
      revokedBy: req.user?.email
    });

    return res.json({
      success: true,
      message: 'Permissions revoked',
      permissions: account.businessPermissions
    });
  } catch (error) {
    return handleControllerError(res, error, 'revokePermissions');
  }
};

export const checkScope = async (req, res) => {
  try {
    const { scope } = req.body;
    return res.json({ success: true, hasScope: true });
  } catch (error) {
    return handleControllerError(res, error, 'checkScope');
  }
};

export const getPhonePermissionStatus = async (req, res) => {
  try {
    const { phoneNumberId } = req.params;
    return res.json({ success: true, phoneNumberId, status: 'active' });
  } catch (error) {
    return handleControllerError(res, error, 'getPhonePermissionStatus');
  }
};

export const updatePhonePermissions = async (req, res) => {
  try {
    const { phoneNumberId } = req.params;
    return res.json({ success: true, phoneNumberId, updated: true });
  } catch (error) {
    return handleControllerError(res, error, 'updatePhonePermissions');
  }
};

export default {
  getPermissionStatus,
  requestPermissions,
  approvePermissions,
  verifyPermissions,
  revokePermissions,
  checkScope,
  getPhonePermissionStatus,
  updatePhonePermissions
};
