import { sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import axios from 'axios';
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
    const { code } = req.body;

    if (!code) {
      return sendValidationError(res, 'Authorization code required');
    }

    logger.info(`🔐 Exchanging WhatsApp OAuth code for account ${accountId}...`);

    // Exchange code for access token using Meta API
    const tokenUrl = 'https://graph.instagram.com/v18.0/oauth/access_token';
    
    // Get the primary frontend URL (first one if multiple are set)
    const frontendUrl = (process.env.FRONTEND_URL || 'https://replysys.com').split(',')[0].trim();
    const redirectUri = `${frontendUrl}/dashboard/client/settings`;
    
    logger.info(`🔗 Using redirect_uri: ${redirectUri}`);
    
    const tokenResponse = await axios.post(tokenUrl, {
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      redirect_uri: redirectUri,
      code
    });

    const accessToken = tokenResponse.data.access_token;
    logger.info(`✅ Got access token for account ${accountId}`);

    // Get WABA ID using the access token
    const wabaUrl = `https://graph.facebook.com/v18.0/me/owned_whatsapp_business_accounts`;
    const wabaResponse = await axios.get(wabaUrl, {
      params: { access_token: accessToken }
    });

    const wabaId = wabaResponse.data.data[0]?.id;
    if (!wabaId) {
      return sendValidationError(res, 'No WhatsApp Business Account found');
    }

    logger.info(`✅ Got WABA ID: ${wabaId}`);

    // Get phone numbers for this WABA
    const phoneUrl = `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers`;
    const phoneResponse = await axios.get(phoneUrl, {
      params: { access_token: accessToken }
    });

    const phones = phoneResponse.data.data || [];
    logger.info(`✅ Found ${phones.length} phone numbers for WABA ${wabaId}`);

    // Save phone numbers to database
    const savedPhones = [];
    for (const phone of phones) {
      const phoneData = {
        phoneNumberId: phone.id,
        wabaId,
        displayName: phone.display_name_address_book || phone.display_name || '',
        displayPhone: phone.phone_number || '',
        phone: phone.phone_number,
        isActive: true,
        accessToken
      };

      const phoneNumber = await PhoneNumber.findOneAndUpdate(
        { phoneNumberId: phone.id },
        phoneData,
        { upsert: true, new: true }
      );

      savedPhones.push(phoneNumber);
      logger.info(`✅ Saved phone: ${phone.phone_number} (ID: ${phone.id})`);
    }

    // Update account with WABA ID and access token
    const updatedAccount = await Account.findOneAndUpdate(
      { accountId },
      {
        wabaId,
        accessToken,
        whatsappConfig: {
          wabaId,
          accessToken,
          connectedAt: new Date()
        }
      },
      { new: true }
    );

    logger.info(`✅ WhatsApp OAuth successful for ${accountId}. Connected ${savedPhones.length} phone numbers.`);

    return sendSuccess(res, {
      accessToken,
      wabaId,
      phoneNumbers: savedPhones.map(p => ({
        _id: p._id,
        phoneNumberId: p.phoneNumberId,
        wabaId: p.wabaId,
        displayName: p.displayName,
        displayPhone: p.displayPhone,
        isActive: p.isActive
      }))
    }, `WhatsApp OAuth successful. Connected ${savedPhones.length} phone number(s)`);

  } catch (error) {
    logger.error('❌ WhatsApp OAuth error:', error.response?.data || error.message);
    return handleControllerError(res, error, 'handleWhatsAppOAuth');
  }
};

export const getWhatsAppStatus = async (req, res) => {
  try {
    const accountId = req.account.accountId;

    const account = await Account.findOne({ accountId }).select('wabaId accessToken whatsappConfig');

    if (!account?.wabaId) {
      return sendSuccess(res, { status: 'disconnected', phoneNumbers: [] }, 'WhatsApp not connected');
    }

    // Fetch connected phone numbers
    const phoneNumbers = await PhoneNumber.find({ wabaId: account.wabaId }).select(
      '_id phoneNumberId wabaId displayName displayPhone isActive'
    );

    logger.info(`✅ Retrieved ${phoneNumbers.length} phone numbers for WABA ${account.wabaId}`);

    return sendSuccess(res, {
      status: 'connected',
      wabaId: account.wabaId,
      phoneNumbers
    }, 'WhatsApp status retrieved');

  } catch (error) {
    return handleControllerError(res, error, 'getWhatsAppStatus');
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
  getWhatsAppStatus,
  disconnectWhatsApp
};
