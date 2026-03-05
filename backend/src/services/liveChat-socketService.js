/**
 * Socket.IO Service
 * Handles all real-time event broadcasting for live chat
 * This is the central hub for real-time communication
 */

let io = null;

/**
 * Initialize Socket.IO instance
 */
export const initializeSocketIO = (socketIOInstance) => {
  io = socketIOInstance;
  console.log('✅ Socket.IO initialized');
  return io;
};

/**
 * Get Socket.IO instance
 */
export const getSocketIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

/**
 * Broadcast message received event to all agents
 */
export const broadcastMessageReceived = (accountId, conversationId, message) => {
  if (!io) return;
  
  const room = `account:${accountId}:conversation:${conversationId}`;
  
  io.to(room).emit('message_received', {
    conversationId,
    message: {
      _id: message._id,
      content: message.content,
      direction: message.direction,
      messageType: message.messageType,
      createdAt: message.createdAt,
      status: message.status,
      sender: {
        type: message.direction === 'inbound' ? 'customer' : 'agent'
      }
    },
    timestamp: new Date()
  });

  // Broadcast unread count update to account room
  io.to(`account:${accountId}`).emit('conversation_updated', {
    conversationId,
    updates: {
      unreadCount: true,
      lastMessage: true
    }
  });
};

/**
 * Broadcast message sent event (when agent sends)
 */
export const broadcastMessageSent = (accountId, conversationId, message) => {
  if (!io) return;

  const room = `account:${accountId}:conversation:${conversationId}`;

  io.to(room).emit('message_sent', {
    conversationId,
    message: {
      _id: message._id,
      content: message.content,
      messageType: message.messageType,
      createdAt: message.createdAt,
      status: 'sent',
      sentAt: message.sentAt
    },
    timestamp: new Date()
  });
};

/**
 * Broadcast message delivered event (WhatsApp webhook)
 */
export const broadcastMessageDelivered = (accountId, conversationId, messageId, deliveredAt) => {
  if (!io) return;

  const room = `account:${accountId}:conversation:${conversationId}`;

  io.to(room).emit('message_delivered', {
    conversationId,
    messageId,
    deliveredAt,
    status: 'delivered',
    timestamp: new Date()
  });
};

/**
 * Broadcast message read event (WhatsApp webhook)
 */
export const broadcastMessageRead = (accountId, conversationId, messageId, readAt) => {
  if (!io) return;

  const room = `account:${accountId}:conversation:${conversationId}`;

  io.to(room).emit('message_read', {
    conversationId,
    messageId,
    readAt,
    status: 'read',
    timestamp: new Date()
  });
};

/**
 * Broadcast conversation assigned event
 */
export const broadcastConversationAssigned = (accountId, conversationId, agentId, agentName) => {
  if (!io) return;

  const room = `account:${accountId}`;

  io.to(room).emit('conversation_assigned', {
    conversationId,
    assignedAgentId: agentId,
    assignedAgentName: agentName,
    timestamp: new Date()
  });
};

/**
 * Broadcast conversation closed event
 */
export const broadcastConversationClosed = (accountId, conversationId, reason) => {
  if (!io) return;

  const room = `account:${accountId}`;

  io.to(room).emit('conversation_closed', {
    conversationId,
    reason,
    timestamp: new Date()
  });
};

/**
 * Broadcast conversation reopened event
 */
export const broadcastConversationReopened = (accountId, conversationId) => {
  if (!io) return;

  const room = `account:${accountId}`;

  io.to(room).emit('conversation_reopened', {
    conversationId,
    timestamp: new Date()
  });
};

/**
 * Broadcast typing start event
 */
export const broadcastTypingStart = (accountId, conversationId, agentId, agentName) => {
  if (!io) return;

  const room = `account:${accountId}:conversation:${conversationId}`;

  io.to(room).emit('typing_start', {
    conversationId,
    agentId,
    agentName,
    type: 'agent',
    timestamp: new Date()
  });
};

/**
 * Broadcast typing stop event
 */
export const broadcastTypingStop = (accountId, conversationId, agentId) => {
  if (!io) return;

  const room = `account:${accountId}:conversation:${conversationId}`;

  io.to(room).emit('typing_stop', {
    conversationId,
    agentId,
    timestamp: new Date()
  });
};

/**
 * Broadcast tag added event
 */
export const broadcastTagAdded = (accountId, conversationId, tagName, tagColor) => {
  if (!io) return;

  const room = `account:${accountId}`;

  io.to(room).emit('tag_added', {
    conversationId,
    tagName,
    tagColor,
    timestamp: new Date()
  });
};

/**
 * Broadcast tag removed event
 */
export const broadcastTagRemoved = (accountId, conversationId, tagName) => {
  if (!io) return;

  const room = `account:${accountId}`;

  io.to(room).emit('tag_removed', {
    conversationId,
    tagName,
    timestamp: new Date()
  });
};

/**
 * Broadcast internal note added event
 */
export const broadcastNoteAdded = (accountId, conversationId, noteId, createdByAgentName, contentPreview) => {
  if (!io) return;

  const room = `account:${accountId}:conversation:${conversationId}`;

  io.to(room).emit('note_added', {
    conversationId,
    noteId,
    createdBy: createdByAgentName,
    contentPreview,
    timestamp: new Date()
  });
};

/**
 * Broadcast conversation updated event (status, priority, etc.)
 */
export const broadcastConversationUpdated = (accountId, conversationId, updates) => {
  if (!io) return;

  const room = `account:${accountId}`;

  io.to(room).emit('conversation_updated', {
    conversationId,
    updates,
    timestamp: new Date()
  });
};

/**
 * Broadcast agent joined chat
 */
export const broadcastAgentJoinedChat = (accountId, conversationId, agentId, agentName) => {
  if (!io) return;

  const room = `account:${accountId}:conversation:${conversationId}`;

  io.to(room).emit('agent_joined_chat', {
    conversationId,
    agentId,
    agentName,
    timestamp: new Date()
  });
};

/**
 * Broadcast agent left chat
 */
export const broadcastAgentLeftChat = (accountId, conversationId, agentId) => {
  if (!io) return;

  const room = `account:${accountId}:conversation:${conversationId}`;

  io.to(room).emit('agent_left_chat', {
    conversationId,
    agentId,
    timestamp: new Date()
  });
};

/**
 * Broadcast conversation list updated (new conversation or reordering)
 */
export const broadcastConversationListUpdated = (accountId) => {
  if (!io) return;

  const room = `account:${accountId}`;

  io.to(room).emit('conversation_list_updated', {
    timestamp: new Date()
  });
};

/**
 * Broadcast message reaction added
 */
export const broadcastReactionAdded = (accountId, conversationId, messageId, emoji, addedByName) => {
  if (!io) return;

  const room = `account:${accountId}:conversation:${conversationId}`;

  io.to(room).emit('reaction_added', {
    conversationId,
    messageId,
    emoji,
    addedBy: addedByName,
    timestamp: new Date()
  });
};

/**
 * Broadcast message reaction removed
 */
export const broadcastReactionRemoved = (accountId, conversationId, messageId, emoji, removedByAgentId) => {
  if (!io) return;

  const room = `account:${accountId}:conversation:${conversationId}`;

  io.to(room).emit('reaction_removed', {
    conversationId,
    messageId,
    emoji,
    removedBy: removedByAgentId,
    timestamp: new Date()
  });
};

/**
 * Send notification to specific agent
 */
export const sendNotificationToAgent = (agentId, notification) => {
  if (!io) return;

  io.to(`agent:${agentId}`).emit('notification', {
    ...notification,
    timestamp: new Date()
  });
};

/**
 * Send notification to all agents in account
 */
export const sendNotificationToAccount = (accountId, notification) => {
  if (!io) return;

  io.to(`account:${accountId}`).emit('notification', {
    ...notification,
    timestamp: new Date()
  });
};

export default {
  initializeSocketIO,
  getSocketIO,
  broadcastMessageReceived,
  broadcastMessageSent,
  broadcastMessageDelivered,
  broadcastMessageRead,
  broadcastConversationAssigned,
  broadcastConversationClosed,
  broadcastConversationReopened,
  broadcastTypingStart,
  broadcastTypingStop,
  broadcastTagAdded,
  broadcastTagRemoved,
  broadcastNoteAdded,
  broadcastConversationUpdated,
  broadcastAgentJoinedChat,
  broadcastAgentLeftChat,
  broadcastConversationListUpdated,
  broadcastReactionAdded,
  broadcastReactionRemoved,
  sendNotificationToAgent,
  sendNotificationToAccount
};
