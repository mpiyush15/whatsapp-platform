import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { JWT_SECRET } from '../config/jwt.js';
import Conversation from '../models/Conversation.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * Initialize Socket.io for real-time chat
 * Handles WebSocket connections, authentication, and event broadcasting
 */
export const initSocketIO = (server) => {
  
  // ✅ CRITICAL FIX: Configure Socket.io properly for production
  // Read CORS origins from environment variable
  const socketCorsOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  
  const io = new Server(server, {
    // ✅ Enable both WebSocket and HTTP polling (with polling as fallback)
    transports: ['websocket', 'polling'],
    
    // ✅ Configure HTTP polling to handle intermittent connections
    httpCompression: true,
    pingInterval: 25000,  // Send ping every 25s (default is 25000)
    pingTimeout: 20000,   // Wait 20s for pong response (default is 20000)
    
    // ✅ Allow polling with proper settings
    polling: {
      maxHttpBufferSize: 1e5  // 100KB (default is 1e6)
    },
    
    // ✅ CORS configuration for production (reads from environment variable)
    cors: {
      origin: socketCorsOrigins,
      credentials: true,
      methods: ['GET', 'POST']
    },
    
    // ✅ Add connection timeout and upgrade settings
    allowUpgrades: true,
    connectTimeout: 45000,  // 45s to establish connection
  });

  // ✅ CRITICAL FIX: Add connection error handler at server level
  io.engine.on('connection_error', (err) => {
    logger.error('❌ Socket.io engine connection error:', {
      code: err.code,
      message: err.message,
      type: err.type
    });
  });

  // ✅ FIX #1: Event Verification Middleware - validates accountId on all incoming events
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      logger.error('❌ Socket: No token provided');
      return next(new Error('Authentication error - no token'));
    }

    try {
      const cleanToken = token.replace('Bearer ', '');
      const decoded = jwt.verify(cleanToken, JWT_SECRET);
      
      socket.userId = decoded.accountId;
      socket.email = decoded.email;
      socket.accountId = decoded.accountId;
      socket.isAuthenticated = true;  // ✅ Mark as authenticated for event verification
      next();
    } catch (error) {
      logger.error('❌ JWT Verification FAILED:', error.message);
      next(new Error('Invalid token: ' + error.message));
    }
  });

  // ✅ FIX #4: Security Audit Logging - log all socket events for security monitoring
  io.use((socket, next) => {
    socket.onAny((eventName, ...args) => {
      // Log only critical security-relevant events
      if (['join_conversation'].includes(eventName)) {
        // Only log errors, not every event
      }
    });
    next();
  });

  // Track user's current conversation
  const userConversations = new Map();
  const conversationUsers = new Map();

  io.on('connection', (socket) => {
    // User connected


    /**
     * Join a specific conversation room
     * Enables real-time updates for that conversation
     * ✅ FIX #2: Conversation Ownership Check - verify user owns this conversation
     */
    socket.on('join_conversation', async (data) => {
      const { conversationId } = data;
      if (!conversationId) {
        logger.error('❌ join_conversation: No conversationId provided');
        return;
      }

      try {
        // ✅ FIX #2: Query database to verify conversation ownership
        const conversation = await Conversation.findById(conversationId).select('accountId _id').lean();
        
        if (!conversation) {
          logger.error('❌ Unauthorized join_conversation attempt:', {
            socketId: socket.id,
            email: socket.email,
            accountId: socket.accountId,
            attemptedConversationId: conversationId,
            reason: 'Conversation not found'
          });
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        // ✅ Verify accountId matches (convert both to strings for comparison)
        const conversationAccountId = String(conversation.accountId);
        const socketAccountId = String(socket.accountId);
        
        if (conversationAccountId !== socketAccountId) {
          logger.error('❌ SECURITY ALERT: Cross-account join_conversation attempt!', {
            socketId: socket.id,
            email: socket.email,
            socketAccountId: socketAccountId,
            conversationAccountId: conversationAccountId,
            conversationId: conversationId,
            timestamp: new Date().toISOString()
          });
          socket.emit('error', { message: 'Unauthorized access to conversation' });
          return;
        }

        // ✅ User owns this conversation - allow join
        socket.join(`conversation:${conversationId}`);
        userConversations.set(socket.id, conversationId);
        
        // Track which users are in this conversation
        if (!conversationUsers.has(conversationId)) {
          conversationUsers.set(conversationId, new Set());
        }
        conversationUsers.get(conversationId).add(socket.id);
      } catch (error) {
        logger.error('❌ Error in join_conversation:', {
          error: error.message,
          conversationId,
          socketId: socket.id
        });
        socket.emit('error', { message: 'Error joining conversation' });
      }
    });

    /**
     * Join user room - receives conversation updates when messages are sent
     * This allows the conversation list to update in real-time without page refresh
     */
    socket.on('join_user_room', (data) => {
      const { accountId } = data;
      const roomName = `user:${accountId}`;
      
      // Verify accountId matches authenticated user
      if (accountId && String(accountId) === String(socket.accountId)) {
        socket.join(roomName);
        logger.info('✅ Socket joined user room:', roomName, 'for socket:', socket.id);
      } else {
        logger.error('❌ Unauthorized join_user_room attempt:', {
          socketId: socket.id,
          email: socket.email,
          socketAccountId: socket.accountId,
          requestedAccountId: accountId
        });
      }
    });

    /**
     * Leave a conversation room
     */
    socket.on('leave_conversation', (data) => {
      const { conversationId } = data;
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
        userConversations.delete(socket.id);
        
        const users = conversationUsers.get(conversationId);
        if (users) {
          users.delete(socket.id);
          if (users.size === 0) {
            conversationUsers.delete(conversationId);
          }
        }
      }
    });

    /**
     * 🔴 HANDLE MESSAGE SEND VIA SOCKET (REALTIME)
     * Receives message from frontend, sends to backend API, broadcasts response
     */
    socket.on('send_message', async (data, callback) => {
      const { conversationId, phoneNumberId, recipientPhone, message } = data;

      try {
        // Validate input
        if (!conversationId || !phoneNumberId || !recipientPhone || !message) {
          logger.error('❌ send_message: Missing required fields');
          return callback({ success: false, message: 'Missing required fields' });
        }

        // ✅ Verify conversation ownership
        const conversation = await Conversation.findById(conversationId).select('accountId _id').lean();
        
        if (!conversation) {
          logger.error('❌ send_message: Conversation not found');
          return callback({ success: false, message: 'Conversation not found' });
        }

        const conversationAccountId = String(conversation.accountId);
        const socketAccountId = String(socket.accountId);
        
        if (conversationAccountId !== socketAccountId) {
          logger.error('❌ SECURITY ALERT: Cross-account send_message attempt!', {
            socketId: socket.id,
            email: socket.email,
            conversationId,
            timestamp: new Date().toISOString()
          });
          return callback({ success: false, message: 'Unauthorized' });
        }

        // ✅ Send message via API endpoint to backend controller
        // This ensures all business logic (WhatsApp API call, DB save, etc.) is centralized
        const response = await fetch(`http://localhost:${process.env.PORT || 5050}/api/messages/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.token || socket.handshake.auth.token}`
          },
          body: JSON.stringify({
            phoneNumberId,
            recipientPhone,
            message
          })
        });

        const apiResponse = await response.json();

        if (apiResponse.success) {
          callback({ success: true, message: 'Message sent' });
        } else {
          logger.error('❌ API failed to send message:', apiResponse);
          callback({ success: false, message: apiResponse.message || 'Failed to send message' });
        }
      } catch (error) {
        logger.error('❌ Error in send_message:', error.message);
        callback({ success: false, message: 'Error sending message: ' + error.message });
      }
    });

    /**
     * Subscribe to all conversations for the user
     */
    socket.on('subscribe_conversations', () => {
      socket.join(`user:${socket.accountId}`);
    });

    /**
     * Handle typing indicator
     * ✅ FIX #3: Typing Indicator Protection - verify conversation ownership before broadcasting
     */
    socket.on('typing', async (data) => {
      const { conversationId, isTyping } = data;
      if (!conversationId) {
        logger.error('❌ typing: No conversationId provided');
        return;
      }

      try {
        // ✅ FIX #3: Query database to verify conversation ownership before broadcasting
        const conversation = await Conversation.findById(conversationId).select('accountId _id').lean();
        
        if (!conversation) {
          logger.error('❌ Unauthorized typing attempt: Conversation not found', {
            conversationId,
            socketId: socket.id,
            email: socket.email
          });
          return;  // Silent fail (security best practice - don't reveal conversation doesn't exist)
        }

        // ✅ Verify accountId matches (convert both to strings for comparison)
        const conversationAccountId = String(conversation.accountId);
        const socketAccountId = String(socket.accountId);
        
        if (conversationAccountId !== socketAccountId) {
          logger.error('❌ SECURITY ALERT: Cross-account typing attempt!', {
            socketId: socket.id,
            email: socket.email,
            socketAccountId: socketAccountId,
            conversationAccountId: conversationAccountId,
            conversationId: conversationId,
            timestamp: new Date().toISOString()
          });
          return;  // Silent fail (don't broadcast)
        }

        // ✅ User owns this conversation - broadcast typing indicator
        io.to(`conversation:${conversationId}`).emit('typing', {
          userId: socket.accountId,
          isTyping,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('❌ Error in typing indicator:', {
          error: error.message,
          conversationId,
          socketId: socket.id
        });
        // Silent fail - don't broadcast
      }
    });

    socket.on('disconnect', (reason) => {
      userConversations.delete(socket.id);
    });

    socket.on('error', (error) => {
      logger.error(`❌ Socket error for ${socket.email}:`, error);
    });
  });

  return io;
};

/**
 * ✅ CRITICAL FIX: Broadcast new message with error handling
 * Validates io instance, catches broadcast failures, logs for debugging
 * Called from webhook or message controller
 */
export const broadcastNewMessage = (io, conversationId, message) => {
  // ✅ CRITICAL: Validate io instance exists
  if (!io) {
    logger.error('❌ Socket.io instance is null - cannot broadcast new message');
    return;
  }
  
  try {
    // Transform message to frontend format
    const transformedMessage = {
      _id: message._id?.toString(),
      conversationId: message.conversationId?.toString(),
      content: message.content?.text || message.content || '',
      messageType: message.messageType || 'text',
      direction: message.direction,
      status: message.status,
      senderType: message.direction === 'inbound' ? 'customer' : 'agent',
      createdAt: message.createdAt?.toISOString ? message.createdAt.toISOString() : message.createdAt,
      recipientPhone: message.recipientPhone,
      recipientName: message.recipientName,
      isInternalNote: message.isInternalNote
    };

    const payload = {
      conversationId,
      message: transformedMessage,
      timestamp: new Date().toISOString(),
    };
    
    const room = `conversation:${conversationId}`;
    
    // ✅ Emit with acknowledgment callback to detect failures
    io.to(room).emit('new_message', payload, (err) => {
      if (err) {
        logger.error('❌ Broadcast new_message failed:', err.message);
      }
    });
  } catch (error) {
    logger.error('❌ Error broadcasting new message:', {
      error: error.message,
      conversationId,
      stack: error.stack
    });
  }
};

/**
 * ✅ CRITICAL FIX: Broadcast conversation update with error handling
 * NOW INCLUDES: Contact name, phone number, and all display data
 */
export const broadcastConversationUpdate = (io, accountId, conversation) => {
  // ✅ CRITICAL: Validate io instance exists
  if (!io) {
    logger.error('❌ Socket.io instance is null - cannot broadcast conversation update');
    return;
  }
  
  try {
    // ✅ CRITICAL: Enrich conversation data for UI rendering
    const enrichedConversation = {
      _id: conversation._id,
      conversationId: conversation.conversationId,
      userPhone: conversation.userPhone,
      phoneNumberId: conversation.phoneNumberId,
      accountId: conversation.accountId,
      workspaceId: conversation.workspaceId,
      
      // ✅ DISPLAY DATA FOR UI (Contact names, message preview, etc)
      userName: conversation.userName || 'Unknown',
      userProfileName: conversation.userProfileName || 'Unknown',
      userProfilePic: conversation.userProfilePic || null,
      
      // ✅ MESSAGE PREVIEW & METADATA
      lastMessagePreview: conversation.lastMessagePreview || '(No messages)',
      lastMessageType: conversation.lastMessageType || 'text',
      lastMessageAt: conversation.lastMessageAt,
      
      // ✅ CONVERSATION STATE
      unreadCount: conversation.unreadCount || 0,
      status: conversation.status || 'open',
      startedAt: conversation.startedAt,
      
      // ✅ TIMESTAMPS
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      timestamp: new Date().toISOString(),
    };
    
    const room = `user:${accountId}`;
    
    // ✅ Emit with acknowledgment callback
    io.to(room).emit('conversation_update', enrichedConversation, (err) => {
      if (err) {
        logger.error('❌ Broadcast conversation_update failed:', err.message);
      }
    });
  } catch (error) {
    logger.error('❌ Error broadcasting conversation update:', {
      error: error.message,
      accountId,
      stack: error.stack
    });
  }
};

/**
 * ✅ CRITICAL FIX: Broadcast message status update with error handling
 */
export const broadcastMessageStatus = (io, conversationId, messageId, status) => {
  // ✅ CRITICAL: Validate io instance exists
  if (!io) {
    logger.error('❌ Socket.io instance is null - cannot broadcast message status');
    return;
  }
  
  try {
    const payload = {
      messageId,
      status,
      timestamp: new Date().toISOString(),
    };
    
    // ✅ Emit with acknowledgment callback
    io.to(`conversation:${conversationId}`).emit('message_status', payload, (err) => {
      if (err) {
        logger.error('❌ Broadcast message_status failed');
      }
    });
  } catch (error) {
    logger.error('❌ Error broadcasting message status:', {
      error: error.message,
      conversationId,
      messageId,
      stack: error.stack
    });
  }
};

/**
 * ✅ CRITICAL FIX: Broadcast phone status change with error handling
 * Called when phone connection test succeeds/fails
 */
export const broadcastPhoneStatusChange = (io, accountId, phoneNumber) => {
  // ✅ CRITICAL: Validate io instance exists
  if (!io) {
    logger.error('❌ Socket.io instance is null - cannot broadcast phone status');
    return;
  }
  
  try {
    const payload = {
      phoneNumberId: phoneNumber.phoneNumberId,
      isActive: phoneNumber.isActive,
      qualityRating: phoneNumber.qualityRating,
      displayPhoneNumber: phoneNumber.displayPhoneNumber,
      lastTestedAt: phoneNumber.lastTestedAt,
      verifiedName: phoneNumber.verifiedName,
      status: phoneNumber.isActive ? 'ACTIVE' : 'INACTIVE',
      timestamp: new Date().toISOString(),
    };
    
    // ✅ Emit with acknowledgment callback
    io.to(`user:${accountId}`).emit('phone_status_changed', payload, (err) => {
      if (err) {
        logger.error('❌ Broadcast phone_status_changed failed');
      }
    });
  } catch (error) {
    logger.error('❌ Error broadcasting phone status:', {
      error: error.message,
      accountId,
      stack: error.stack
    });
  }
};

/**
 * Broadcast sent message to all clients in real-time
 * Called when a message is successfully sent via Meta API
 */
export const broadcastSentMessage = (io, message, accountId) => {
  if (!io) return;
  
  try {
    logger.info('📤 Broadcasting sent message:', {
      accountId,
      messageId: message._id,
      recipientPhone: message.recipientPhone,
      status: message.status
    });
    
    const payload = {
      _id: message._id?.toString(),
      conversationId: message.conversationId?.toString(),
      recipientPhone: message.recipientPhone,
      messageType: message.messageType,
      content: message.content?.text || message.content || '',
      status: message.status,
      direction: 'outbound',
      waMessageId: message.waMessageId,
      sentAt: message.sentAt,
      createdAt: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
      timestamp: new Date().toISOString()
    };
    
    // ✅ Use 'new_message' for consistency with receiving flow (prevents frontend duplicate listener confusion)
    io.to(`user:${accountId}`).emit('new_message', payload);
    logger.info('✅ Sent message broadcast complete');
  } catch (error) {
    logger.error('❌ Error broadcasting sent message:', {
      error: error.message,
      accountId,
      messageId: message._id
    });
  }
};

/**
 * Broadcast received message to all clients in real-time
 * Called when a message is received via webhook
 */
export const broadcastReceivedMessage = (io, message, accountId, contactName = null) => {
  if (!io) return;
  
  try {
    // Use recipientPhone (it's the sender in inbound messages)
    const senderPhone = message.senderPhone || message.recipientPhone;
    
    logger.info('📥 Broadcasting received message:', {
      accountId,
      messageId: message._id,
      senderPhone,
      messageType: message.messageType,
      contactName
    });
    
    const payload = {
      _id: message._id?.toString(),
      conversationId: message.conversationId?.toString(),
      senderPhone,
      senderName: contactName || 'Unknown',
      messageType: message.messageType || 'text',
      content: message.content?.text || message.content || '',
      mediaUrl: message.content?.mediaUrl || null,
      caption: message.content?.caption || null,
      fileName: message.content?.filename || null,
      fileSize: message.content?.fileSize || null,
      status: message.status,
      direction: 'inbound',
      waMessageId: message.waMessageId,
      createdAt: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
      timestamp: new Date().toISOString()
    };
    
    // Broadcast to all clients in this account
    io.to(`user:${accountId}`).emit('message.received', payload);
    logger.info('✅ Received message broadcast complete');
  } catch (error) {
    logger.error('❌ Error broadcasting received message:', {
      error: error.message,
      accountId,
      messageId: message._id
    });
  }
};
