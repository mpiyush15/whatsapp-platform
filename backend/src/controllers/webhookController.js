import axios from 'axios';
import whatsappService from '../services/whatsappService.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Contact from '../models/Contact.js';
import PhoneNumber from '../models/PhoneNumber.js';
import Account from '../models/Account.js';
import FailedMessage from '../models/FailedMessage.js';
import { downloadAndUploadMedia, getMediaTypeFromMime } from '../services/s3Service.js';
import { broadcastNewMessage, broadcastConversationUpdate, broadcastReceivedMessage } from '../services/socketService.js';

/**
 * Webhook Controller for WhatsApp Cloud API
 * Handles verification, incoming messages, and status updates
 */

// Socket.io instance (passed from app.js)
let io = null;

export const setSocketIO = (socketIOInstance) => {
  io = socketIOInstance;
};

/**
 * Fetch phone numbers from Meta API and create PhoneNumber entries
 * Called after OAuth webhook is received with WABA ID
 */
const fetchAndCreatePhoneNumbers = async (wabaId, accountId, accessToken) => {
  try {
    console.log('\n📱 ========== FETCHING PHONE NUMBERS FROM META ==========');
    console.log('WABA ID:', wabaId);
    console.log('Account ID:', accountId);
    console.log('Access Token:', accessToken ? '✅ Present' : '❌ Missing');
    
    if (!accessToken) {
      console.warn('⚠️ No access token available - cannot fetch phone numbers');
      console.warn('   Skipping phone number fetch. User may need to reconnect.');
      return false;
    }
    
    if (!wabaId) {
      console.warn('⚠️ No WABA ID available - cannot fetch phone numbers');
      return false;
    }
    
    // Fetch phone numbers from Meta's /me/phone_numbers endpoint
    const response = await axios.get(
      `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,phone_number,quality_rating,name_status,display_phone_number'
        }
      }
    );
    
    const phones = response.data?.data || [];
    console.log(`✅ Fetched ${phones.length} phone number(s) from Meta`);
    
    if (phones.length === 0) {
      console.warn('⚠️ No phone numbers found in Meta for WABA:', wabaId);
      return false;
    }
    
    // Create PhoneNumber entries for each phone
    const createdPhones = [];
    for (const phone of phones) {
      try {
        const phoneNumberId = phone.id;
        
        console.log(`\n  📱 Processing phone: ${phone.display_phone_number || phone.id}`);
        
        // Check if phone already exists for this account
        const existing = await PhoneNumber.findOne({
          accountId,
          phoneNumberId
        });
        
        if (existing) {
          console.log(`     ⚠️ Phone already exists in DB, skipping creation`);
          createdPhones.push(existing);
          continue;
        }
        
        // Create new PhoneNumber entry
        const phoneNumber = await PhoneNumber.create({
          accountId,
          phoneNumberId,
          wabaId,
          accessToken,
          displayPhone: phone.display_phone_number || phoneNumberId,
          displayName: phone.name || 'WhatsApp Business',
          qualityRating: (phone.quality_rating || 'unknown').toLowerCase(), // Meta returns uppercase (GREEN, YELLOW, RED)
          verifiedName: phone.name_status || 'Not verified',
          isActive: createdPhones.length === 0, // First phone is active by default
          verifiedAt: new Date()
        });
        
        console.log(`     ✅ Phone number created: ${phoneNumber._id}`);
        createdPhones.push(phoneNumber);
      } catch (phoneError) {
        console.error(`     ❌ Error creating phone number:`, phoneError.message);
        // Continue with next phone instead of failing entire process
        continue;
      }
    }
    
    console.log(`\n✅ Successfully created ${createdPhones.length} phone number entries`);
    console.log('📱 ========== PHONE NUMBER FETCH COMPLETE ==========\n');
    
    return createdPhones.length > 0;
  } catch (error) {
    console.error('❌ Error fetching phone numbers from Meta:', error.message);
    if (error.response?.data) {
      console.error('   Meta API Error:', error.response.data);
    }
    return false;
  }
};

/**
 * GET /api/webhooks/whatsapp - Webhook Verification
 * Meta calls this to verify your webhook endpoint
 */
export const verifyWebhook = (req, res) => {
  console.log('\n🔐 ========== WEBHOOK VERIFICATION ==========');
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  // ✅ FIX 1: Remove hardcoded fallback token - must come from env
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
  
  if (!VERIFY_TOKEN) {
    console.error('❌ CRITICAL: META_VERIFY_TOKEN not set in environment variables');
    console.error('   This will cause webhook verification to fail');
    console.error('   Set: export META_VERIFY_TOKEN="your_verify_token"');
  }
  
  console.log('Mode:', mode);
  console.log('Received Token:', token);
  console.log('Expected Token:', VERIFY_TOKEN ? '✅ Configured' : '❌ NOT SET');
  console.log('Challenge:', challenge);
  console.log('Match:', token === VERIFY_TOKEN ? '✅ YES' : '❌ NO');
  
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully!');
    console.log('Responding with challenge:', challenge);
    console.log('==========================================\n');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification FAILED!');
    console.log('Responding with 403 Forbidden');
    console.log('==========================================\n');
    res.sendStatus(403);
  }
};

/**
 * POST /api/webhooks/whatsapp - Webhook Handler
 * Receives incoming messages and status updates from WhatsApp
 * 
 * ✅ SECURITY: All requests are validated by:
 *    1. X-Hub-Signature-256 HMAC validation (validateWebhookSignature middleware)
 *    2. Hub verify token check (GET request verification)
 * 
 * Only trusted webhooks from Meta reach this handler
 */
export const handleWebhook = async (req, res) => {
  try {
    const body = req.body;
    
    // Acknowledge receipt immediately (CRITICAL for Meta)
    res.sendStatus(200);
    
    // Process webhook data asynchronously
    if (body.object === 'whatsapp_business_account') {
      
      for (const entry of body.entry) {
        
        for (const change of entry.changes) {
          
          if (change.field === 'messages') {
            const value = change.value;
            
            // ========== HANDLE STATUS UPDATES ==========
            if (value.statuses) {
              
              for (const statusUpdate of value.statuses) {
                
                // Update message status in database and broadcast via socket.io
                await whatsappService.handleStatusUpdate(
                  statusUpdate.id,
                  statusUpdate.status,
                  statusUpdate.timestamp,
                  statusUpdate.errors?.[0] || {},
                  io
                );
              }
            } else {
              console.log('⚠️ No status updates in this webhook');
            }
            
            // ========== HANDLE INCOMING MESSAGES ==========
            if (value.messages) {
              
              // Get phone number ID from metadata
              const phoneNumberId = value.metadata?.phone_number_id;
              
              if (!phoneNumberId) {
                console.warn('⚠️ No phone_number_id in webhook metadata, skipping');
                continue;
              }
              
              // ✅ Find account by WABA ID
              const wabaId = entry.id;
              
              let targetAccountId = null;
              let targetAccount = null;
              
              const account = await Account.findOne({ wabaId });
              if (account) {
                targetAccountId = account.accountId;
                targetAccount = account;
              } else {
                const fallbackPhone = await PhoneNumber.findOne({ 
                  phoneNumberId,
                  isActive: true 
                });
                if (!fallbackPhone) {
                  // ✅ FIX 2: Add logging for account lookup failure
                  console.warn('⚠️ Account resolution failed for webhook:', {
                    wabaId: entry.id,
                    phoneNumberId,
                    reason: 'No PhoneNumber config found'
                  });
                  continue;
                }
                const fallbackAccount = await Account.findById(fallbackPhone.accountId);
                if (!fallbackAccount) {
                  // ✅ FIX 2: Add logging for account lookup failure
                  console.warn('⚠️ Account resolution failed for webhook:', {
                    wabaId: entry.id,
                    phoneNumberId,
                    reason: 'Account not found in database'
                  });
                  continue;
                }
                targetAccountId = fallbackPhone.accountId;
                targetAccount = fallbackAccount;
              }
              
              // ✅ FIX 2: Log if account resolution fails
              if (!targetAccountId) {
                console.warn('⚠️ Account resolution failed for webhook:', {
                  wabaId: entry.id,
                  phoneNumberId,
                  fromPhone: value.contacts?.[0]?.phone,
                  reason: 'targetAccountId is null/undefined'
                });
                continue;
              }
              
              // Get phone config
              const phoneConfig = await PhoneNumber.findOne({ 
                accountId: targetAccountId,
                phoneNumberId,
                isActive: true 
              }).select('+accessToken');
              
              if (!phoneConfig) {
                continue;
              }
              
              // ✅ FIX 4: Add account consistency check - ensure accountId is String
              if (typeof phoneConfig.accountId !== 'string') {
                console.error('❌ CRITICAL: Account ID type mismatch!', {
                  type: typeof phoneConfig.accountId,
                  expected: 'string'
                });
                continue;
              }
              
              const accountId = phoneConfig.accountId;
              
              // Verify token is present
              if (!phoneConfig.accessToken) {
                console.error('❌ CRITICAL: accessToken is undefined! Cannot download media.');
              }
              
              // Get sender profile info from contacts (if available)
              const senderProfile = value.contacts?.[0];
              
              for (const message of value.messages) {
                try {
                  // Extract message content based on type
                  let messageType = message.type;
                  let content = {};
                  
                  console.log(`\n📨 PROCESSING MESSAGE - Type: ${message.type}`);
                  console.log(`   From: ${message.from}`);
                  console.log(`   ID: ${message.id}`);
                  console.log(`   Has text: ${!!message.text}`);
                  console.log(`   Has image: ${!!message.image}`);
                  console.log(`   Full message keys: ${Object.keys(message).join(', ')}\n`);
                  
                  switch (message.type) {
                    case 'text':
                      content = { text: message.text.body };
                      break;
                    case 'image':
                      content = {
                        mediaId: message.image.id,
                        mimeType: message.image.mime_type,
                        caption: message.image.caption || null
                      };
                      
                      // Download and upload to S3
                      try {
                        const mediaData = await downloadAndUploadMedia(
                          message.image.id,
                          phoneConfig.accessToken,
                          accountId,
                          'image'
                        );
                        
                        content.mediaUrl = mediaData.s3Url;
                        content.s3Key = mediaData.s3Key;
                        content.filename = mediaData.filename;
                        content.fileSize = mediaData.fileSize;
                        content.sha256 = mediaData.sha256;
                        content.mediaType = 'image';
                      } catch (mediaError) {
                        console.error('❌ Failed to download/upload image:', mediaError.message);
                        // Continue processing even if media fails
                      }
                      break;
                    case 'document':
                      content = {
                        mediaId: message.document.id,
                        mimeType: message.document.mime_type,
                        filename: message.document.filename,
                        caption: message.document.caption || null
                      };
                      console.log('Document:', message.document.filename);
                      
                      // Download and upload to S3
                      try {
                        console.log('📥 Downloading document from WhatsApp and uploading to S3...');
                        const mediaData = await downloadAndUploadMedia(
                          message.document.id,
                          phoneConfig.accessToken,
                          accountId,
                          'document'
                        );
                        
                        content.mediaUrl = mediaData.s3Url;
                        content.s3Key = mediaData.s3Key;
                        content.filename = mediaData.filename;
                        content.fileSize = mediaData.fileSize;
                        content.sha256 = mediaData.sha256;
                        content.mediaType = 'document';
                      } catch (mediaError) {
                        console.error('❌ Failed to download/upload document:', mediaError.message);
                      }
                      break;
                    case 'audio':
                      content = {
                        mediaId: message.audio.id,
                        mimeType: message.audio.mime_type
                      };
                      
                      // Download and upload to S3
                      try {
                        const mediaData = await downloadAndUploadMedia(
                          message.audio.id,
                          phoneConfig.accessToken,
                          accountId,
                          'audio'
                        );
                        
                        content.mediaUrl = mediaData.s3Url;
                        content.s3Key = mediaData.s3Key;
                        content.filename = mediaData.filename;
                        content.fileSize = mediaData.fileSize;
                        content.sha256 = mediaData.sha256;
                        content.mediaType = 'audio';
                      } catch (mediaError) {
                        console.error('❌ Failed to download/upload audio:', mediaError.message);
                      }
                      break;
                    case 'video':
                      content = {
                        mediaId: message.video.id,
                        mimeType: message.video.mime_type,
                        caption: message.video.caption || null
                      };
                      
                      // Download and upload to S3
                      try {
                        const mediaData = await downloadAndUploadMedia(
                          message.video.id,
                          phoneConfig.accessToken,
                          accountId,
                          'video'
                        );
                        
                        content.mediaUrl = mediaData.s3Url;
                        content.s3Key = mediaData.s3Key;
                        content.filename = mediaData.filename;
                        content.fileSize = mediaData.fileSize;
                        content.sha256 = mediaData.sha256;
                        content.mediaType = 'video';
                      } catch (mediaError) {
                        console.error('❌ Failed to download/upload video:', mediaError.message);
                      }
                      break;
                    case 'location':
                      messageType = 'media'; // Map location to media type since it's not a separate enum
                      content = {
                        latitude: message.location.latitude,
                        longitude: message.location.longitude,
                        address: message.location.address,
                        name: message.location.name
                      };
                      break;
                    case 'interactive':
                      messageType = 'interactive'; // Keep as is, already in enum
                      if (message.interactive.type === 'button_reply') {
                        content = {
                          interactiveType: 'button_reply',
                          buttonId: message.interactive.button_reply.id,
                          buttonText: message.interactive.button_reply.title
                        };
                      } else if (message.interactive.type === 'list_reply') {
                        content = {
                          interactiveType: 'list_reply',
                          listId: message.interactive.list_reply.id,
                          listTitle: message.interactive.list_reply.title,
                          listDescription: message.interactive.list_reply.description
                        };
                      }
                      break;
                    case 'sticker':
                      messageType = 'media'; // Map sticker to media type
                      content = {
                        mediaId: message.sticker.id,
                        mimeType: message.sticker.mime_type,
                        isAnimated: message.sticker.is_animated || false
                      };
                      console.log('Sticker ID:', message.sticker.id);
                      
                      // Download and upload sticker to S3
                      try {
                        console.log('📥 Downloading sticker from WhatsApp and uploading to S3...');
                        const mediaData = await downloadAndUploadMedia(
                          message.sticker.id,
                          phoneConfig.accessToken,
                          accountId,
                          'sticker'
                        );
                        
                        content.mediaUrl = mediaData.s3Url;
                        content.s3Key = mediaData.s3Key;
                        content.filename = mediaData.filename;
                        content.fileSize = mediaData.fileSize;
                        content.sha256 = mediaData.sha256;
                        content.mediaType = 'sticker';
                        
                        console.log('✅ Sticker saved to S3:', mediaData.s3Url);
                      } catch (mediaError) {
                        console.error('❌ Failed to download/upload sticker:', mediaError.message);
                      }
                      break;
                    default:
                      console.log('⚠️ Unsupported message type:', message.type);
                      messageType = 'text'; // Default to text for unknown types
                      content = { text: message[message.type]?.body || JSON.stringify(message[message.type] || message) };
                  }
                  
                  // ✅ CRITICAL FIX: Create conversation first to get MongoDB _id
                  // This ID will be used for Socket.io broadcasting and must match API format
                  
                  // ✅ FIX 3: Workspace validation - ensure workspace ID exists
                  let workspaceId = targetAccount.defaultWorkspaceId;
                  
                  if (!workspaceId) {
                    console.warn('⚠️ Account has no default workspace, creating default', {
                      accountId: targetAccountId
                    });
                    workspaceId = `${targetAccountId}_default`;
                  }
                  
                  console.log('✅ Using workspace:', {
                    workspaceId,
                    fromAccount: targetAccount._id
                  });
                  
                  // ✅ USE targetAccountId (verified String from Account lookup) - NOT accountId from phoneConfig
                  const conversationDocId = `${targetAccountId}_${phoneNumberId}_${message.from}`;
                  const conversationDoc = await Conversation.findOneAndUpdate(
                    {
                      accountId: targetAccountId,
                      workspaceId,
                      phoneNumberId,
                      userPhone: message.from
                    },
                    {
                      $setOnInsert: {
                        accountId: targetAccountId,
                        workspaceId,
                        phoneNumberId,
                        userPhone: message.from,
                        conversationId: conversationDocId,
                        startedAt: new Date()
                      },
                      $set: {
                        lastMessageAt: new Date(parseInt(message.timestamp) * 1000),
                        status: 'open'
                      }
                    },
                    { upsert: true, new: true }
                  );
                  
                  // Use MongoDB _id for Socket.io broadcasting
                  const conversationId = conversationDoc._id.toString();
                  console.log('✅ Conversation ID (MongoDB _id):', conversationId);
                  
                  // Upsert or update contact
                  const contactData = {
                    accountId: targetAccountId,  // ✅ Use verified targetAccountId
                    name: senderProfile?.profile?.name || message.from,
                    phone: `+${message.from}`,
                    whatsappNumber: message.from,
                    type: 'customer',
                    isOptedIn: true, // They messaged us first
                    lastMessageAt: new Date()
                  };
                  
                  await Contact.findOneAndUpdate(
                    { accountId: targetAccountId, whatsappNumber: message.from },
                    { 
                      $set: contactData,
                      $inc: { messageCount: 1 }
                    },
                    { upsert: true, new: true }
                  );
                  
                  console.log('✅ Contact created/updated');
                  
                  // Upsert or update conversation
                  let lastMessagePreview = '';
                  
                  if (messageType === 'text') {
                    lastMessagePreview = content.text?.substring(0, 200) || '';
                  } else if (messageType === 'image') {
                    lastMessagePreview = '🖼️ Photo';
                  } else if (messageType === 'video') {
                    lastMessagePreview = '🎥 Video';
                  } else if (messageType === 'audio') {
                    lastMessagePreview = '🎵 Audio Message';
                  } else if (messageType === 'document') {
                    lastMessagePreview = '📄 Document: ' + (content.filename || 'Document');
                  } else if (messageType === 'media') {
                    // Handle media subtype (location, sticker, etc.)
                    if (content.mediaType === 'sticker') {
                      lastMessagePreview = '🎨 Sticker';
                    } else if (content.latitude && content.longitude) {
                      lastMessagePreview = '📍 Location';
                    } else {
                      lastMessagePreview = '📎 Media';
                    }
                  } else if (messageType === 'interactive') {
                    lastMessagePreview = '🔘 Interactive Message';
                  } else {
                    lastMessagePreview = `[${messageType}]`;
                  }
                  
                  // ✅ Update conversation with message preview and unread count
                  const updatedConversation = await Conversation.findByIdAndUpdate(
                    conversationDoc._id,
                    {
                      $set: {
                        lastMessageAt: new Date(parseInt(message.timestamp) * 1000),
                        lastMessagePreview,
                        lastMessageType: messageType,
                        status: 'open'
                      },
                      $inc: { unreadCount: 1 }
                    },
                    { new: true }
                  );
                  
                  console.log('✅ Conversation updated with message preview');
                  
                  // ✅ CRITICAL FIX: Broadcast conversation update to ALL users in account
                  // This ensures conversation list updates in real-time for everyone
                  if (io && updatedConversation) {
                    broadcastConversationUpdate(io, targetAccountId, updatedConversation);
                    console.log('📡 Broadcasted conversation update to account:', targetAccountId);
                  }
                  
                  // Save incoming message to Message collection
                  const inboxMessage = {
                    accountId: targetAccountId,  // ✅ Use verified targetAccountId (CONSISTENT)
                    phoneNumberId,
                    conversationId: conversationDoc._id, // Use MongoDB _id, not formatted string
                    waMessageId: message.id,
                    recipientPhone: message.from, // Sender is recipient in our records
                    recipientName: senderProfile?.profile?.name || null,
                    messageType,
                    content,
                    status: 'delivered', // Incoming messages are already delivered
                    direction: 'inbound',
                    sentAt: new Date(parseInt(message.timestamp) * 1000),
                    deliveredAt: new Date(parseInt(message.timestamp) * 1000)
                  };
                  
                  // ✅ AUTO-CREATE CONTACT: Every received message creates/updates contact
                  const senderName = senderProfile?.profile?.name || null;
                  const senderPhone = message.from;
                  const formattedPhone = senderPhone.replace(/[^0-9]/g, '');
                  
                  try {
                    let contact = await Contact.findOne({
                      accountId: targetAccountId,
                      whatsappNumber: formattedPhone
                    });
                    
                    if (!contact) {
                      contact = await Contact.create({
                        accountId: targetAccountId,
                        name: senderName || formattedPhone,
                        phone: formattedPhone,
                        whatsappNumber: formattedPhone,
                        type: 'customer',
                        isOptedIn: true,
                        optInDate: new Date(),
                        lastMessageAt: new Date()
                      });
                      console.log('✅ Created contact from received message:', {
                        accountId: targetAccountId,
                        phone: formattedPhone,
                        name: contact.name
                      });
                    } else {
                      contact.lastMessageAt = new Date();
                      contact.messageCount = (contact.messageCount || 0) + 1;
                      if (senderName && senderName !== formattedPhone) {
                        contact.name = senderName;
                      }
                      await contact.save();
                      console.log('✅ Updated contact from received message:', {
                        accountId: targetAccountId,
                        phone: formattedPhone,
                        name: contact.name
                      });
                    }
                  } catch (contactError) {
                    console.error('⚠️  Error auto-creating contact:', contactError.message);
                    // Don't fail message save if contact creation fails
                  }
                  
                  try {
                    const savedMessage = await Message.create(inboxMessage);
                    console.log('✅ Saved incoming message to database:', savedMessage._id);
                    
                    // 📡 Broadcast received message via Socket.io for real-time updates
                    if (io) {
                      // Get contact name if available - use whatsappNumber field
                      const formattedSenderPhone = message.from.replace(/[^0-9]/g, '');
                      const contact = await Contact.findOne({
                        accountId: targetAccountId,
                        whatsappNumber: formattedSenderPhone
                      });
                      const contactName = contact?.name || null;
                      
                      // Broadcast the new received message
                      broadcastReceivedMessage(io, savedMessage, targetAccountId, contactName);
                      console.log('📥 Broadcasted received message via Socket.io:', {
                        messageId: savedMessage._id,
                        from: message.from,
                        contactName: contactName || 'Unknown'
                      });
                    }
                    
                    // Broadcast new message via Socket.io for real-time updates
                    if (io) {
                      // Use MongoDB _id for broadcasting (must match frontend expectations)
                      const broadcastConversationId = conversationDoc._id.toString();
                      const messageObject = savedMessage.toObject();
                      
                      // Ensure createdAt is in ISO format for consistency
                      if (!messageObject.createdAt) {
                        messageObject.createdAt = new Date().toISOString();
                      }
                      
                      // Add conversationId to message for frontend matching
                      messageObject.conversationId = broadcastConversationId;
                      
                      broadcastNewMessage(io, broadcastConversationId, messageObject);
                      console.log('📡 Broadcasted new message via Socket.io:', broadcastConversationId);
                      console.log('   Broadcast Details:', {
                        conversationId: broadcastConversationId,
                        messageId: messageObject._id,
                        from: message.from,
                        timestamp: messageObject.createdAt
                      });
                    }
                  } catch (messageError) {
                    console.error('❌ Error saving message:', messageError.message);
                    
                    // Log failed message for retry
                    try {
                      const failedMsg = await FailedMessage.create({
                        accountId: targetAccountId,
                        phoneNumberId,
                        conversationId: conversationDoc._id.toString(),
                        waMessageId: message.id,
                        userPhone: message.from,
                        rawMessageData: {
                          type: messageType,
                          from: message.from,
                          id: message.id,
                          timestamp: message.timestamp,
                          content: content
                        },
                        errorType: messageError.name || 'ValidationError',
                        errorMessage: messageError.message,
                        errorStack: messageError.stack,
                        status: 'pending',
                        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000) // Retry in 5 minutes
                      });
                      
                      console.log('📋 Logged failed message for retry:', {
                        failedMessageId: failedMsg._id,
                        originalMessageId: message.id,
                        reason: messageError.message
                      });
                    } catch (logError) {
                      console.error('⚠️  Could not log failed message:', logError.message);
                    }
                    
                    // Continue processing despite message save failure
                  }
                  
                  // Check for keyword auto-reply or workflow response
                  if (message.type === 'text' && content.text) {
                    console.log('🔍 Checking keyword rules...');
                    await whatsappService.processIncomingMessage(
                      accountId,
                      phoneNumberId,
                      message.from,
                      content.text
                    );
                  } else if (message.type === 'interactive' && content.interactiveType === 'button_reply') {
                    console.log('🔘 Processing button click...');
                    await whatsappService.processIncomingMessage(
                      accountId,
                      phoneNumberId,
                      message.from,
                      content.buttonText,
                      { buttonId: content.buttonId } // Pass button ID for URL lookup
                    );
                  }
                  
                } catch (messageError) {
                  console.error('❌ Error processing incoming message:', messageError);
                  console.error('Message data:', JSON.stringify(message, null, 2));
                }
              }
              
              console.log('========== INCOMING MESSAGES PROCESSED ==========');
            } else {
              console.log('⚠️ No incoming messages in this webhook');
            }
          } else if (change.field === 'account_update') {
            console.log('\n🏢 ════════════════════════════════════════════════════════════════');
            console.log('🏢 🎯 ACCOUNT UPDATE WEBHOOK - STRICT MATCHING ENABLED');
            console.log('🏢 ════════════════════════════════════════════════════════════════\n');
            
            // Extract Business ID from entry.id and WABA ID from webhook data
            const businessId = entry.id;
            const value = change.value;
            
            console.log('📊 WEBHOOK DATA RECEIVED:');
            console.log(`   Business ID (entry.id): ${businessId}`);
            console.log('   Raw webhook payload:', JSON.stringify(value, null, 2));
            
            // 🔥 CRITICAL: Extract WABA ID from webhook structure
            // Meta sends: waba_info.waba_id
            const wabaId = value.waba_info?.waba_id;
            
            if (!wabaId) {
              console.warn('\n⚠️ ⚠️ ⚠️ CRITICAL: No WABA ID found in webhook structure');
              console.log('   Expected: value.waba_info.waba_id');
              console.log('   Received:', value);
            } else {
              console.log(`\n✅ ✅ ✅ WABA ID found in webhook: ${wabaId}`);
            }
            
            // 🔥 Store BOTH Business ID and WABA ID from webhook
            // Process even if only one ID is available - webhook will provide what it has
            if (businessId || wabaId) {
              try {
                // Find account - STRICT MATCHING ONLY
                let account = null;
                
                // 🔥 PRIORITY 1 (STRICT): OAuth initiated this - metaSync.accountId MUST MATCH
                // This is the ONLY way to guarantee the right account
                console.log('\n🔍 ════════════════════════════════════════════════════════════════');
                console.log('🔍 WEBHOOK ACCOUNT MATCHING - STRICT MODE');
                console.log('🔍 ════════════════════════════════════════════════════════════════');
                console.log('\n📍 Webhook contains:');
                console.log(`   WABA ID (entry.id): ${wabaId}`);
                console.log(`   Business ID: ${businessId}\n`);
                
                console.log('🔍 QUERY 1 (PRIMARY): metaSync.accountId with recent OAuth');
                // Extended window to 2 hours to account for Meta delays
                const recentOAuthAccounts = await Account.find({
                  'metaSync.accountId': { $exists: true, $ne: null },
                  'metaSync.status': { $in: ['oauth_pending', 'oauth_completed_awaiting_webhook', 'fully_synced'] },
                  'metaSync.oauth_timestamp': { $gte: new Date(Date.now() - 120 * 60 * 1000) }  // 2 hour window
                }).select('accountId metaSync.accountId metaSync.status type role');
                
                console.log(`   Found ${recentOAuthAccounts.length} account(s) with recent OAuth:\n`);
                recentOAuthAccounts.forEach(acc => {
                  console.log(`   - ${acc.accountId} (${acc.role}/${acc.type}): metaSync.accountId=${acc.metaSync?.accountId}`);
                });
                
                // Track if account was found via OAuth match
                let oauthInitiated = false;
                
                // Look for exact match where metaSync.accountId was stored during OAuth
                // Try exact match first
                for (const candidate of recentOAuthAccounts) {
                  if (candidate.metaSync?.accountId === candidate.accountId) {
                    // This account stored itself during OAuth - it's the RIGHT one
                    account = candidate;
                    oauthInitiated = true;  // Mark that OAuth initiated this
                    console.log(`\n   ✅ FOUND EXACT MATCH: Account ${account.accountId} is awaiting THIS webhook!`);
                    console.log(`      Proof: metaSync.accountId=${account.metaSync?.accountId}, status=${account.metaSync?.status}`);
                    break;
                  }
                }
                
                // If only ONE account in recent OAuth, use it (for fallback)
                if (!account && recentOAuthAccounts.length === 1) {
                  account = recentOAuthAccounts[0];
                  oauthInitiated = true;  // Single account in recent OAuth
                  console.log(`\n   ✅ FOUND (single account): Account ${account.accountId} was only one awaiting webhook`);
                  console.log(`      metaSync.accountId=${account.metaSync?.accountId}`);
                }
                
                // If not found by metaSync, try by WABA ID (but ONLY if updating existing, with strict type check)
                if (!account) {
                  console.log('\n🔍 QUERY 2 (FALLBACK): Existing WABA ID with strict type verification');
                  
                  if (wabaId) {
                    let existingByWaba = await Account.findOne({ wabaId });
                    
                    if (existingByWaba) {
                      console.log(`   Found account with WABA: ${existingByWaba.accountId} (${existingByWaba.role}/${existingByWaba.type})`);
                      
                      // 🔥 CRITICAL SAFETY CHECK #1: Prevent Supradmin WABA from being assigned to clients
                      if (existingByWaba.type === 'client' && businessId && businessId === '631302064701398') {
                        console.log(`   🚨 BLOCKED: Client account cannot have SUPRADMIN's Business ID!`);
                        console.log(`   Business ID 631302064701398 belongs to supradmin`);
                        console.log(`   Skipping to prevent cross-contamination`);
                        existingByWaba = null;  // Don't use this match
                      }
                      
                      // 🔥 CRITICAL SAFETY CHECK #2: Prevent client from taking Supradmin's WABA
                      if (existingByWaba && existingByWaba.role === 'superadmin' && existingByWaba.type === 'internal') {
                        console.log(`   🚨 BLOCKED: This is SUPRADMIN's WABA!`);
                        console.log(`   Account ${existingByWaba.accountId} is role=superadmin, type=internal`);
                        console.log(`   Webhook is trying to assign it to a different account`);
                        console.log(`   Skipping to prevent cross-contamination`);
                        account = null;  // Don't match
                      } else if (existingByWaba && existingByWaba.type === 'internal' && existingByWaba.role === 'superadmin') {
                        // Supradmin updating their own account - OK
                        account = existingByWaba;
                        console.log(`   ✅ ACCEPTED: Supradmin account can update their own WABA`);
                      } else if (existingByWaba) {
                        account = existingByWaba;
                        console.log(`   ✅ ACCEPTED: This account already has this WABA (update scenario)`);
                      }
                    } else {
                      console.log(`   WABA ID ${wabaId} not found in any account (first-time setup)`);
                      
                      // 🔥 NEW FALLBACK: If WABA is new AND Business ID is supradmin's, auto-assign to supradmin
                      if (businessId === '631302064701398') {
                        console.log('\n🎯 SUPRADMIN AUTO-ASSIGNMENT FALLBACK:');
                        console.log(`   Business ID ${businessId} = SUPRADMIN's Business ID`);
                        console.log(`   WABA is unassigned - auto-assigning to supradmin...\n`);
                        
                        const supradminAccount = await Account.findOne({
                          role: 'superadmin',
                          type: 'internal'
                        });
                        
                        if (supradminAccount) {
                          account = supradminAccount;
                          oauthInitiated = true;
                          console.log(`   ✅ AUTO-ASSIGNED to supradmin: ${supradminAccount.accountId}`);
                        } else {
                          console.log(`   ❌ No supradmin account found`);
                        }
                      }
                    }
                  }
                }
                
                // If still not found - STRICT FAIL
                if (!account) {
                  console.log('\n🚨 ════════════════════════════════════════════════════════════════');
                  console.log('🚨 WEBHOOK MATCHING FAILED');
                  console.log('🚨 ════════════════════════════════════════════════════════════════');
                  console.log('\n❌ Could not find account to assign webhook!');
                  console.log('\n   Possible reasons:');
                  console.log('   1. metaSync.accountId not set during OAuth (check oauthController)');
                  console.log('   2. Webhook arrived >10 mins after OAuth (timeout)');
                  console.log('   3. Account was deleted between OAuth and webhook');
                  console.log('   4. WABA ID belongs to a different Meta Business Account');
                  console.log('\n   Action: Manual intervention required - check logs above');
                  console.log('🚨 ════════════════════════════════════════════════════════════════\n');
                  return;  // FAIL - don't assign to random account
                }
                
                if (account) {
                  console.log('\n✅ ✅ ✅ ACCOUNT FOUND! Now saving Business ID & WABA ID...\n');
                  
                  // 🔥 CRITICAL SAFEGUARD: Check if WABA is already assigned to another account
                  if (account.wabaId !== wabaId && wabaId) {
                    const existingWABA = await Account.findOne({ wabaId, accountId: { $ne: account.accountId } });
                    if (existingWABA) {
                      // ALLOW: Supradmin can take back their own WABA (reconnection/refresh scenario)
                      if (account.role === 'superadmin' && account.type === 'internal') {
                        console.log('\n✅ SUPRADMIN RECONNECTION ALLOWED:');
                        console.log(`   Supradmin account ${account.accountId} is reconnecting their WABA`);
                        console.log(`   Previous assignment was to: ${existingWABA.accountId} (${existingWABA.name})`);
                        console.log(`   This is OK - supradmin can manage their own WABA across sessions`);
                        console.log(`   Action: Clearing WABA from ${existingWABA.accountId} and assigning to supradmin\n`);
                        
                        // Remove WABA from the old account
                        await Account.findOneAndUpdate(
                          { accountId: existingWABA.accountId },
                          { wabaId: null },
                          { new: true }
                        );
                        console.log(`   ✅ Cleared WABA from ${existingWABA.accountId}`);
                      } else {
                        // BLOCK: Client cannot take over another account's WABA
                        console.error('\n🚨 🚨 🚨 CRITICAL ALERT: WABA ALREADY ASSIGNED TO ANOTHER ACCOUNT!');
                        console.error(`   WABA ID: ${wabaId}`);
                        console.error(`   Already assigned to: ${existingWABA.accountId} (${existingWABA.name || 'UNNAMED'})`);
                        console.error(`   Trying to assign to: ${account.accountId} (${account.name || 'UNNAMED'})`);
                        console.error('\n   ❌ BLOCKING THIS ASSIGNMENT TO PREVENT CONTAMINATION!\n');
                        return;  // FAIL - don't overwrite
                      }
                    }
                  }
                  
                  // ✅ CRITICAL: Migrate phone numbers from temporary account to real account
                  // If this account didn't initiate OAuth (found by WABA/Business ID), check if phones exist elsewhere
                  if (!oauthInitiated && wabaId) {
                    console.log('\n🔄 MIGRATING PHONE NUMBERS FROM TEMPORARY ACCOUNT...');
                    
                    // Find phones with this WABA ID that might be under a temporary account
                    const phonesWithThisWaba = await PhoneNumber.find({ wabaId });
                    
                    if (phonesWithThisWaba && phonesWithThisWaba.length > 0) {
                      console.log(`   Found ${phonesWithThisWaba.length} phone number(s) with WABA ${wabaId}`);
                      
                      // Check if they belong to a different account
                      for (const phone of phonesWithThisWaba) {
                        if (phone.accountId !== account.accountId) {
                          console.log(`   ⚠️  Phone ${phone.displayPhone} is under account ${phone.accountId}, not ${account.accountId}`);
                          console.log(`   📱 Migrating phone number ${phone.phoneNumberId}...`);
                          
                          // Migrate the phone number to the correct account
                          phone.accountId = account.accountId;
                          await phone.save();
                          
                          console.log(`   ✅ Phone migrated to account ${account.accountId}`);
                        }
                      }
                      console.log('   ✅ Phone number migration complete\n');
                    }
                  }
                  
                  // ✅ Found account - save BOTH IDs
                  account.wabaId = wabaId;  // Save WABA ID
                  account.businessId = businessId;  // Save Business ID
                  
                  console.log('💾 Setting account fields:');
                  console.log(`   accountId: ${account.accountId}`);
                  console.log(`   wabaId: ${wabaId}`);
                  console.log(`   businessId: ${businessId}`);
                  
                  // Store complete webhook data
                  if (!account.metaSync) {
                    account.metaSync = {};
                  }
                  account.metaSync.webhookData = value;
                  account.metaSync.lastWebhookAt = new Date();
                  account.metaSync.isSynced = true;
                  account.metaSync.metaStatus = value.status || 'active';
                  account.metaSync.status = 'fully_synced';  // ✅ Clear the "awaiting" status
                  
                  // Extract individual fields if provided
                  if (value.messaging_product) {
                    console.log('📦 Messaging Product:', value.messaging_product);
                  }
                  if (value.waba_subscription_status) {
                    console.log('📊 WABA Subscription Status:', value.waba_subscription_status);
                  }
                  if (value.account_review_status) {
                    console.log('🔍 Account Review Status:', value.account_review_status);
                  }
                  if (value.phone_numbers) {
                    console.log('📱 Phone Numbers in webhook:', value.phone_numbers);
                  }
                  
                  console.log('\n💾 SAVING ACCOUNT TO DATABASE...');
                  console.log('  Before save:');
                  console.log('    account._id:', account._id);
                  console.log('    account.accountId:', account.accountId);
                  console.log('    account.wabaId:', account.wabaId);
                  console.log('    account.businessId:', account.businessId);
                  
                  await account.save();
                  
                  console.log('\n✅ SAVE COMPLETE - Verifying...');
                  // Re-fetch to confirm it saved - INCLUDE hidden oauthAccessToken field!
                  const saved = await Account.findById(account._id).select('+metaSync.oauthAccessToken');
                  console.log('  After save (refetch):');
                  console.log('    account._id:', saved._id);
                  console.log('    account.accountId:', saved.accountId);
                  console.log('    account.wabaId:', saved.wabaId);
                  console.log('    account.businessId:', saved.businessId);
                  
                  console.log('\n✅ ✅ ✅ 🎯 ACCOUNT FULLY SYNCED WITH META:\n', {
                    accountId: saved.accountId,
                    wabaId: saved.wabaId,
                    businessId: saved.businessId,
                    metaStatus: saved.metaSync.metaStatus,
                    syncedAt: saved.metaSync.lastWebhookAt
                  });
                  
                  // 🚀 NEW: Fetch phone numbers from Meta API
                  console.log('\n🚀 NOW FETCHING PHONE NUMBERS FROM META API...');
                  const accessToken = saved.metaSync?.oauthAccessToken;
                  
                  // ✅ CRITICAL: Verify token exists before attempting phone fetch
                  if (!accessToken) {
                    console.error('❌ CRITICAL: No OAuth access token found in metaSync!');
                    console.error('   This means OAuth did NOT save the token correctly');
                    console.error('   Check oauthController line 186 - token should be saved there');
                    console.error('   metaSync state:', {
                      status: saved.metaSync?.status,
                      hasOauthAccessToken: !!saved.metaSync?.oauthAccessToken,
                      oauthTimestamp: saved.metaSync?.oauth_timestamp,
                      accountId: saved.metaSync?.accountId
                    });
                  } else {
                    console.log('✅ Token found! Length:', accessToken.length, 'chars');
                  }
                  
                  const phonesFetched = await fetchAndCreatePhoneNumbers(
                    saved.wabaId,
                    saved.accountId,
                    accessToken
                  );
                  
                  if (phonesFetched) {
                    console.log('\n🟢 ✅ PHONE NUMBERS AUTOMATICALLY FETCHED AND CREATED!');
                    console.log('   User will see phone numbers immediately when refreshing Settings page');
                  } else {
                    console.warn('\n⚠️ Phone numbers could not be fetched automatically');
                    console.warn('   Possible reasons:');
                    console.warn('   - No access token stored (OAuth might be incomplete)');
                    console.warn('   - Meta API temporarily unavailable');
                    console.warn('   - No phone numbers in this WABA yet');
                    console.warn('\n   User can manually add phone numbers in Settings > Add Phone Number');
                  }
                  
                  console.log('\n🟢 BUSINESS ID SYNC COMPLETE - READY FOR REALTIME!\n');
                  
                } else {
                  console.warn('\n⚠️ ⚠️ ⚠️ ACCOUNT NOT FOUND - Cannot link webhook to account');
                  console.warn('   Searched by:');
                  console.warn('   1. wabaId');
                  console.warn('   2. businessId');
                  console.warn('   3. phone numbers in WABA');
                  console.warn('   4. OAuth pending status (metaSync.status="oauth_completed_awaiting_webhook")');
                  console.warn('   5. account without wabaId');
                  console.warn('\n   💡 Possible reasons:');
                  console.warn('   - OAuth hasnt completed yet (code not exchanged)');
                  console.warn('   - Client account not created in database');
                  console.warn('   - Multiple OAuth flows happening simultaneously');
                  console.warn('   - Webhook received before OAuth completes');
                  console.log('\n   🔧 Next steps:');
                  console.log('   - Try OAuth flow again');
                  console.log('   - Check if account was created during login\n');
                }
              } catch (storageError) {
                console.error('❌ ❌ ❌ Error storing Meta account details:', storageError.message);
                console.error('Stack:', storageError.stack);
              }
            } else {
              console.warn('\n⚠️ ⚠️ ⚠️ Missing BOTH Business ID and WABA ID in webhook:', { businessId, wabaId });
              console.warn('   This is unusual - check webhook payload');

            }
            
            console.log('🏢 ════════════════════════════════════════════════════════════════\n');
          } else {
            console.log('ℹ️ Ignoring field:', change.field);
          }
        }
      }
    } else {
      console.log('⚠️ Unknown webhook object type:', body.object);
    }
    
    console.log('========== WEBHOOK PROCESSING COMPLETE ==========\n');
    
  } catch (error) {
    console.error('❌ ========== WEBHOOK ERROR ==========');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('========================================\n');
  }
};

export default {
  verifyWebhook,
  handleWebhook
};
