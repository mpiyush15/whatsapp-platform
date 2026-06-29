import { sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import { getRecentOAuthSession } from '../utils/oauthSessionStore.js';
import mongoose from 'mongoose';
import axios from 'axios';
import { uploadToS3 } from '../services/s3Service.js';
import Account from '../models/Account.js';
import PhoneNumber from '../models/PhoneNumber.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Campaign from '../models/Campaign.js';
import Contact from '../models/Contact.js';
import Template from '../models/Template.js';
import { dispatchWebhookEvent } from '../services/webhookDispatcherService.js';
import {
  attributeInboundReplyToCampaign,
  refreshCampaignStatsFromMessages,
} from '../services/campaignStatsService.js';
import whatsappService from '../services/whatsappService.js';
import { upsertEducationEnquiry } from '../services/educationEnquirySyncService.js';
import { resolveProjectIdForPhone } from '../services/chatbotContextService.js';
import { resolveProjectIdForAccountPhone } from '../services/projectScopeResolver.js';

// In‑memory set to remember processed message IDs during the process lifetime
const processedWaMessageIds = new Set();

const normalizeWebhookPhone = (value = '') => String(value || '').replace(/[\s+()-]/g, '');

async function promoteCampaignReplyToEducationEnquiry({
  accountId,
  campaignId,
  fallbackProjectId,
  customerPhone,
  customerName,
  content,
}) {
  if (!campaignId || !customerPhone) return null;

  const campaign = await Campaign.findOne({ _id: campaignId, accountId })
    .select('projectId name')
    .lean();
  const projectId = campaign?.projectId || fallbackProjectId || null;
  if (!projectId) return null;

  const enquiry = await upsertEducationEnquiry({
    accountId,
    projectId,
    phone: customerPhone,
    name: customerName,
    notes: content ? `Campaign reply: ${content}` : `Replied to campaign ${campaign?.name || campaignId}`,
    source: campaign?.name ? `Campaign: ${campaign.name}` : 'Campaign reply',
    responses: {
      campaignId: String(campaignId),
      campaignName: campaign?.name || '',
      reply: content || '',
    },
  });

  if (!enquiry?._id) return null;

  await Contact.updateOne(
    {
      accountId,
      projectId,
      $or: [
        { whatsappNumber: customerPhone },
        { phone: customerPhone },
      ],
    },
    {
      $addToSet: { tags: { $each: ['enquiry', 'campaign-replied'] } },
      $set: {
        type: 'lead',
        lastMessageAt: new Date(),
        'metadata.educationEnquiryId': String(enquiry._id),
        'metadata.lastCampaignReplyId': String(campaignId),
      },
    }
  );

  return enquiry;
}

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
      // Account imported at top
      // PhoneNumber imported at top
      
      for (const entry of entries) {
        // Extract actual WABA ID from webhook payload (not entry.id which is internal ID)
        const wabaId = entry.changes?.[0]?.value?.waba_info?.waba_id || entry.id;
        const changes = entry.changes || [];
        
        logger.info(`📍 Entry ID (webhook): ${entry.id}`);
        logger.info(`📍 WABA ID (account): ${wabaId}`);
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
          
          // Handle incoming messages + status updates
          else if (field === 'messages') {
            const messages = value.messages || [];
            const contacts = value.contacts || [];
            const metadata = value.metadata || {};
            const statuses = value.statuses || [];
            
            logger.info(`💬 ${messages.length} message(s) received`);
            
            // Message imported at top
            // Conversation imported at top
            
            for (const message of messages) {
              const { from, id: messageId, timestamp, type, text, media, interactive, button, image, audio, document, video } = message;
// Early idempotency guard – prevents duplicate processing before any DB work
const existingMsgEarly = await Message.findOne({ waMessageId: messageId });
if (existingMsgEarly) {
  logger.info(`⚠️ Duplicate inbound message ignored (early): ${messageId}`);
  continue;
}
logger.info(`📩 Message from ${from} | Type: ${type} | ID: ${messageId}`);
              
              try {
                // Find account by WABA ID FIRST (needed for media URL fetching)
                logger.info(`🔍 Searching for account with WABA: ${wabaId}`);
                
                let accountRecord = await Account.findOne({ 'whatsappConfig.wabaId': wabaId }).select('+whatsappAccessToken');
                if (!accountRecord && metadata?.phone_number_id) {
                  logger.warn(`⚠️ WABA ${wabaId} not found. Fallback: searching by phone_number_id ${metadata.phone_number_id}`);
                  const phoneRecord = await PhoneNumber.findOne({ phoneNumberId: metadata.phone_number_id });
                  if (phoneRecord) {
                    accountRecord = await Account.findOne({ accountId: phoneRecord.accountId }).select('+whatsappAccessToken');
                  }
                }
                
                if (!accountRecord) {
                  logger.warn(`⚠️ Could not find account for WABA ${wabaId} or phone ${metadata?.phone_number_id}`);
                  continue;
                }
                
                logger.info(`✅ Account found: ${accountRecord.accountId}`);
                logger.info(`🔑 Token available: ${!!accountRecord.whatsappAccessToken}`);
                
                // Extract message content based on type
                let content = '';
                let mediaUrl = null;
                let mediaType = null;
                let mediaId = null;
                let mimeType = null;
                let filename = null;
                
                if (type === 'text' && text) {
                  content = text.body;
                } else if (type === 'image' && image) {
                  content = '';
                  mediaType = 'image';
                  mediaId = image.id;
                  mimeType = image.mime_type || 'image/jpeg';
                  // Store temporary URL - will download to S3 below
                  mediaUrl = image.url || image.link;
                } else if (type === 'document' && document) {
                  content = '';
                  mediaType = 'document';
                  mediaId = document.id;
                  mimeType = document.mime_type || 'application/pdf';
                  filename = document.filename;
                  // Store temporary URL - will download to S3 below
                  mediaUrl = document.url || document.link;
                } else if (type === 'audio' && audio) {
                  content = '';
                  mediaType = 'audio';
                  mediaId = audio.id;
                  mimeType = audio.mime_type || 'audio/aac';
                  // Store temporary URL - will download to S3 below
                  mediaUrl = audio.url || audio.link;
                } else if (type === 'video' && video) {
                  content = '';
                  mediaType = 'video';
                  mediaId = video.id;
                  mimeType = video.mime_type || 'video/mp4';
                  // Store temporary URL - will download to S3 below
                  mediaUrl = video.url || video.link;
                } else if (type === 'button' && button) {
                  content = button.text || button.payload || '';
                } else if (type === 'interactive' && interactive) {
                  content =
                    interactive.button_reply?.title ||
                    interactive.list_reply?.title ||
                    'Interactive message';
                }

                const chatbotPayload = {
                  buttonId:
                    interactive?.button_reply?.id ||
                    button?.payload ||
                    null,
                  listItemId: interactive?.list_reply?.id || null,
                };
                
                logger.info(`📝 Content: ${content.substring(0, 50)}`);
                
                // � CRITICAL FIX: Follow exact documented flow
                // Step 1: Extract mediaId
                // Step 2: Get media URL from Meta API (with token)
                // Step 3: Download file with auth
                // Step 4: Upload to S3
                // Step 5: Save S3 URL in DB (NEVER temp URL)
                
                if (mediaId && accountRecord.whatsappAccessToken) {
                  try {
                    logger.info(`🔄 MEDIA DOWNLOAD FLOW START`);
                    logger.info(`📍 mediaId: ${mediaId}`);
                    logger.info(`🔑 accessToken exists: YES`);
                    
                    // Step 1+2: Get media URL from Meta API
                    logger.info(`📡 Calling Meta API to get media URL...`);
                    const metaResponse = await axios.get(
                      `https://graph.facebook.com/v19.0/${mediaId}`,
                      {
                        headers: {
                          Authorization: `Bearer ${accountRecord.whatsappAccessToken}`,
                        },
                        timeout: 30000
                      }
                    );
                    
                    const metaMediaUrl = metaResponse.data.url;
                    logger.info(`✅ Got media URL from Meta API`);
                    
                    // Step 3: Download file with auth
                    logger.info(`📥 Downloading file with auth...`);
                    const mediaResponse = await axios.get(metaMediaUrl, {
                      headers: {
                        Authorization: `Bearer ${accountRecord.whatsappAccessToken}`,
                      },
                      responseType: 'arraybuffer',
                      timeout: 30000
                    });
                    
                    const buffer = Buffer.from(mediaResponse.data);
                    logger.info(`✅ Downloaded ${(buffer.length / 1024).toFixed(2)}KB`);
                    
                    if (buffer.length === 0) {
                      throw new Error('Downloaded buffer is empty');
                    }
                    
                    // Step 4: Upload to S3
                    logger.info(`☁️  Uploading to S3...`);
                    const { s3Url, s3Key } = await uploadToS3(
                      buffer,
                      accountRecord.accountId,
                      mediaType,
                      mimeType,
                      filename
                    );
                    
                    logger.info(`✅ Uploaded to S3: ${s3Key}`);
                    
                    // Step 5: Save S3 URL (NEVER temp URL)
                    mediaUrl = s3Url;
                    logger.info(`🎯 Using S3 URL (permanent)`);
                    logger.info(`🔄 MEDIA DOWNLOAD FLOW COMPLETE`);
                    
                  } catch (mediaError) {
                    logger.error(`❌ Media download failed:`, mediaError.message);
                    if (mediaError.response?.status) {
                      logger.error(`  HTTP ${mediaError.response.status}`);
                    }
                    logger.warn(`⚠️  Falling back to temp URL (will fail in ~5 mins)`);
                  }
                } else {
                  logger.warn(`⚠️  Cannot download - mediaId=${!!mediaId}, token=${!!accountRecord.whatsappAccessToken}`);
                }
                
                const accountId = accountRecord.accountId;
                const phoneNumberId = metadata.phone_number_id;
                const customerPhone = from;
                const customerName = contacts?.[0]?.profile?.name || 'Customer';
                
                // Generate conversationId (unique per account + phone + customer)
                const conversationId = `${accountId}_${phoneNumberId}_${customerPhone}`;
                
                logger.info(`💾 Saving message: ConversationID=${conversationId}, Account=${accountId}`);

                const cleanCustomerPhone = normalizeWebhookPhone(customerPhone);
                const attributedCampaignId = await attributeInboundReplyToCampaign(
                  accountId,
                  phoneNumberId,
                  cleanCustomerPhone
                );
                const inboundProjectId = await resolveProjectIdForAccountPhone(
                  accountId,
                  phoneNumberId
                );

                // Idempotency: guard against duplicate inbound messages
                const existingMsg = await Message.findOne({ waMessageId: messageId });
                if (existingMsg) {
                  logger.info(`⚠️ Duplicate inbound message ignored: ${messageId}`);
                  // Skip further processing for this duplicate
                  continue;
                }

                // Save message to Message collection
                const savedMessage = await Message.create({
                  accountId,
                  projectId: inboundProjectId,
                  phoneNumberId,
                  conversationId,
                  waMessageId: messageId,
                  recipientPhone: cleanCustomerPhone,
                  recipientName: customerName,
                  messageType: type,
                  direction: 'inbound',
                  content: { text: content, mediaUrl: mediaUrl, mediaType },
                  status: 'delivered',
                  sentAt: new Date(timestamp * 1000),
                  ...(attributedCampaignId ? { campaign: attributedCampaignId } : {}),
                });

                logger.info(`✅ Message saved to DB: ${savedMessage._id}`);
                if (attributedCampaignId) {
                  logger.info(`📊 Inbound reply attributed to campaign ${attributedCampaignId}`);
                  await promoteCampaignReplyToEducationEnquiry({
                    accountId,
                    campaignId: attributedCampaignId,
                    fallbackProjectId: inboundProjectId,
                    customerPhone: cleanCustomerPhone,
                    customerName,
                    content,
                  });
                  await refreshCampaignStatsFromMessages(attributedCampaignId, accountId);
                }
                
                // Update or create Conversation
                const updatedConversation = await Conversation.findOneAndUpdate(
                  { conversationId },
                  {
                    accountId,
                    phoneNumberId,
                    conversationId,
                    userPhone: customerPhone,
                    userName: customerName,
                    lastMessageAt: new Date(timestamp * 1000),
                    lastMessagePreview: content.substring(0, 100),
                    lastMessageType: type,
                    hasInboundMessage: true,
                    unreadCount: (await Conversation.findOne({ conversationId }))?.unreadCount + 1 || 1,
                    status: 'open',
                    messageCount: (await Conversation.findOne({ conversationId }))?.messageCount + 1 || 1,
                    ...(inboundProjectId ? { projectId: inboundProjectId } : {}),
                  },
                  { upsert: true, new: true }
                );
                
                logger.info(`✅ Conversation updated: ${updatedConversation._id}`);

                dispatchWebhookEvent({
                  accountId,
                  projectId: updatedConversation?.projectId || null,
                  eventType: 'message.received',
                  payload: {
                    conversationId,
                    messageId: String(savedMessage?._id || ''),
                    waMessageId: messageId,
                    from: customerPhone,
                    type,
                    text: content,
                  },
                  source: 'whatsapp-webhook',
                }).catch((err) => logger.error('message.received webhook dispatch failed', err));
                
                // Emit real-time event for agents to specific conversation room
                if (req.app.locals.io) {
                  const conversationRoomName = `conversation:${conversationId}`;
                  
                  // Debug log for media
                  logger.info(`🎬 EMITTING MESSAGE - Type: ${type}, MediaType: ${mediaType}, MediaUrl: ${mediaUrl?.substring(0, 80)}...`);
                  
                  // Emit to specific conversation room (where agents are viewing this conversation)
                  req.app.locals.io.to(conversationRoomName).emit('new_message', {
                    _id: savedMessage._id,
                    conversationId: conversationId,
                    senderRole: 'customer',
                    senderName: customerName,
                    senderPhone: from,
                    text: content,
                    mediaUrl: mediaUrl,
                    mediaType: mediaType,
                    status: 'delivered',
                    createdAt: new Date(timestamp * 1000)
                  });
                  
                  // Also emit account-wide to update conversation list
                  const conversationUpdatePayload = {
                    conversationId,
                    _id: updatedConversation?._id,
                    phoneNumberId,
                    unreadCount: updatedConversation?.unreadCount,
                    lastMessagePreview: content.substring(0, 100),
                    lastMessageAt: new Date(timestamp * 1000),
                    lastMessageType: type
                  };

                  req.app.locals.io.to(`account:${accountId}`).emit('conversation_updated', conversationUpdatePayload);
                  req.app.locals.io.to(`user:${accountId}`).emit('conversation_updated', conversationUpdatePayload);
                  
                  logger.info(`📡 Events emitted to room: ${conversationRoomName}`);
                }
                
                logger.info(`📡 Real-time events emitted for account ${accountId}`);

                const chatbotText = String(content || '').trim();
                const canRunChatbot =
                  chatbotText &&
                  ['text', 'button', 'interactive'].includes(type);

                if (canRunChatbot) {
                  const phoneId = metadata.phone_number_id;
                  const customerPhone = from;
                  setImmediate(async () => {
                    try {
                      const projectId = await resolveProjectIdForPhone(
                        accountId,
                        phoneId
                      );
                      await whatsappService.processIncomingMessage(
                        accountId,
                        phoneId,
                        customerPhone,
                        chatbotText,
                        customerName,
                        {
                          buttonId: chatbotPayload.buttonId || undefined,
                          listItemId: chatbotPayload.listItemId || undefined,
                          projectId,
                        }
                      );
                    } catch (chatbotErr) {
                      logger.error('❌ Chatbot processing failed:', chatbotErr.message);
                    }
                  });
                }
                
              } catch (messageError) {
                logger.error(`❌ Error saving message:`, messageError.message);
              }
            }

            if (statuses.length > 0) {
              logger.info(`📨 ${statuses.length} status update(s)`);

              for (const statusEvent of statuses) {
                const { id: waMessageId, status: msgStatus, timestamp, errors } = statusEvent;
                logger.info(`📊 Message ${waMessageId}: ${msgStatus} at ${new Date(Number(timestamp) * 1000).toISOString()}`);

                const messageDoc = await Message.findOne({ waMessageId });
                if (!messageDoc) {
                  logger.warn(`⚠️ Status webhook received for unknown message: ${waMessageId}`);
                  continue;
                }

                const mappedStatus = ['sent', 'delivered', 'read', 'failed'].includes(String(msgStatus))
                  ? String(msgStatus)
                  : messageDoc.status;

                messageDoc.status = mappedStatus;

                if (mappedStatus === 'delivered' && !messageDoc.deliveredAt) {
                  messageDoc.deliveredAt = new Date(Number(timestamp) * 1000);
                }
                if (mappedStatus === 'read' && !messageDoc.readAt) {
                  messageDoc.readAt = new Date(Number(timestamp) * 1000);
                  
                  // Auto-capture lead if read and from campaign
                  if (messageDoc.campaign && messageDoc.campaign !== 'manual') {
                    try {
                      const { captureLeadFromCampaignEngagement } = await import('../services/leadService.js');
                      await captureLeadFromCampaignEngagement(
                        messageDoc.accountId,
                        messageDoc.conversationId,
                        messageDoc.campaign,
                        'read'
                      );
                    } catch (err) {
                      logger.error('Failed to auto-capture lead on read:', err.message);
                    }
                  }
                }
                if (mappedStatus === 'failed' && !messageDoc.failedAt) {
                  messageDoc.failedAt = new Date(Number(timestamp) * 1000);
                  messageDoc.errorCode = errors?.[0]?.code ? String(errors[0].code) : messageDoc.errorCode;
                  messageDoc.errorMessage = errors?.[0]?.title || errors?.[0]?.message || messageDoc.errorMessage;
                }

                messageDoc.statusUpdates.push({
                  status: mappedStatus,
                  timestamp: new Date(Number(timestamp) * 1000),
                  errorCode: errors?.[0]?.code ? String(errors[0].code) : undefined,
                  errorMessage: errors?.[0]?.title || errors?.[0]?.message || undefined
                });

                await messageDoc.save();

                if (req.app.locals.io && messageDoc.conversationId) {
                  req.app.locals.io.to(`conversation:${messageDoc.conversationId}`).emit('message_status_updated', {
                    messageId: messageDoc._id,
                    waMessageId,
                    status: mappedStatus,
                    timestamp: new Date(Number(timestamp) * 1000)
                  });
                }

                if (messageDoc.campaign && messageDoc.campaign !== 'manual') {
                  await refreshCampaignStatsFromMessages(messageDoc.campaign, messageDoc.accountId).catch(
                    (err) => logger.error('Campaign stats refresh failed:', err.message)
                  );
                }
              }
            }
          }
          
          // Handle template status updates
          else if (field === 'message_template_status_update') {
            const updates = Array.isArray(value) ? value : [value];
            logger.info(`📝 ${updates.length} template status update(s)`);
            
            for (const update of updates) {
              try {
                const eventType = update.event; // e.g. "APPROVED", "REJECTED"
                const templateId = update.message_template_id;
                const templateName = update.message_template_name;
                const reason = update.reason;
                
                if (templateId || templateName) {
                  let dbStatus = 'pending';
                  if (eventType === 'APPROVED') dbStatus = 'approved';
                  else if (eventType === 'REJECTED') dbStatus = 'rejected';
                  
                  const updateFields = {
                    status: dbStatus,
                    lastSyncedAt: new Date()
                  };
                  
                  if (eventType === 'REJECTED' && reason) {
                    updateFields.rejectedReason = reason;
                    updateFields.rejectedAt = new Date();
                  } else if (eventType === 'APPROVED') {
                    updateFields.approvedAt = new Date();
                  }
                  
                  // Meta might not always send ID, sometimes name
                  const query = templateId ? { metaTemplateId: String(templateId) } : { name: templateName };
                  
                  const updatedTemplate = await Template.findOneAndUpdate(
                    query,
                    { $set: updateFields },
                    { new: true }
                  );
                  
                  if (updatedTemplate) {
                    logger.info(`✅ Template ${updatedTemplate.name} status updated to ${dbStatus} via webhook`);
                    
                    if (req.app.locals.io && updatedTemplate.accountId) {
                      req.app.locals.io.to(`account:${updatedTemplate.accountId}`).emit('template_status_updated', {
                        templateId: updatedTemplate._id,
                        metaTemplateId: updatedTemplate.metaTemplateId,
                        status: dbStatus
                      });
                    }
                  } else {
                    logger.warn(`⚠️ Template not found in DB for webhook update: ${templateId || templateName}`);
                  }
                }
              } catch (err) {
                logger.error('❌ Error processing template status update:', err.message);
              }
            }
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
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    // Check if a token and mode is in the query string of the request
    if (mode && token) {
      // Check the mode and token sent is correct
      if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
        // Respond with the challenge token from the request (raw text, NOT json)
        logger.info('✅ Webhook verified successfully by Meta');
        return res.status(200).send(challenge);
      } else {
        // Respond with '403 Forbidden' if verify tokens do not match
        logger.warn('❌ Webhook verification failed: Invalid token');
        return res.sendStatus(403);
      }
    }
    
    return sendSuccess(res, { verified: false }, 'No verification query params found');
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
