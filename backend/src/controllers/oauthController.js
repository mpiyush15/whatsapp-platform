import { sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import axios from 'axios';
import mongoose from 'mongoose';

const Account = mongoose.model('Account');
const PhoneNumber = mongoose.model('PhoneNumber');

/**
 * SIMPLE DIRECT OAUTH FLOW (Like Aisensy/Wati)
 * 1. Receive auth code from Meta
 * 2. Exchange code for access token
 * 3. Fetch WABAs + phone numbers immediately
 * 4. Return to frontend
 * 5. Frontend shows phone picker
 */

export const exchangeCodeForToken = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { code } = req.body;

    if (!code) {
      return sendValidationError(res, 'Authorization code required');
    }

    logger.info(`🔐 [${accountId}] Exchanging WhatsApp OAuth code...`);

    // Step 1: Exchange code for access token
    const tokenUrl = 'https://graph.instagram.com/v18.0/oauth/access_token';
    const frontendUrl = (process.env.FRONTEND_URL || 'https://replysys.com').split(',')[0].trim();
    const redirectUri = `${frontendUrl}/auth/whatsapp/callback`;

    logger.info(`🔗 Using redirect_uri: ${redirectUri}`);

    const tokenResponse = await axios.post(tokenUrl, {
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      redirect_uri: redirectUri,
      code
    });

    const accessToken = tokenResponse.data.access_token;
    logger.info(`✅ Got access token for account ${accountId}`);

    // Step 2: Fetch WABA ID
    const wabaUrl = `https://graph.facebook.com/v18.0/me/owned_whatsapp_business_accounts`;
    const wabaResponse = await axios.get(wabaUrl, {
      params: { access_token: accessToken }
    });

    const wabas = wabaResponse.data.data || [];
    if (wabas.length === 0) {
      return sendValidationError(res, 'No WhatsApp Business Account found');
    }

    const wabaId = wabas[0].id;
    logger.info(`✅ Got WABA ID: ${wabaId}`);

    // Step 3: Fetch phone numbers for this WABA
    const phoneUrl = `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers`;
    const phoneResponse = await axios.get(phoneUrl, {
      params: { access_token: accessToken }
    });

    const phones = phoneResponse.data.data || [];
    logger.info(`✅ Found ${phones.length} phone number(s) for WABA ${wabaId}`);

    // Step 4: Save access token to account (not phone numbers yet - user will select)
    await Account.findOneAndUpdate(
      { accountId },
      {
        wabaId,
        whatsappAccessToken: accessToken,
        whatsappConfig: {
          wabaId,
          connectedAt: new Date()
        }
      },
      { new: true }
    );

    logger.info(`✅ Account ${accountId} updated with WABA ${wabaId}`);

    // Step 5: Return phone list to frontend for user selection
    return sendSuccess(res, {
      wabaId,
      phones: phones.map(p => ({
        phoneNumberId: p.id,
        displayPhone: p.display_phone_number || p.phone_number,
        displayName: p.display_name_address_book || 'WhatsApp Number',
        qualityRating: p.quality_rating || 'UNKNOWN'
      }))
    }, 'OAuth successful - select phone number');

  } catch (error) {
    logger.error('❌ OAuth error:', error.response?.data || error.message);
    
    if (error.response?.data?.error?.message?.includes('Invalid OAuth')) {
      return sendValidationError(res, 'Invalid authorization code. Please try again.');
    }
    
    return handleControllerError(res, error, 'exchangeCodeForToken');
  }
};

/**
 * Save selected phone number to database
 */
export const selectPhoneNumber = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { phoneNumberId, displayPhone, displayName } = req.body;

    if (!phoneNumberId || !displayPhone) {
      return sendValidationError(res, 'Phone number ID and display phone required');
    }

    logger.info(`💾 [${accountId}] Saving phone: ${displayPhone}`);

    // Get access token from account
    const account = await Account.findOne({ accountId }).select('whatsappAccessToken wabaId');
    
    if (!account?.whatsappAccessToken) {
      return sendValidationError(res, 'WhatsApp not authorized. Please connect again.');
    }

    // Save phone to PhoneNumber collection
    const phoneEntry = {
      phoneNumberId,
      wabaId: account.wabaId,
      displayName: displayName || 'WhatsApp Number',
      displayPhone,
      phone: displayPhone,
      isActive: true,
      verifiedAt: new Date(),
      qualityRating: 'UNKNOWN',
      accessToken: account.whatsappAccessToken
    };

    const savedPhone = await PhoneNumber.findOneAndUpdate(
      { phoneNumberId },
      phoneEntry,
      { upsert: true, new: true }
    );

    logger.info(`✅ Phone saved: ${displayPhone} (ID: ${phoneNumberId})`);

    return sendSuccess(res, {
      phoneNumberId: savedPhone.phoneNumberId,
      displayPhone: savedPhone.displayPhone,
      displayName: savedPhone.displayName
    }, 'Phone number saved successfully');

  } catch (error) {
    logger.error('❌ Error selecting phone:', error.message);
    return handleControllerError(res, error, 'selectPhoneNumber');
  }
};

/**
 * Get connected phone numbers for account
 */
export const getConnectedPhones = async (req, res) => {
  try {
    const accountId = req.account.accountId;

    const account = await Account.findOne({ accountId }).select('wabaId');
    
    if (!account?.wabaId) {
      return sendSuccess(res, { phones: [] }, 'No WhatsApp connected');
    }

    const phones = await PhoneNumber.find({ wabaId: account.wabaId }).lean();

    logger.info(`✅ Retrieved ${phones.length} phone(s) for account ${accountId}`);

    return sendSuccess(res, { phones }, `Found ${phones.length} phone number(s)`);

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

    const account = await Account.findOne({ accountId });

    if (!account?.wabaId) {
      return sendValidationError(res, 'WhatsApp not connected');
    }

    // Delete phone numbers
    await PhoneNumber.deleteMany({ wabaId: account.wabaId });

    // Clear account
    await Account.findOneAndUpdate(
      { accountId },
      {
        wabaId: null,
        whatsappAccessToken: null,
        whatsappConfig: {}
      }
    );

    logger.info(`✅ WhatsApp disconnected for ${accountId}`);

    return sendSuccess(res, { disconnected: true }, 'WhatsApp disconnected');

  } catch (error) {
    return handleControllerError(res, error, 'disconnectWhatsApp');
  }
};

export default {
  exchangeCodeForToken,
  selectPhoneNumber,
  getConnectedPhones,
  disconnectWhatsApp
};
