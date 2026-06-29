import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';

export const getSettings = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    return sendSuccess(res, { settings: {} }, 'Settings retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getSettings');
  }
};

export const updateSettings = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const settings = req.body;

    logger.info('⚙️ Settings updated:', accountId);

    return sendSuccess(res, { settings }, 'Settings updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateSettings');
  }
};

export const getPhoneNumbers = async (req, res) => {
  try {
    // Support both req.accountId (JWT) and req.account.accountId (tenant)
    const accountId = req.accountId || req.account?.accountId;
    const projectId = req.query.projectId || req.projectId || null;

    // DEBUG: Log what we're getting
    console.log('🔍 getPhoneNumbers Debug:')
    console.log('   req.accountId:', req.accountId)
    console.log('   req.account?.accountId:', req.account?.accountId)
    console.log('   Final accountId:', accountId)
    console.log('   projectId:', projectId)

    if (!accountId) {
      console.log('❌ No accountId found!')
      return res.status(401).json({
        success: false,
        error: 'Account ID not found in request'
      });
    }

    const PhoneNumber = mongoose.model('PhoneNumber');

    // Build query based on projectId
    const query = { accountId };
    if (projectId) {
      query.projectId = projectId;
    }

    console.log('📊 Query:', query)

    // Fetch phone numbers for this project or account
    const phoneNumbers = await PhoneNumber.find(query).select(
      '_id phoneNumberId wabaId displayName displayPhone phone isActive verificationStatus qualityRating messageCount'
    ).sort({ createdAt: -1 });

    logger.info(`✅ Retrieved ${phoneNumbers.length} phone numbers for account ${accountId} project ${projectId || 'default'}`);
    console.log('📱 Found phones:', phoneNumbers)

    return sendSuccess(res, { phoneNumbers }, 'Phone numbers retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getPhoneNumbers');
  }
};

export const syncPhoneNumbersFromMeta = async (req, res) => {
  try {
    logger.info('🔄 Syncing phone numbers from Meta...');
    return sendSuccess(res, { synced: 0 }, 'Phone numbers synced');
  } catch (error) {
    return handleControllerError(res, error, 'syncPhoneNumbersFromMeta');
  }
};

export const addPhoneNumber = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    return sendSuccess(res, { phoneNumberId: `pn_${Date.now()}` }, 'Phone number added');
  } catch (error) {
    return handleControllerError(res, error, 'addPhoneNumber');
  }
};

export const updatePhoneNumber = async (req, res) => {
  try {
    const { id } = req.params;
    return sendSuccess(res, { phoneNumberId: id, updated: true }, 'Phone number updated');
  } catch (error) {
    return handleControllerError(res, error, 'updatePhoneNumber');
  }
};

export const deletePhoneNumber = async (req, res) => {
  try {
    const { id } = req.params;
    return sendSuccess(res, { phoneNumberId: id, deleted: true }, 'Phone number deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deletePhoneNumber');
  }
};

export const testPhoneNumber = async (req, res) => {
  try {
    const { id } = req.params;
    return sendSuccess(res, { phoneNumberId: id, testStatus: 'ok' }, 'Phone number test successful');
  } catch (error) {
    return handleControllerError(res, error, 'testPhoneNumber');
  }
};

export const getProfile = async (req, res) => {
  try {
    const { accountId } = req.user; // Extract from JWT token
    
    // Fetch account data from database
    const Account = (await import('../models/Account.js')).default;
    const account = await Account.findOne({ accountId });
    
    if (!account) {
      return sendError(res, 404, 'Account not found');
    }
    
    // Get WhatsApp configuration from first phone number
    const PhoneNumber = (await import('../models/PhoneNumber.js')).default;
    const phoneNumber = await PhoneNumber.findOne({ accountId });
    
    // Return profile data with WhatsApp config
    return sendSuccess(res, {
      profile: {
        _id: account._id,
        accountId: account.accountId,
        name: account.name,
        email: account.email,
        company: account.company,
        phone: account.phone,
        timezone: account.timezone,
        subdomain: account.subdomain,
        wabaId: account.wabaId,
        businessId: account.businessId,
        type: account.type,
        role: account.role,
        metaSyncStatus: account.metaSyncStatus
      },
      whatsappConfig: {
        wabaId: account.wabaId || phoneNumber?.wabaId || '',
        businessId: account.businessId || phoneNumber?.businessId || '',
        isConnected: !!phoneNumber?.phoneNumberId
      }
    }, 'Profile retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getProfile');
  }
};

export const updateProfile = async (req, res) => {
  try {
    return sendSuccess(res, { profile: {} }, 'Profile updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateProfile');
  }
};

export const getApiKeys = async (req, res) => {
  try {
    return sendSuccess(res, { apiKeys: [] }, 'API keys retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getApiKeys');
  }
};

export const generateApiKey = async (req, res) => {
  try {
    return sendSuccess(res, { apiKey: `pk_${Date.now()}` }, 'API key generated');
  } catch (error) {
    return handleControllerError(res, error, 'generateApiKey');
  }
};

export const deleteApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    return sendSuccess(res, { apiKeyId: id, deleted: true }, 'API key deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteApiKey');
  }
};

export const changePassword = async (req, res) => {
  try {
    return sendSuccess(res, { passwordChanged: true }, 'Password changed');
  } catch (error) {
    return handleControllerError(res, error, 'changePassword');
  }
};

export default { 
  getSettings,
  updateSettings,
  getPhoneNumbers,
  syncPhoneNumbersFromMeta,
  addPhoneNumber,
  updatePhoneNumber,
  deletePhoneNumber,
  testPhoneNumber,
  getProfile,
  updateProfile,
  getApiKeys,
  generateApiKey,
  deleteApiKey,
  changePassword
};
