/**
 * Account Controller
 * Handles account CRUD and API key management
 */

import Account from '../models/Account.js';
import PhoneNumber from '../models/PhoneNumber.js';
import { sendSuccess, sendError, sendValidationError, sendNotFound, sendConflict } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';
import { handleControllerError } from '../utils/errorHandler.js';

export const createAccount = async (req, res) => {
  try {
    const { accountId, name, email, type = 'client', plan = 'free', limits, wabaId, phoneNumberId, accessToken } = req.body;
    
    if (!accountId || !name || !email) {
      return sendValidationError(res, 'Missing required fields: accountId, name, email');
    }
    
    const existing = await Account.findOne({ accountId });
    if (existing) {
      return sendConflict(res, `Account with ID '${accountId}' already exists`);
    }
    
    const account = new Account({
      accountId,
      name,
      email,
      type,
      plan,
      status: 'active',
      limits: limits || undefined,
      lastActiveAt: new Date()
    });
    
    const apiKey = account.generateApiKey();
    await account.save();
    
    if (wabaId && phoneNumberId && accessToken) {
      const phoneNumber = new PhoneNumber({
        accountId,
        wabaId,
        phoneNumberId,
        accessToken,
        status: 'active'
      });
      await phoneNumber.save();
    }
    
    return res.status(201).json({
      success: true,
      account: {
        accountId: account.accountId,
        name: account.name,
        email: account.email,
        type: account.type,
        plan: account.plan,
        status: account.status,
        apiKeyPrefix: account.apiKeyPrefix,
        createdAt: account.createdAt
      },
      apiKey,
      warning: '⚠️ Store this API key securely. It will not be shown again.'
    });
  } catch (error) {
    return handleControllerError(res, error, 'createAccount');
  }
};

export const listAccounts = async (req, res) => {
  try {
    const { type, status, limit = 50, offset = 0 } = req.query;
    
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    
    const accounts = await Account.find(query)
      .select('-apiKeyHash')
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ createdAt: -1 });
    
    const total = await Account.countDocuments(query);
    
    return sendSuccess(res, {
      accounts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + accounts.length < total
      }
    }, 'Accounts retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listAccounts');
  }
};

export const getAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const account = await Account.findOne({ accountId }).select('-apiKeyHash');
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    
    const phoneNumbers = await PhoneNumber.find({ accountId: account.accountId });
    
    return sendSuccess(res, {
      account,
      phoneNumbers
    }, 'Account retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getAccount');
  }
};

export const updateAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    const updates = req.body;
    
    delete updates.accountId;
    delete updates.apiKeyHash;
    delete updates.apiKeyPrefix;
    delete updates.createdAt;
    
    const account = await Account.findOneAndUpdate(
      { accountId },
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-apiKeyHash');
    
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    
    return sendSuccess(res, { account }, 'Account updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateAccount');
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const account = await Account.findOneAndDelete({ accountId });
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    
    await PhoneNumber.deleteMany({ accountId });
    
    return sendSuccess(res, { accountId }, 'Account deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteAccount');
  }
};

export const regenerateApiKey = async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const account = await Account.findOne({ accountId });
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    
    const newApiKey = account.generateApiKey();
    await account.save();
    
    return sendSuccess(res, {
      account: {
        accountId: account.accountId,
        name: account.name,
        apiKeyPrefix: account.apiKeyPrefix
      },
      apiKey: newApiKey,
      warning: '⚠️ Old API key is now invalid. Store this new key securely.'
    }, 'API key regenerated');
  } catch (error) {
    return handleControllerError(res, error, 'regenerateApiKey');
  }
};

export const revokeApiKey = async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const account = await Account.findOneAndUpdate(
      { accountId },
      {
        $unset: { apiKeyHash: '', apiKeyPrefix: '' },
        $set: { apiKeyCreatedAt: null, apiKeyLastUsedAt: null }
      },
      { new: true }
    ).select('-apiKeyHash');
    
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    
    return sendSuccess(res, {
      account: {
        accountId: account.accountId,
        name: account.name,
        status: account.status
      }
    }, 'API key revoked');
  } catch (error) {
    return handleControllerError(res, error, 'revokeApiKey');
  }
};

export const getMyAccount = async (req, res) => {
  try {
    const account = await Account.findById(req.account._id).select('-apiKeyHash');
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    
    // Dynamically override plan with active subscription if available
    const db = mongoose.connection.db;
    const subscription = await db.collection('subscriptions').findOne({
      accountId: account.accountId,
      status: 'active'
    });
    
    let dynamicPlan = account.plan;
    if (subscription && subscription.planName) {
      dynamicPlan = subscription.planName.toLowerCase();
    } else {
      const payment = await db.collection('payments').findOne({
        accountId: account.accountId,
        status: { $in: ['PAID', 'success', 'paid', 'completed'] }
      }, { sort: { createdAt: -1 } });
      if (payment && payment.planName) {
        dynamicPlan = payment.planName.toLowerCase();
      }
    }
    
    const phoneNumbers = await PhoneNumber.find({ accountId: account._id });
    
    return sendSuccess(res, {
      data: {
        _id: account._id,
        name: account.name,
        email: account.email,
        accountId: account.accountId,
        phone: account.phone,
        company: account.company,
        plan: account.plan || dynamicPlan,
        status: account.status,
        billingCycle: account.billingCycle,
        timezone: account.timezone,
        type: account.type,
        createdAt: account.createdAt,
        phoneNumbers
      }
    }, 'My account retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getMyAccount');
  }
};

export const updateMyAccount = async (req, res) => {
  try {
    const updates = req.body;
    
    // Only allow updating certain fields
    const allowedUpdates = {};
    if (updates.name) allowedUpdates.name = updates.name;
    if (updates.company) allowedUpdates.company = updates.company;
    if (updates.phone) allowedUpdates.phone = updates.phone;
    
    const account = await Account.findByIdAndUpdate(
      req.account._id,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    ).select('-apiKeyHash');
    
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    
    return sendSuccess(res, { account }, 'Account updated successfully');
  } catch (error) {
    return handleControllerError(res, error, 'updateMyAccount');
  }
};

export const regenerateMyApiKey = async (req, res) => {
  try {
    const account = await Account.findById(req.account._id);
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    
    const newApiKey = account.generateApiKey();
    await account.save();
    
    return sendSuccess(res, {
      apiKey: newApiKey,
      warning: '⚠️ Your old API key is now invalid. Update your application with this new key immediately.'
    }, 'API key regenerated');
  } catch (error) {
    return handleControllerError(res, error, 'regenerateMyApiKey');
  }
};

export const generateIntegrationToken = async (req, res) => {
  try {
    const { platform } = req.body;
    
    if (!platform) {
      return sendValidationError(res, 'Platform is required');
    }

    const account = await Account.findById(req.account._id).select('+integrationTokenHash');
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    
    logger.info('✅ Account found:', account.name);
    logger.info('📱 Platform:', platform);
    
    const integrationToken = account.generateIntegrationToken();
    logger.info('🔐 Token generated, prefix:', account.integrationTokenPrefix);
    
    if (!account.connectedPlatforms) {
      account.connectedPlatforms = [];
    }
    
    const existingPlatform = account.connectedPlatforms.find(p => p.name === platform);
    
    if (existingPlatform) {
      existingPlatform.apiKeyPrefix = account.integrationTokenPrefix;
      existingPlatform.testStatus = 'pending';
    } else {
      account.connectedPlatforms.push({
        name: platform,
        isConnected: false,
        connectedAt: null,
        lastTestedAt: null,
        testStatus: 'pending',
        apiKeyPrefix: account.integrationTokenPrefix
      });
    }
    
    await account.save();
    logger.info('✅ Integration token generated successfully for', platform);
    
    return sendSuccess(res, {
      integrationToken,
      tokenPrefix: account.integrationTokenPrefix,
      createdAt: account.integrationTokenCreatedAt,
      platform: platform,
      warning: `⚠️ Save this token securely. Use it in ${platform} to connect to this WhatsApp platform.`
    }, 'Integration token generated');
  } catch (error) {
    logger.error('❌ Generate integration token error:', error.message);
    return handleControllerError(res, error, 'generateIntegrationToken');
  }
};

export const getConnectedPlatforms = async (req, res) => {
  try {
    const account = await Account.findById(req.account._id).select('connectedPlatforms');
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    
    return sendSuccess(res, {
      platforms: account.connectedPlatforms || []
    }, 'Connected platforms retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getConnectedPlatforms');
  }
};

export const getIntegrationToken = async (req, res) => {
  try {
    const account = await Account.findById(req.account._id).select('integrationTokenPrefix integrationTokenCreatedAt integrationTokenLastUsedAt');
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    
    return sendSuccess(res, {
      integrationToken: {
        prefix: account.integrationTokenPrefix || null,
        createdAt: account.integrationTokenCreatedAt || null,
        lastUsedAt: account.integrationTokenLastUsedAt || null,
        exists: !!account.integrationTokenPrefix
      }
    }, 'Integration token info retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getIntegrationToken');
  }
};

export const revokeIntegrationToken = async (req, res) => {
  try {
    const account = await Account.findById(req.account._id);
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    
    account.integrationTokenHash = undefined;
    account.integrationTokenPrefix = undefined;
    account.integrationTokenCreatedAt = undefined;
    account.integrationTokenLastUsedAt = undefined;
    
    await account.save();
    
    return sendSuccess(res, {}, 'Integration token revoked');
  } catch (error) {
    return handleControllerError(res, error, 'revokeIntegrationToken');
  }
};

export const testPlatformConnection = async (req, res) => {
  try {
    const { platformName } = req.body;

    if (!platformName) {
      return sendValidationError(res, 'Platform name is required');
    }

    const account = await Account.findById(req.account._id).select('connectedPlatforms integrationTokenPrefix integrationTokenHash');
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }

    const platform = account.connectedPlatforms?.find(p => p.name === platformName);
    if (!platform) {
      return sendNotFound(res, 'Platform not found');
    }

    logger.info(`🧪 Testing connection for ${platformName}...`);

    platform.lastTestedAt = new Date();
    platform.testStatus = 'testing';
    
    try {
      await account.save();
    } catch (saveError) {
      logger.error('Error saving test status:', saveError);
    }

    let isConnected = false;
    let testMessage = '';

    if (platformName === 'Enromatics') {
      isConnected = !!account.integrationTokenPrefix;
      testMessage = isConnected ? 'Token is valid. Please verify connection in Enromatics dashboard' : 'Token not found';
    } else if (platformName === 'Zapier') {
      isConnected = !!account.integrationTokenPrefix;
      testMessage = isConnected ? 'Token is valid. Please verify connection in Zapier' : 'Token not found';
    } else if (platformName === 'Make') {
      isConnected = !!account.integrationTokenPrefix;
      testMessage = isConnected ? 'Token is valid. Please verify in Make' : 'Token not found';
    } else {
      isConnected = !!account.integrationTokenPrefix;
      testMessage = isConnected ? 'Token is valid for authentication' : 'Token not found';
    }

    platform.isConnected = isConnected;
    platform.testStatus = isConnected ? 'success' : 'failed';
    
    try {
      await account.save();
    } catch (saveError) {
      logger.error('Error saving connection status:', saveError);
    }

    const responseMessage = isConnected
      ? `✅ ${platformName} token verified successfully. ${testMessage}`
      : `❌ Failed to verify ${platformName} connection. ${testMessage}`;

    console.log(responseMessage);

    return res.json({
      success: isConnected,
      platform: {
        name: platformName,
        isConnected: platform.isConnected,
        testedAt: platform.lastTestedAt,
        testStatus: platform.testStatus
      }
    });
  } catch (error) {
    return handleControllerError(res, error, 'testPlatformConnection');
  }
};

export default {
  createAccount,
  listAccounts,
  getAccount,
  updateAccount,
  deleteAccount,
  regenerateApiKey,
  revokeApiKey,
  getMyAccount,
  updateMyAccount,
  regenerateMyApiKey,
  generateIntegrationToken,
  getConnectedPlatforms,
  getIntegrationToken,
  revokeIntegrationToken,
  testPlatformConnection
};
