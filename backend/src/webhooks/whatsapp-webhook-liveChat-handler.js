import messageService from '../services/messageService.js';
import { emitToConversation, emitToAccount } from '../services/liveChat-socketHandler.js';

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

    // Emit real-time event to all agents in account
    emitToAccount(accountId, 'message_received', {
      messageId: processedMessage._id,
      conversationId: processedMessage.conversationId,
      contactId: contact._id,
      contactName: contact.name,
      contactPhone: contact.phone,
      content: processedMessage.content,
      messageType: processedMessage.messageType,
      timestamp: processedMessage.createdAt
    });

    // Also emit to specific conversation room
    emitToConversation(accountId, processedMessage.conversationId, 'message_received', {
      conversationId: processedMessage.conversationId,
      message: processedMessage
    });

    return processedMessage;
  } catch (error) {
    console.error('❌ Error handling incoming message with realtime:', error);
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

    // Emit real-time event
    emitToAccount(accountId, 'message_delivered', {
      messageId: message._id,
      conversationId: message.conversationId,
      status: message.status,
      timestamp: new Date()
    });

    emitToConversation(accountId, message.conversationId, 'message_status_updated', {
      messageId: message._id,
      status: message.status,
      timestamp: new Date()
    });

    return message;
  } catch (error) {
    console.error('❌ Error handling delivery status with realtime:', error);
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
    emitToAccount(accountId, 'message_read', {
      messageId: message._id,
      conversationId: message.conversationId,
      readBy: 'customer', // Customer read the message
      timestamp: new Date()
    });

    emitToConversation(accountId, message.conversationId, 'message_read_by_customer', {
      messageId: message._id,
      timestamp: new Date()
    });

    return message;
  } catch (error) {
    console.error('❌ Error handling read status with realtime:', error);
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
    console.error('❌ Error sending notification to agent:', error);
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
    console.error('❌ Error sending notification to account:', error);
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
    console.error('❌ Error handling typing indicator:', error);
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
