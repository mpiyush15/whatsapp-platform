import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import { sendSuccess, sendError, handleControllerError } from '../utils/responseHandler.js';
import { MESSAGE_STATUS, MESSAGE_DIRECTION, MESSAGE_TYPE, SOCKET_EVENTS } from '../constants/whatsapp.js';

const Conversation = mongoose.model('Conversation');
const Message = mongoose.model('Message');
const Account = mongoose.model('Account');

/**
 * Process incoming WhatsApp messages from webhook
 * Creates/updates Conversation + stores Message
 * Emits real-time event for live chat UI
 */
export const processIncomingMessage = async (req, res, io) => {
  try {
    const { entry } = req.body;

    if (!entry || !entry[0] || !entry[0].changes) {
      logger.warn('⚠️ Invalid webhook structure');
      return sendSuccess(res, {}, 'Webhook received');
    }

    const changes = entry[0].changes[0];
    const value = changes.value;

    // Extract WABA ID - CRITICAL for finding account
    const wabaId = value.waba_info?.waba_id;
    if (!wabaId) {
      logger.warn('⚠️ No WABA ID in webhook');
      return sendSuccess(res, {}, 'Webhook received');
    }

    // Find account by WABA ID
    const account = await Account.findOne({ wabaId });
    if (!account) {
      logger.warn(`⚠️ Account not found for WABA: ${wabaId}`);
      return sendSuccess(res, {}, 'Webhook received');
    }

    const accountId = account.accountId;

    // Extract messages
    const messages = value.messages || [];
    
    for (const msg of messages) {
      try {
        await handleIncomingMessage(msg, accountId, wabaId, value, io);
      } catch (err) {
        logger.error('❌ Error processing message:', {
          messageId: msg.id,
          error: err.message
        });
      }
    }

    return sendSuccess(res, {}, 'Messages processed');

  } catch (error) {
    logger.error('❌ Webhook processing error:', error.message);
    return sendError(res, 'Webhook processing failed', 500);
  }
};

/**
 * Handle single incoming message
 * Create/update Conversation
 * Save Message to DB
 * Emit Socket.io event
 */
async function handleIncomingMessage(msg, accountId, wabaId, value, io) {
  const {
    id: waMessageId,
    from: customerPhone,
    timestamp,
    type,
    text,
    image,
    video,
    audio,
    document
  } = msg;

  // Extract contact info
  const contacts = value.contacts?.[0] || {};
  const customerName = contacts.profile?.name || customerPhone;
  const customerProfileName = contacts.profile?.name || 'User';

  // Extract phone number ID from value
  const phoneNumberId = value.metadata?.phone_number_id;
  if (!phoneNumberId) {
    logger.error('❌ No phone_number_id in message');
    return;
  }

  logger.info(`📱 Incoming message from ${customerPhone}`, {
    messageId: waMessageId,
    type,
    accountId,
    wabaId,
    phoneNumberId
  });

  // Create unique conversation ID
  const conversationId = `${accountId}-${phoneNumberId}-${customerPhone}`;

  // Extract message content based on type
  let messageContent = {};
  let messageType = MESSAGE_TYPE.TEXT;

  if (type === 'text' && text) {
    messageContent.text = text.body;
    messageType = MESSAGE_TYPE.TEXT;
  } else if (type === 'image' && image) {
    messageContent.mediaUrl = image.link || '';
    messageContent.mediaId = image.id;
    messageContent.caption = image.caption || '';
    messageType = MESSAGE_TYPE.IMAGE;
  } else if (type === 'video' && video) {
    messageContent.mediaUrl = video.link || '';
    messageContent.mediaId = video.id;
    messageContent.caption = video.caption || '';
    messageType = MESSAGE_TYPE.VIDEO;
  } else if (type === 'audio' && audio) {
    messageContent.mediaUrl = audio.link || '';
    messageContent.mediaId = audio.id;
    messageType = MESSAGE_TYPE.AUDIO;
  } else if (type === 'document' && document) {
    messageContent.mediaUrl = document.link || '';
    messageContent.mediaId = document.id;
    messageContent.filename = document.filename || 'document';
    messageType = MESSAGE_TYPE.DOCUMENT;
  }

  try {
    // Step 1: Create or update Conversation
    const conversation = await Conversation.findOneAndUpdate(
      { conversationId },
      {
        accountId,
        workspaceId: null,
        phoneNumberId,
        conversationId,
        userPhone: customerPhone,
        userName: customerName,
        userProfileName: customerProfileName,
        lastMessageAt: new Date(timestamp * 1000),
        lastMessagePreview: messageContent.text || `[${messageType.toUpperCase()}]`,
        lastMessageType: messageType,
        status: 'open',
        $inc: { messageCount: 1 }
      },
      {
        upsert: true,
        new: true
      }
    );

    logger.info(`✅ Conversation updated: ${conversationId}`);

    // Step 2: Save Message
    const messageDoc = new Message({
      accountId,
      phoneNumberId,
      conversationId,
      waMessageId,
      recipientPhone: customerPhone,
      recipientName: customerName,
      messageType,
      content: messageContent,
      status: MESSAGE_STATUS.DELIVERED,
      direction: MESSAGE_DIRECTION.INBOUND,
      source: 'webhook',
      sentAt: new Date(timestamp * 1000),
      deliveredAt: new Date()
    });

    await messageDoc.save();
    logger.info(`✅ Message saved: ${waMessageId}`);

    // Step 3: Emit Socket.io event for real-time UI update
    if (io) {
      io.to(`conversation_${conversationId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, {
        conversationId,
        message: messageDoc,
        conversation: conversation
      });

      io.to(`account_${accountId}`).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, {
        conversationId,
        conversation: conversation
      });
    }

    logger.info(`✅ Socket event emitted for ${conversationId}`);

  } catch (err) {
    logger.error('❌ Error processing incoming message:', {
      conversationId,
      error: err.message
    });
    throw err;
  }
}

/**
 * Get all conversations for account
 * Supports filtering, searching, pagination
 */
export const getConversations = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { 
      status, 
      assignedAgent, 
      search, 
      limit = 50, 
      offset = 0,
      sortBy = 'lastMessageAt',
      sortOrder = -1
    } = req.query;

    let query = { accountId };

    // Filters
    if (status) query.status = status;
    if (assignedAgent) query.assignedAgentId = assignedAgent;

    // Search
    if (search) {
      query.$or = [
        { userPhone: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { lastMessagePreview: { $regex: search, $options: 'i' } }
      ];
    }

    // Query
    const conversations = await Conversation.find(query)
      .sort({ [sortBy]: sortOrder })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('assignedAgentId', 'name email');

    const total = await Conversation.countDocuments(query);

    logger.info(`✅ Retrieved ${conversations.length} conversations for ${accountId}`);

    return sendSuccess(res, {
      conversations,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }, 'Conversations retrieved');

  } catch (error) {
    return handleControllerError(res, error, 'getConversations');
  }
};

/**
 * Get single conversation with messages
 */
export const getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const accountId = req.account.accountId;

    const conversation = await Conversation.findOne({
      conversationId,
      accountId
    }).populate('assignedAgentId', 'name email status');

    if (!conversation) {
      return sendError(res, 'Conversation not found', 404);
    }

    // Get last 50 messages
    const messages = await Message.find({
      conversationId,
      accountId
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();

    logger.info(`✅ Retrieved conversation: ${conversationId}`);

    return sendSuccess(res, {
      conversation,
      messages: messages.reverse()
    }, 'Conversation retrieved');

  } catch (error) {
    return handleControllerError(res, error, 'getConversation');
  }
};

/**
 * Send reply message (agent to customer)
 */
export const sendMessage = async (req, res, io) => {
  try {
    const { conversationId } = req.params;
    const { text, mediaUrl, mediaType } = req.body;
    const accountId = req.account.accountId;
    const agentId = req.account.accountId; // Agent ID for now

    if (!text && !mediaUrl) {
      return sendError(res, 'Message text or media required', 400);
    }

    // Get conversation
    const conversation = await Conversation.findOne({
      conversationId,
      accountId
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found', 404);
    }

    // TODO: Send to Meta API (will be in next phase)
    // For now, just save locally

    let messageContent = {};
    let messageType = 'text';

    if (text) {
      messageContent.text = text;
      messageType = 'text';
    } else if (mediaUrl) {
      messageContent.mediaUrl = mediaUrl;
      messageContent.mediaType = mediaType;
      messageType = mediaType;
    }

    // Save message
    const message = new Message({
      accountId,
      phoneNumberId: conversation.phoneNumberId,
      conversationId,
      recipientPhone: conversation.userPhone,
      recipientName: conversation.userName,
      messageType,
      content: messageContent,
      direction: MESSAGE_DIRECTION.OUTBOUND,
      status: MESSAGE_STATUS.SENT,
      source: 'agent_sent',
      sentAt: new Date()
    });

    await message.save();

    // Update conversation
    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = text || `[${messageType.toUpperCase()}]`;
    conversation.lastMessageType = messageType;
    await conversation.save();

    // Emit real-time event
    if (io) {
      io.to(`conversation_${conversationId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, {
        conversationId,
        message,
        conversation
      });
    }

    logger.info(`✅ Message sent in conversation: ${conversationId}`);

    return sendSuccess(res, { message }, 'Message sent successfully');

  } catch (error) {
    return handleControllerError(res, error, 'sendMessage');
  }
};

/**
 * Assign conversation to agent
 */
export const assignConversation = async (req, res, io) => {
  try {
    const { conversationId } = req.params;
    const { agentId } = req.body;
    const accountId = req.account.accountId;

    if (!agentId) {
      return sendError(res, 'Agent ID required', 400);
    }

    const conversation = await Conversation.findOneAndUpdate(
      { conversationId, accountId },
      {
        assignedAgentId: agentId,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('assignedAgentId', 'name email');

    if (!conversation) {
      return sendError(res, 'Conversation not found', 404);
    }

    // Emit event
    if (io) {
      io.to(`conversation_${conversationId}`).emit(SOCKET_EVENTS.AGENT_ASSIGNED, {
        conversationId,
        agentId,
        agentName: conversation.assignedAgentId?.name
      });
    }

    logger.info(`✅ Conversation assigned to agent: ${agentId}`);

    return sendSuccess(res, { conversation }, 'Conversation assigned');

  } catch (error) {
    return handleControllerError(res, error, 'assignConversation');
  }
};

/**
 * Resolve conversation (mark as closed)
 */
export const resolveConversation = async (req, res, io) => {
  try {
    const { conversationId } = req.params;
    const accountId = req.account.accountId;

    const conversation = await Conversation.findOneAndUpdate(
      { conversationId, accountId },
      {
        status: 'closed',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!conversation) {
      return sendError(res, 'Conversation not found', 404);
    }

    // Emit event
    if (io) {
      io.to(`conversation_${conversationId}`).emit(SOCKET_EVENTS.CONVERSATION_RESOLVED, {
        conversationId
      });
    }

    logger.info(`✅ Conversation resolved: ${conversationId}`);

    return sendSuccess(res, { conversation }, 'Conversation resolved');

  } catch (error) {
    return handleControllerError(res, error, 'resolveConversation');
  }
};

export default {
  processIncomingMessage,
  getConversations,
  getConversation,
  sendMessage,
  assignConversation,
  resolveConversation
};
