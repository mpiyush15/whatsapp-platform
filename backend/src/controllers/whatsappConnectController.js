import axios from 'axios';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import { sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import { handleControllerError } from '../utils/errorHandler.js';
import { PHONE_FIELDS, META_API, ERRORS } from '../constants/whatsapp.js';

const Account = mongoose.model('Account');
const PhoneNumber = mongoose.model('PhoneNumber');

/**
 * FLOW B: Embedded Signup
 * Receives FINISH event data with waba_id + phone_number_id
 * Fetches phone details from Meta using system token
 * Saves to database
 */
export const connectWhatsApp = async (req, res) => {
  const accountId = req.account.accountId;
  const { waba_id, phone_number_id } = req.body;
  
  try {
    // Validate input
    if (!waba_id) {
      return sendValidationError(res, ERRORS.NO_WABA_ID);
    }
    if (!phone_number_id) {
      return sendValidationError(res, ERRORS.NO_PHONE_ID);
    }

    logger.info(`🔗 [${accountId}] Connecting WhatsApp: WABA=${waba_id}, Phone=${phone_number_id}`);

    const systemToken = process.env.META_SYSTEM_TOKEN;
    if (!systemToken) {
      logger.error('❌ META_SYSTEM_TOKEN not configured');
      return sendValidationError(res, 'System configuration error');
    }

    // Step 1: Fetch phone details from Meta using system token
    logger.info(`📱 Fetching phone details for ${phone_number_id}...`);
    logger.info(`📍 System Token Present: ${systemToken ? 'YES' : 'NO'}`);
    
    const phoneDetailsUrl = `${META_API.BASE_URL}${META_API.ENDPOINTS.PHONE_DETAILS(phone_number_id)}`;
    logger.info(`📍 Meta API URL: ${phoneDetailsUrl}`);
    
    let phoneDetailsResponse;
    try {
      phoneDetailsResponse = await axios.get(phoneDetailsUrl, {
        params: {
          fields: 'display_phone_number,display_name_address_book,quality_rating,verified_name',
          access_token: systemToken
        },
        timeout: 10000
      });
    } catch (metaError) {
      logger.error('❌ Meta API call failed:', {
        url: phoneDetailsUrl,
        status: metaError.response?.status,
        statusText: metaError.response?.statusText,
        errorMessage: metaError.response?.data?.error?.message || metaError.message,
        errorCode: metaError.code,
        fullError: JSON.stringify(metaError.response?.data)
      });
      throw metaError;
    }

    if (!phoneDetailsResponse.data) {
      logger.error('❌ Meta API returned empty response');
      throw new Error('Meta API returned empty response');
    }

    const phoneData = phoneDetailsResponse.data;
    const displayPhone = phoneData.display_phone_number;
    const displayName = phoneData.display_name_address_book || phoneData.verified_name || 'WhatsApp Number';

    if (!displayPhone) {
      logger.error('❌ Meta API response missing display_phone_number:', phoneData);
      throw new Error('Phone details not found in Meta response');
    }

    // Log Meta response for debugging
    logger.info('📱 Meta API Phone Response:', {
      phoneNumberId: phone_number_id,
      displayPhone: phoneData.display_phone_number,
      displayName: phoneData.display_name_address_book,
      qualityRating: phoneData.quality_rating,
      verifiedName: phoneData.verified_name
    });

    logger.info(`✅ Got phone: ${displayPhone} (${displayName})`);

    // Step 2: Save WABA to Account
    logger.info(`💾 Saving WABA to account...`);
    
    await Account.findOneAndUpdate(
      { accountId },
      {
        wabaId: waba_id,
        whatsappConfig: {
          wabaId: waba_id,
          connectedAt: new Date(),
          source: 'EMBEDDED_SIGNUP'
        }
      },
      { new: true }
    );

    logger.info(`✅ Account updated with WABA ${waba_id}`);

    // Step 3: Save phone number (upsert to prevent duplicates)
    logger.info(`💾 Saving phone number to database...`);

    // Upsert: update if exists, create if not (prevents duplicates)
    const phoneRecord = await PhoneNumber.findOneAndUpdate(
      { phoneNumberId: phone_number_id },
      {
        accountId,
        phoneNumberId: phone_number_id,
        displayPhone,
        displayName,
        qualityRating: phoneData.quality_rating || 'UNKNOWN',
        verificationStatus: phoneData.verified_name ? 'VERIFIED' : 'NOT_VERIFIED',
        isActive: true,
        connectedAt: new Date(),
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    logger.info(`✅ Phone saved: ${displayPhone}`);

    // Step 4: Return success with phone details
    return sendSuccess(res, {
      wabaId: waba_id,
      phone: {
        [PHONE_FIELDS.phoneNumberId]: phone_number_id,
        [PHONE_FIELDS.displayPhone]: displayPhone,
        [PHONE_FIELDS.displayName]: displayName,
        [PHONE_FIELDS.qualityRating]: phoneData.quality_rating || 'UNKNOWN',
        [PHONE_FIELDS.verificationStatus]: phoneData.verified_name ? 'VERIFIED' : 'NOT_VERIFIED'
      }
    }, 'WhatsApp connected successfully!');

  } catch (error) {
    // Detailed error logging for production debugging
    logger.error('❌ Connect WhatsApp error:', {
      accountId: req.account.accountId,
      wabaId: waba_id,
      phoneNumberId: phone_number_id,
      metaStatus: error.response?.status,
      metaError: error.response?.data?.error,
      errorMessage: error.message,
      errorType: error.code
    });

    if (error.response?.data?.error?.message?.includes('Invalid access token')) {
      return sendValidationError(res, 'Invalid Meta API token');
    }

    if (error.response?.data?.error?.message?.includes('not found')) {
      return sendValidationError(res, 'Phone number or WABA not found on Meta');
    }

    return handleControllerError(res, error, 'connectWhatsApp');
  }
};

/**
 * Get connected phones
 */
export const getConnectedPhones = async (req, res) => {
  try {
    const accountId = req.account.accountId;

    const phones = await PhoneNumber.find({ accountId, isActive: true });

    return sendSuccess(res, { phones }, 'Phones retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getConnectedPhones');
  }
};

/**
 * Disconnect WhatsApp
 */
export const disconnectWhatsApp = async (req, res) => {
  try {
    const accountId = req.account.accountId;

    // Remove WABA from account
    await Account.findOneAndUpdate(
      { accountId },
      {
        $unset: {
          wabaId: '',
          whatsappAccessToken: '',
          whatsappConfig: ''
        }
      }
    );

    // Delete all phones
    await PhoneNumber.deleteMany({ accountId });

    logger.info(`✅ WhatsApp disconnected for account ${accountId}`);

    return sendSuccess(res, {}, 'WhatsApp disconnected successfully');
  } catch (error) {
    return handleControllerError(res, error, 'disconnectWhatsApp');
  }
};
