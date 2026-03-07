import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import ActivityTimeline from '../models/ActivityTimeline.js';
import whatsappService from './whatsappService.js';

/**
 * MessageService
 * Business logic for message operations
 * Single source of truth for all message logic
 */

/**
 * Send text message to customer via WhatsApp
 */
export const sendMessage = async (conversationId, content, messageType = 'text', accountId, phoneNumberId, agentId) => {
  // Get conversation details
  const conversation = await Conversation.findOne({
    _id: conversationId,
    accountId
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // If phoneNumberId is not provided, get it from conversation
  if (!phoneNumberId) {
    phoneNumberId = conversation.phoneNumberId;
  }

  if (!phoneNumberId) {
    throw new Error('Phone number ID not found in conversation or request');
  }

  // Prepare message payload
  const messagePayload = {
    recipientPhone: conversation.userPhone,
    message: content,
    messageType: messageType
  };

  // Send via WhatsApp API
  const whatsappResponse = await whatsappService.sendTextMessage(
    accountId,
    phoneNumberId,
    messagePayload.recipientPhone,
    messagePayload.message
  );

  // Store message in database
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

  // Update conversation
  await Conversation.updateOne(
    { _id: conversationId },
    {
      lastMessageAt: new Date(),
      updatedAt: new Date(),
      lastMessagePreview: content.substring(0, 200),
      lastMessageType: messageType,
      messageCount: { $inc: 1 },
      unreadCount: 0
    }
  );

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

  return {
    messages: messages.reverse(),
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
    throw new Error('Message not found');
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
    throw new Error('Message not found');
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
    throw new Error('Message not found');
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
    throw new Error('Message not found');
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
    throw new Error('Source message not found');
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
