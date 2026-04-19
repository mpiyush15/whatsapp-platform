import { sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';

const Account = mongoose.model('Account');
const PhoneNumber = mongoose.model('PhoneNumber');

export const initiateOAuth = async (req, res) => {
  try {
    const { provider } = req.query;

    if (!provider) {
      return sendValidationError(res, 'OAuth provider required');
    }

    logger.info('🔐 OAuth flow initiated for:', provider);

    return sendSuccess(res, {
      authUrl: `https://oauth.provider/${provider}/auth`,
      state: Math.random().toString(36).substring(7)
    }, 'OAuth initiated');
  } catch (error) {
    return handleControllerError(res, error, 'initiateOAuth');
  }
};

export const handleOAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return sendValidationError(res, 'Authorization code missing');
    }

    logger.info('✅ OAuth callback received');

    return sendSuccess(res, {
      token: `oauth_token_${Date.now()}`,
      status: 'connected'
    }, 'OAuth callback processed');
  } catch (error) {
    return handleControllerError(res, error, 'handleOAuthCallback');
  }
};

export const handleWhatsAppOAuth = async (req, res) => {
  try {
    const accountId = req.account.accountId;

    logger.info(`✅ WhatsApp OAuth callback received for account ${accountId}`);
    logger.info(`📋 Webhook will handle the authorization and phone number sync`);

    // NOTE: The actual phone number sync happens via Meta's webhook
    // This endpoint just confirms receipt
    // The webhook sends account_update event with phone numbers
    
    return sendSuccess(res, {
      status: 'callback_received',
      message: 'Waiting for webhook with phone number data...',
      accountId
    }, 'WhatsApp OAuth callback processed');
  } catch (error) {
    return handleControllerError(res, error, 'handleWhatsAppOAuth');
  }
};

export const disconnectWhatsApp = async (req, res) => {
  try {
    const accountId = req.account.accountId;

    const account = await Account.findOne({ accountId });

    if (!account?.wabaId) {
      return sendValidationError(res, 'WhatsApp not connected');
    }

    // Delete associated phone numbers
    await PhoneNumber.deleteMany({ wabaId: account.wabaId });

    // Clear account WhatsApp config
    await Account.findOneAndUpdate(
      { accountId },
      {
        wabaId: null,
        accessToken: null,
        whatsappConfig: null
      }
    );

    logger.info(`✅ WhatsApp disconnected for ${accountId}`);

    return sendSuccess(res, { disconnected: true }, 'WhatsApp disconnected');
  } catch (error) {
    return handleControllerError(res, error, 'disconnectWhatsApp');
  }
};

export default { 
  initiateOAuth, 
  handleOAuthCallback,
  handleWhatsAppOAuth,
  disconnectWhatsApp
};
