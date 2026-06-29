import messageService from '../services/messageService.js';
import { emitToConversation, emitToAccount } from '../services/liveChat-socketHandler.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * Handle WhatsApp incoming messages with real-time Socket.IO updates
 * Integrates with liveChat feature for real-time agent updates
 */
export const handleIncomingMessageWithRealtime = async (
  message,
  contact,
  accountId,
  phoneNumberId
) => {
  try {
    // Process message through messageService
    const processedMessage = await messageService.handleIncomingMessage(
      message,
      contact,
      accountId,
      phoneNumberId
    );

    if (!processedMessage) {
      console.warn('⚠️ Message processing returned null');
      return null;
    }

    // Emit real-time event to specific conversation room
    // ✅ Using 'new_message' to match frontend listener
    // ✅ Flat structure to match frontend Message type
    emitToConversation(accountId, processedMessage.conversationId, 'new_message', {
      _id: processedMessage._id?.toString(),
      conversationId: processedMessage.conversationId?.toString(),
      senderRole: processedMessage.direction === 'inbound' ? 'customer' : 'agent',
      senderName: contact?.name || 'Customer',
      text: processedMessage.content?.text || processedMessage.content || '',
      mediaUrl: processedMessage.content?.mediaUrl,
      mediaType: processedMessage.content?.mediaType,
      status: processedMessage.status,
      createdAt: processedMessage.createdAt,
      replyTo: processedMessage.replyTo,
      reactions: processedMessage.reactions || []
    });

    return processedMessage;
  } catch (error) {
    logger.error('❌ Error handling incoming message with realtime:', error);
    throw error;
  }
};

/**
 * Handle WhatsApp message delivery status update with real-time Socket.IO updates
 */
export const handleMessageDeliveryStatusWithRealtime = async (
  waMessageId,
  status,
  accountId
) => {
  try {
    // Update message status through service
    const message = await messageService.updateMessageStatusByWAId(
      waMessageId,
      status,
      accountId
    );

    if (!message) {
      console.warn('⚠️ Message not found for status update:', waMessageId);
      return null;
    }

    // Emit real-time event to specific conversation
    emitToConversation(accountId, message.conversationId, 'message_status_updated', {
      messageId: message._id,
      status: message.status,
      timestamp: new Date()
    });

    return message;
  } catch (error) {
    logger.error('❌ Error handling delivery status with realtime:', error);
    throw error;
  }
};

/**
 * Handle WhatsApp message read status with real-time Socket.IO updates
 */
export const handleMessageReadStatusWithRealtime = async (
  waMessageId,
  accountId
) => {
  try {
    // Update message to read status
    const message = await messageService.updateMessageStatusByWAId(
      waMessageId,
      'read',
      accountId
    );

    if (!message) {
      console.warn('⚠️ Message not found for read status:', waMessageId);
      return null;
    }

    // Emit real-time event
    // Emit real-time event to specific conversation
    emitToConversation(accountId, message.conversationId, 'message_read', {
      messageId: message._id,
      conversationId: message.conversationId,
      readBy: 'customer', // Customer read the message
      timestamp: new Date()
    });

    return message;
  } catch (error) {
    logger.error('❌ Error handling read status with realtime:', error);
    throw error;
  }
};

/**
 * Broadcast notification to specific agent
 */
export const sendNotificationToAgent = (agentId, title, message, data = {}) => {
  try {
    emitToAgent(agentId, 'notification', {
      title,
      message,
      data,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('❌ Error sending notification to agent:', error);
  }
};

/**
 * Broadcast notification to all agents in account
 */
export const sendNotificationToAccount = (accountId, title, message, data = {}) => {
  try {
    emitToAccount(accountId, 'notification', {
      title,
      message,
      data,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('❌ Error sending notification to account:', error);
  }
};

/**
 * Handle typing indicator from WhatsApp contact
 */
export const handleContactTypingIndicator = (
  accountId,
  conversationId,
  contactName,
  isTyping = true
) => {
  try {
    if (isTyping) {
      emitToConversation(accountId, conversationId, 'contact_typing', {
        conversationId,
        contactName,
        isTyping: true,
        timestamp: new Date()
      });
    } else {
      emitToConversation(accountId, conversationId, 'contact_typing_stop', {
        conversationId,
        contactName,
        timestamp: new Date()
      });
    }
  } catch (error) {
    logger.error('❌ Error handling typing indicator:', error);
  }
};

export default {
  handleIncomingMessageWithRealtime,
  handleMessageDeliveryStatusWithRealtime,
  handleMessageReadStatusWithRealtime,
  sendNotificationToAgent,
  sendNotificationToAccount,
  handleContactTypingIndicator
};
