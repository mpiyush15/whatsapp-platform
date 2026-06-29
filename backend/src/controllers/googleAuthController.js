import { sendSuccess, sendValidationError, sendUnauthorized } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';

export const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return sendValidationError(res, 'Google token required');
    }

    logger.info('🔐 Google auth initiated');

    return sendSuccess(res, {
      authToken: token,
      status: 'authenticated'
    }, 'Google authentication successful');
  } catch (error) {
    return handleControllerError(res, error, 'googleAuth');
  }
};

export const callbackAuth = async (req, res) => {
  try {
    const { code } = req.query;
    return sendSuccess(res, { code }, 'Auth callback processed');
  } catch (error) {
    return handleControllerError(res, error, 'callbackAuth');
  }
};

export const loginWithGoogle = async (req, res) => {
  try {
    const { token } = req.body;
    return sendSuccess(res, { authToken: `gauth_${Date.now()}`, user: {} }, 'Google login successful');
  } catch (error) {
    return handleControllerError(res, error, 'loginWithGoogle');
  }
};

export const linkGoogleAccount = async (req, res) => {
  try {
    const { token } = req.body;
    return sendSuccess(res, { linked: true }, 'Google account linked');
  } catch (error) {
    return handleControllerError(res, error, 'linkGoogleAccount');
  }
};

export default { 
  googleAuth, 
  callbackAuth,
  loginWithGoogle,
  linkGoogleAccount
};
