import { sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import { getRecentOAuthSession } from '../utils/oauthSessionStore.js';
import mongoose from 'mongoose';

export const registerWebhook = async (req, res) => {
  try {
    const { url, events } = req.body;

    if (!url || !events) {
      return sendValidationError(res, 'URL and events required');
    }

    logger.info('🪝 Webhook registered:', { url, events: events.length });

    return sendSuccess(res, {
      webhookId: `hook_${Date.now()}`,
      url,
      events,
      status: 'active'
    }, 'Webhook registered');
  } catch (error) {
    return handleControllerError(res, error, 'registerWebhook');
  }
};

export const listWebhooks = async (req, res) => {
  try {
    return sendSuccess(res, { webhooks: [] }, 'Webhooks retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listWebhooks');
  }
};

export const deleteWebhook = async (req, res) => {
  try {
    const { webhookId } = req.params;
    return sendSuccess(res, { webhookId }, 'Webhook deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteWebhook');
  }
};

export const handleWebhook = async (req, res) => {
  try {
    const body = req.body;
    
    logger.info('🔍 FULL WEBHOOK PAYLOAD:', JSON.stringify(body, null, 2));
    
    // Meta WhatsApp sends webhooks in this format:
    // { object: "whatsapp_business_account", entry: [{ id: "waba_id", changes: [{ field, value }] }] }
    
    if (body.object === 'whatsapp_business_account') {
      logger.info('✅ WhatsApp webhook received from Meta');
      logger.info(`📦 FULL WEBHOOK BODY:`, JSON.stringify(body, null, 2));
      
      const entries = body.entry || [];
      const Account = mongoose.model('Account');
      const PhoneNumber = mongoose.model('PhoneNumber');
      
      for (const entry of entries) {
        const wabaId = entry.id;
        const changes = entry.changes || [];
        
        logger.info(`📍 Entry ID (WABA): ${wabaId}`);
        logger.info(`📍 Changes count: ${changes.length}`);
        
        for (const change of changes) {
          const field = change.field;
          const value = change.value || {};
          
          logger.info(`🔍 Field: ${field} | WABA: ${wabaId}`);
          logger.info(`📋 Full value payload:`, JSON.stringify(value, null, 2));
          logger.info(`📋 Value keys:`, Object.keys(value));
          
          // ⭐ Handle account updates - this is when user authorizes WhatsApp
          if (field === 'account_update') {
            logger.info(`🔔 Account Update Event Received for WABA: ${wabaId}`);
            
            // Meta sends account_update with phone number info directly
            // Structure: { display_phone_number, requested_verified_name, rejection_reason, ... }
            const displayPhoneNumber = value.display_phone_number;
            const displayName = value.requested_verified_name || 'WhatsApp Business Account';
            
            logger.info(`📱 Account Update - Phone: ${displayPhoneNumber}, Name: ${displayName}`);
            
            if (displayPhoneNumber) {
              try {
                // Create phone number entry from account_update data
                const phoneEntry = {
                  phoneNumberId: wabaId, // Use WABA ID as phone number ID (Meta doesn't provide separate ID in account_update)
                  wabaId,
                  displayName,
                  displayPhone: displayPhoneNumber,
                  phone: displayPhoneNumber,
                  isActive: true,
                  verifiedAt: new Date(),
                  qualityRating: 'UNKNOWN'
                };
                
                logger.info(`💾 Saving phone: ${displayPhoneNumber} | Name: ${displayName}`);
                
                const savedPhone = await PhoneNumber.findOneAndUpdate(
                  { phoneNumberId: phoneEntry.phoneNumberId },
                  phoneEntry,
                  { upsert: true, new: true }
                );
                
                logger.info(`✅ Phone saved: ${savedPhone._id}`);
              } catch (phoneError) {
                logger.error(`❌ Error saving phone:`, phoneError.message);
              }
            } else {
              logger.warn(`⚠️ No phone number in account_update`);
            }
            
            // Find account - first try to find from recent OAuth initiation
            let accountIdToUpdate = null;
            let account = null;
            
            try {
              // Check for recent OAuth initiation (within last 5 minutes)
              const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
              
              const recentOAuth = await Account.findOne({
                'metaSync.oauthInitiatedAt': { $gte: fiveMinutesAgo },
                'metaSync.status': 'oauth_in_progress'
              }).sort({ 'metaSync.oauthInitiatedAt': -1 });
              
              if (recentOAuth) {
                accountIdToUpdate = recentOAuth.accountId;
                logger.info(`🔗 Found account from recent OAuth: ${accountIdToUpdate}`);
              } else {
                // Fallback: Try to find by WABA ID (for manual linking)
                account = await Account.findOne({ wabaId });
                if (account) {
                  accountIdToUpdate = account.accountId;
                  logger.info(`⏳ Found account by existing WABA ID: ${accountIdToUpdate}`);
                }
              }
              
              if (accountIdToUpdate) {
                // Update account with WABA ID
                account = await Account.findOneAndUpdate(
                  { accountId: accountIdToUpdate },
                  {
                    wabaId,
                    isWhatsAppConnected: true,
                    whatsappConfig: {
                      wabaId,
                      connectedAt: new Date()
                    },
                    'metaSync.status': 'connected',
                    'metaSync.oauthInitiatedAt': null
                  },
                  { new: true }
                );
              }
              
              if (account) {
                logger.info(`✅ Account updated with WABA: ${wabaId} | Account: ${account.accountId}`);
              } else {
                logger.warn(`⚠️ Could not find account to link with WABA: ${wabaId}`);
              }
            } catch (accountError) {
              logger.error(`❌ Error updating account:`, accountError.message);
            }
          }
          
          // Handle incoming messages
          else if (field === 'messages') {
            const messages = value.messages || [];
            const contacts = value.contacts || [];
            const metadata = value.metadata || {};
            
            logger.info(`💬 ${messages.length} message(s) received`);
            
            for (const message of messages) {
              const { from, id: messageId, timestamp, type, text, media, interactive, button, image, audio, document, video } = message;
              
              logger.info(`📩 Message from ${from} | Type: ${type} | ID: ${messageId}`);
              
              // Extract message content based on type
              let content = '';
              if (type === 'text' && text) {
                content = text.body;
              } else if (type === 'image' && media) {
                content = `[Image: ${media.id}]`;
              } else if (type === 'document' && media) {
                content = `[Document: ${media.id}]`;
              } else if (type === 'audio' && media) {
                content = `[Audio: ${media.id}]`;
              } else if (type === 'video' && media) {
                content = `[Video: ${media.id}]`;
              } else if (type === 'button' && button) {
                content = button.text;
              } else if (type === 'interactive' && interactive) {
                content = interactive.button_reply?.title || interactive.list_reply?.title || 'Interactive message';
              }
              
              logger.info(`📝 Content: ${content.substring(0, 50)}`);
            }
          }
          
          // Handle message status updates (delivered, read, failed, etc.)
          else if (field === 'message_status') {
            const statuses = value.statuses || [];
            
            logger.info(`📨 ${statuses.length} status update(s)`);
            
            for (const status of statuses) {
              const { id: messageId, status: msgStatus, timestamp, recipient_id, errors } = status;
              
              logger.info(`📊 Message ${messageId}: ${msgStatus} at ${new Date(timestamp * 1000).toISOString()}`);
              
              if (errors) {
                logger.warn(`⚠️ Error for message ${messageId}:`, errors);
              }
            }
          }
          
          // Handle template status updates
          else if (field === 'message_template_status_update') {
            const templates = value.message_template_status_update || [];
            logger.info(`📝 ${templates.length} template status update(s)`);
          }
          
          // Handle account updates (phone number verified, etc.)
          else if (field === 'account_updates') {
            logger.info(`🔄 Account update received`);
          }
        }
      }
      
      // Always return 200 immediately so Meta knows we received it
      return sendSuccess(res, { processed: true }, 'WhatsApp webhook processed');
    }
    
    // Fallback for non-Meta webhooks
    const { event, data } = body;
    logger.info('🪝 Generic webhook received:', { event });
    return sendSuccess(res, { processed: true }, 'Webhook handled');
  } catch (error) {
    logger.error('❌ Webhook handler error:', error);
    return handleControllerError(res, error, 'handleWebhook');
  }
};

export const verifyWebhook = async (req, res) => {
  try {
    const { signature } = req.headers;
    return sendSuccess(res, { verified: true }, 'Webhook verified');
  } catch (error) {
    return handleControllerError(res, error, 'verifyWebhook');
  }
};

export default { 
  registerWebhook, 
  listWebhooks, 
  deleteWebhook,
  handleWebhook,
  verifyWebhook
};
