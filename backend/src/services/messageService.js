import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import ActivityTimeline from '../models/ActivityTimeline.js';
import whatsappService from './whatsappService.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * MessageService
 * Business logic for message operations
 * Single source of truth for all message logic
 */

/**
 * Send text message to customer via WhatsApp
 */
export const sendMessage = async (conversationId, content, messageType = 'text', accountId, phoneNumberId, agentId) => {
  logger.info('📤 sendMessage called with:', {
    conversationId,
    contentLength: content?.length,
    messageType,
    accountId,
    agentId
  });

  // Get conversation details
  const conversation = await Conversation.findOne({
    _id: conversationId,
    accountId
  });

  if (!conversation) {
    logger.error('❌ Conversation not found:', conversationId);
    throw new NotFoundError('Conversation not found');
  }

  logger.info('✅ Conversation found:', conversation._id);

  // If phoneNumberId is not provided, get it from conversation
  if (!phoneNumberId) {
    phoneNumberId = conversation.phoneNumberId;
  }

  if (!phoneNumberId) {
    logger.error('❌ No phoneNumberId found');
    throw createAppError('Phone number ID not found in conversation or request');
  }

  logger.info('✅ PhoneNumberId:', phoneNumberId);

  // Prepare message payload
  const messagePayload = {
    recipientPhone: conversation.userPhone,
    message: content,
    messageType: messageType
  };

  // ✅ Try to send via WhatsApp, but don't fail if WhatsApp API fails
  let whatsappResponse = { waMessageId: `temp_${Date.now()}` };
  try {
    logger.info('📤 Calling WhatsApp API...');
    whatsappResponse = await whatsappService.sendTextMessage(
      accountId,
      phoneNumberId,
      messagePayload.recipientPhone,
      messagePayload.message
    );
    logger.info('✅ WhatsApp response:', whatsappResponse.waMessageId);
  } catch (whatsappError) {
    console.warn('⚠️ WhatsApp API error (message will be saved locally):', whatsappError.message);
    // Don't throw - message should still be saved locally
  }

  // Store message in database
  logger.info('📝 Creating message in DB...');
  
  // Check if similar message was just created (prevent duplicates from race conditions)
  const recentDuplicate = await Message.findOne({
    conversationId,
    accountId,
    direction: 'outbound',
    'content.text': content,
    createdAt: { $gte: new Date(Date.now() - 2000) } // Within last 2 seconds
  });
  
  if (recentDuplicate) {
    console.warn('⚠️ Duplicate message detected! Returning existing message:', recentDuplicate._id);
    return recentDuplicate;
  }
  
  const message = await Message.create({
    accountId,
    phoneNumberId,
    conversationId,
    messageType,
    content: {
      text: content
    },
    recipientPhone: conversation.userPhone,
    recipientName: conversation.userName,
    direction: 'outbound',
    status: 'sent',
    sentAt: new Date(),
    waMessageId: whatsappResponse.waMessageId,
    source: 'agent_sent'
  });

  logger.info('✅ Message created:', message._id);

  // Update conversation
  logger.info('📝 Updating conversation...');
  const conv = await Conversation.findById(conversationId);
  
  await Conversation.updateOne(
    { _id: conversationId },
    {
      $set: {
        lastMessageAt: new Date(),
        updatedAt: new Date(),
        lastMessagePreview: content.substring(0, 200),
        lastMessageType: messageType,
        unreadCount: 0
      },
      $inc: {
        messageCount: 1
      }
    }
  );

  logger.info('✅ Conversation updated');

  // Log in activity timeline
  await ActivityTimeline.create({
    accountId,
    conversationId,
    activityType: 'message_sent',
    actor: {
      type: 'agent',
      id: agentId
    },
    relatedMessageId: message._id,
    details: new Map([
      ['messageType', messageType],
      ['contentPreview', content.substring(0, 100)]
    ])
  });

  logger.info('✅ Activity logged');

  return message;
};

/**
 * Get messages for a conversation
 */
export const getMessages = async (conversationId, accountId, limit = 50, offset = 0) => {
  const messages = await Message.find({
    conversationId,
    accountId
  })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .populate('readBy.agentId', 'name email')
    .populate('replyTo', 'content.text messageType')
    .lean();

  const total = await Message.countDocuments({ conversationId, accountId });

  // Transform messages to frontend format
  const transformedMessages = messages.map(msg => ({
    _id: msg._id,
    conversationId: msg.conversationId,
    senderRole: msg.direction === 'outbound' ? 'agent' : 'customer',
    senderName: msg.direction === 'outbound' ? 'Agent' : (msg.recipientName || 'Customer'),
    text: msg.content?.text || msg.text || '',
    mediaUrl: msg.content?.mediaUrl || msg.mediaUrl,
    mediaType: msg.content?.mediaType || msg.messageType,
    status: msg.status || 'sent',
    createdAt: msg.createdAt || msg.sentAt,
    isRead: msg.isRead || !!msg.readAt,
    reactions: msg.reactions || [],
    timestamp: msg.createdAt || msg.sentAt
  })).reverse();

  return {
    messages: transformedMessages,
    total,
    hasMore: offset + limit < total
  };
};

/**
 * Update message status (delivered, read, etc)
 */
export const updateMessageStatus = async (messageId, accountId, status, extraData = {}) => {
  const message = await Message.findOne({ _id: messageId, accountId });

  if (!message) {
    throw new NotFoundError('Message not found');
  }

  const update = {
    status: status,
    [`${status}At`]: new Date() // Set sentAt, deliveredAt, readAt, etc.
  };

  // Handle status updates array
  message.statusUpdates.push({
    status,
    timestamp: new Date(),
    ...extraData
  });

  const updatedMessage = await Message.findByIdAndUpdate(
    messageId,
    update,
    { new: true }
  );

  // Log in activity timeline
  const activityMap = {
    'delivered': 'message_delivered',
    'read': 'message_read',
    'failed': 'message_failed'
  };

  if (activityMap[status]) {
    await ActivityTimeline.create({
      accountId,
      conversationId: message.conversationId,
      activityType: activityMap[status],
      relatedMessageId: messageId,
      details: new Map([['status', status]])
    });
  }

  return updatedMessage;
};

/**
 * Mark message as read by agent
 */
export const markMessageAsRead = async (messageId, accountId, agentId) => {
  const message = await Message.findOne({ _id: messageId, accountId });

  if (!message) {
    throw new NotFoundError('Message not found');
  }

  // Check if already read by this agent
  const alreadyRead = message.readBy.some(r => r.agentId.toString() === agentId.toString());

  if (!alreadyRead) {
    message.readBy.push({
      agentId,
      readAt: new Date()
    });

    await message.save();
  }

  return message;
};

/**
 * Add emoji reaction to message
 */
export const addReaction = async (messageId, accountId, emoji, agentId) => {
  const message = await Message.findOne({ _id: messageId, accountId });

  if (!message) {
    throw new NotFoundError('Message not found');
  }

  // Check if agent already has this reaction
  const existingReaction = message.reactions.find(
    r => r.emoji === emoji && r.addedBy.toString() === agentId.toString()
  );

  if (!existingReaction) {
    message.reactions.push({
      emoji,
      addedBy: agentId,
      addedAt: new Date()
    });

    await message.save();
  }

  return message;
};

/**
 * Remove reaction from message
 */
export const removeReaction = async (messageId, accountId, emoji, agentId) => {
  const message = await Message.findOne({ _id: messageId, accountId });

  if (!message) {
    throw new NotFoundError('Message not found');
  }

  message.reactions = message.reactions.filter(
    r => !(r.emoji === emoji && r.addedBy.toString() === agentId.toString())
  );

  await message.save();

  return message;
};

/**
 * Forward message to another conversation
 */
export const forwardMessage = async (messageId, accountId, targetConversationId, forwardingAgentId) => {
  const sourceMessage = await Message.findOne({ _id: messageId, accountId });

  if (!sourceMessage) {
    throw new NotFoundError('Source message not found');
  }

  // Create copy of message in target conversation
  const forwardedMessage = await Message.create({
    accountId,
    phoneNumberId: sourceMessage.phoneNumberId,
    conversationId: targetConversationId,
    messageType: sourceMessage.messageType,
    content: sourceMessage.content,
    direction: 'outbound',
    status: 'sent',
    sentAt: new Date(),
    source: 'agent_sent',
    forwardedFrom: {
      conversationId: sourceMessage.conversationId,
      messageId: sourceMessage._id,
      timestamp: sourceMessage.createdAt
    }
  });

  // Log in activity timeline
  await ActivityTimeline.create({
    accountId,
    conversationId: targetConversationId,
    activityType: 'message_sent',
    actor: {
      type: 'agent',
      id: forwardingAgentId
    },
    relatedMessageId: forwardedMessage._id,
    details: new Map([
      ['forwardedFrom', sourceMessage.conversationId.toString()],
      ['originalMessageId', messageId.toString()]
    ])
  });

  return forwardedMessage;
};

/**
 * Handle incoming message from WhatsApp webhook
 */
export const handleIncomingMessage = async (accountId, conversationId, phoneNumberId, senderPhone, messageData) => {
  const message = await Message.create({
    accountId,
    phoneNumberId,
    conversationId,
    messageType: messageData.type || 'text',
    content: {
      text: messageData.text?.body || ''
    },
    recipientPhone: senderPhone,
    direction: 'inbound',
    status: 'delivered',
    deliveredAt: new Date(),
    waMessageId: messageData.id,
    source: 'webhook'
  });

  // Update conversation
  await Conversation.updateOne(
    { _id: conversationId },
    {
      lastMessageAt: new Date(),
      lastMessagePreview: messageData.text?.body?.substring(0, 200) || '',
      lastMessageType: messageData.type || 'text',
      $inc: { messageCount: 1, unreadCount: 1 }
    }
  );

  // Log in activity timeline
  await ActivityTimeline.create({
    accountId,
    conversationId,
    activityType: 'message_received',
    actor: {
      type: 'customer'
    },
    relatedMessageId: message._id,
    details: new Map([
      ['messageType', messageData.type || 'text'],
      ['senderPhone', senderPhone]
    ])
  });

  return message;
};

/**
 * Search messages
 */
export const searchMessages = async (conversationId, accountId, searchText, limit = 50) => {
  const messages = await Message.find(
    {
      conversationId,
      accountId,
      'content.text': { $regex: searchText, $options: 'i' }
    },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .limit(limit)
    .lean();

  return messages;
};

export default {
  sendMessage,
  getMessages,
  updateMessageStatus,
  markMessageAsRead,
  addReaction,
  removeReaction,
  forwardMessage,
  handleIncomingMessage,
  searchMessages
};
