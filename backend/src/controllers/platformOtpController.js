import platformOtpService from '../services/platformOtpService.js';
import { sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import { handleControllerError } from '../utils/errorHandler.js';

export const sendOtp = async (req, res) => {
  try {
    const { phone, purpose, email } = req.body || {};
    if (!phone) {
      return sendValidationError(res, 'Phone number is required');
    }
    if (!purpose || !['login', 'signup'].includes(purpose)) {
      return sendValidationError(res, 'purpose must be login or signup');
    }

    const result = await platformOtpService.sendOtp({ phone, purpose, email });
    if (!result.ok) {
      return sendValidationError(res, result.error);
    }

    return sendSuccess(
      res,
      {
        expiresInSeconds: result.expiresInSeconds,
        maskedPhone: result.maskedPhone,
      },
      'Verification code sent on WhatsApp'
    );
  } catch (error) {
    return handleControllerError(res, error, 'sendOtp');
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { phone, code, purpose } = req.body || {};
    if (!phone || !code) {
      return sendValidationError(res, 'Phone and code are required');
    }
    if (!purpose || !['login', 'signup'].includes(purpose)) {
      return sendValidationError(res, 'purpose must be login or signup');
    }

    const result = await platformOtpService.verifyOtp({ phone, code, purpose });
    if (!result.ok) {
      return sendValidationError(res, result.error);
    }

    if (result.purpose === 'signup') {
      return sendSuccess(
        res,
        {
          phoneVerificationToken: result.phoneVerificationToken,
          phone: result.phone,
        },
        'Phone verified'
      );
    }

    return sendSuccess(
      res,
      {
        token: result.token,
        user: result.user,
      },
      'Login successful'
    );
  } catch (error) {
    return handleControllerError(res, error, 'verifyOtp');
  }
};

export default { sendOtp, verifyOtp };
