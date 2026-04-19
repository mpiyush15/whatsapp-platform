import { sendSuccess, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';
import { recordOAuthInitiation as recordSession } from '../utils/oauthSessionStore.js';

/**
 * Get WhatsApp connection status for the current account
 * Returns: Is connected? Phone numbers? WABA ID?
 */
export const getWhatsAppStatus = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    
    const Account = mongoose.model('Account');
    const PhoneNumber = mongoose.model('PhoneNumber');
    
    // Get account info
    const account = await Account.findOne({ accountId }).select('wabaId isWhatsAppConnected accountId');
    
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    
    logger.info(`📊 Status check for account ${accountId}`);
    
    // If no WABA connected, return not connected
    if (!account.wabaId) {
      logger.info(`⏳ Account ${accountId}: Not connected yet`);
      return sendSuccess(res, {
        connected: false,
        wabaId: null,
        phoneNumbers: [],
        message: 'Waiting for WhatsApp authorization...'
      });
    }
    
    // Get phone numbers for this WABA
    const phoneNumbers = await PhoneNumber.find({ wabaId: account.wabaId }).select(
      '_id phoneNumberId displayName displayPhone phone isActive verifiedAt qualityRating'
    );
    
    logger.info(`✅ Account ${accountId}: Connected | WABA: ${account.wabaId} | Phones: ${phoneNumbers.length}`);
    
    return sendSuccess(res, {
      connected: true,
      wabaId: account.wabaId,
      phoneNumbers: phoneNumbers.map(p => ({
        _id: p._id,
        phoneNumberId: p.phoneNumberId,
        displayName: p.displayName,
        displayPhone: p.displayPhone,
        phone: p.phone,
        isActive: p.isActive,
        verifiedAt: p.verifiedAt,
        qualityRating: p.qualityRating
      })),
      message: `Connected with ${phoneNumbers.length} phone number(s)`
    });
  } catch (error) {
    logger.error('❌ Error getting WhatsApp status:', error.message);
    return handleControllerError(res, error, 'getWhatsAppStatus');
  }
};

/**
 * Disconnect WhatsApp for the current account
 */
export const disconnectWhatsApp = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    
    const Account = mongoose.model('Account');
    const PhoneNumber = mongoose.model('PhoneNumber');
    
    // Get account and find WABA
    const account = await Account.findOne({ accountId });
    
    if (!account?.wabaId) {
      return sendSuccess(res, { message: 'Not connected' });
    }
    
    // Delete all phone numbers for this WABA
    await PhoneNumber.deleteMany({ wabaId: account.wabaId });
    
    // Update account
    await Account.findOneAndUpdate(
      { accountId },
      {
        wabaId: null,
        isWhatsAppConnected: false,
        whatsappConfig: {}
      }
    );
    
    logger.info(`✅ WhatsApp disconnected for account ${accountId}`);
    
    return sendSuccess(res, { message: 'WhatsApp disconnected' });
  } catch (error) {
    return handleControllerError(res, error, 'disconnectWhatsApp');
  }
};

/**
 * Record OAuth initiation for account
 * Called when user clicks "Connect WhatsApp" button
 * Used to link webhook response to correct account
 */
export const recordOAuthInitiation = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    
    logger.info(`📋 OAuth session initiated for account: ${accountId}`);
    logger.info(`🔔 Recording OAuth initiation at ${new Date().toISOString()}`);
    recordSession(accountId);
    logger.info(`✅ OAuth session recorded successfully`);
    
    return sendSuccess(res, { message: 'OAuth initiation recorded', accountId });
  } catch (error) {
    logger.error(`❌ Error recording OAuth initiation:`, error.message);
    return handleControllerError(res, error, 'recordOAuthInitiation');
  }
};

export default { getWhatsAppStatus, disconnectWhatsApp, recordOAuthInitiation };
