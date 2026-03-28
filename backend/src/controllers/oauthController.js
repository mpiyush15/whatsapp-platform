import { sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';

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
    const { code, state } = req.body;
    return sendSuccess(res, { accessToken: `waba_${Date.now()}`, phoneNumbers: [] }, 'WhatsApp OAuth handled');
  } catch (error) {
    return handleControllerError(res, error, 'handleWhatsAppOAuth');
  }
};

export const getWhatsAppStatus = async (req, res) => {
  try {
    return sendSuccess(res, { status: 'connected', phoneNumbers: [] }, 'WhatsApp status retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getWhatsAppStatus');
  }
};

export const disconnectWhatsApp = async (req, res) => {
  try {
    return sendSuccess(res, { disconnected: true }, 'WhatsApp disconnected');
  } catch (error) {
    return handleControllerError(res, error, 'disconnectWhatsApp');
  }
};

export default { 
  initiateOAuth, 
  handleOAuthCallback,
  handleWhatsAppOAuth,
  getWhatsAppStatus,
  disconnectWhatsApp
};
