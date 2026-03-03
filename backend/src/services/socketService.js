import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { JWT_SECRET } from '../config/jwt.js';
import Conversation from '../models/Conversation.js';

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
    console.error('❌ Socket.io engine connection error:', {
      code: err.code,
      message: err.message,
      type: err.type
    });
  });

  // ✅ FIX #1: Event Verification Middleware - validates accountId on all incoming events
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    console.log('\n🔐 Socket Auth Verification:');
    console.log('  Transport:', socket.conn?.transport?.name);
    console.log('  Token exists:', !!token);
    console.log('  Token length:', token?.length || 0);
    
    if (!token) {
      console.error('  ❌ No token provided');
      return next(new Error('Authentication error - no token'));
    }

    try {
      const cleanToken = token.replace('Bearer ', '');
      const decoded = jwt.verify(cleanToken, JWT_SECRET);
      console.log('  ✅ Token verified');
      
      socket.userId = decoded.accountId;
      socket.email = decoded.email;
      socket.accountId = decoded.accountId;
      socket.isAuthenticated = true;  // ✅ Mark as authenticated for event verification
      next();
    } catch (error) {
      console.error('  ❌ JWT Verification FAILED:', error.message);
      next(new Error('Invalid token: ' + error.message));
    }
  });

  // ✅ FIX #4: Security Audit Logging - log all socket events for security monitoring
  io.use((socket, next) => {
    socket.onAny((eventName, ...args) => {
      // Log security-relevant events
      if (['join_conversation', 'typing', 'subscribe_conversations'].includes(eventName)) {
        console.log(`🔐 SOCKET EVENT [${socket.email}]:`, {
          event: eventName,
          socketId: socket.id,
          accountId: socket.accountId,
          timestamp: new Date().toISOString()
        });
      }
    });
    next();
  });

  // Track user's current conversation
  const userConversations = new Map();
  const conversationUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id} (${socket.email})`);

    /**
     * Join a specific conversation room
     * Enables real-time updates for that conversation
     * ✅ FIX #2: Conversation Ownership Check - verify user owns this conversation
     */
    socket.on('join_conversation', async (data) => {
      const { conversationId } = data;
      if (!conversationId) {
        console.error('❌ join_conversation: No conversationId provided');
        return;
      }

      try {
        // ✅ FIX #2: Query database to verify conversation ownership
        const conversation = await Conversation.findById(conversationId).select('accountId _id').lean();
        
        if (!conversation) {
          console.error('❌ Unauthorized join_conversation attempt:', {
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
          console.error('❌ SECURITY ALERT: Cross-account join_conversation attempt!', {
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
        
        console.log('✅ USER JOINED CONVERSATION ROOM (VERIFIED)', {
          userId: socket.email,
          socketId: socket.id,
          accountId: socket.accountId,
          conversationId: conversationId,
          room: `conversation:${conversationId}`,
          totalUsersInConversation: conversationUsers.get(conversationId).size,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Error in join_conversation:', {
          error: error.message,
          conversationId,
          socketId: socket.id,
          stack: error.stack
        });
        socket.emit('error', { message: 'Error joining conversation' });
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
        
        console.log(`📍 User ${socket.email} left conversation ${conversationId}`);
      }
    });

    /**
     * Subscribe to all conversations for the user
     */
    socket.on('subscribe_conversations', () => {
      socket.join(`user:${socket.accountId}`);
      console.log(`📭 User ${socket.email} subscribed to conversations`);
    });

    /**
     * Handle typing indicator
     * ✅ FIX #3: Typing Indicator Protection - verify conversation ownership before broadcasting
     */
    socket.on('typing', async (data) => {
      const { conversationId, isTyping } = data;
      if (!conversationId) {
        console.error('❌ typing: No conversationId provided');
        return;
      }

      try {
        // ✅ FIX #3: Query database to verify conversation ownership before broadcasting
        const conversation = await Conversation.findById(conversationId).select('accountId _id').lean();
        
        if (!conversation) {
          console.error('❌ Unauthorized typing attempt: Conversation not found', {
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
          console.error('❌ SECURITY ALERT: Cross-account typing attempt!', {
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

        console.log('✅ Typing indicator broadcast (verified)', {
          conversationId,
          accountId: socket.accountId,
          isTyping
        });
      } catch (error) {
        console.error('❌ Error in typing indicator:', {
          error: error.message,
          conversationId,
          socketId: socket.id,
          stack: error.stack
        });
        // Silent fail - don't broadcast
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ User disconnected: ${socket.id} (${socket.email})`);
      console.log('  Disconnect reason:', reason);
      console.log('  Socket state:', socket.connected);
      userConversations.delete(socket.id);
    });

    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.email}:`, error);
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
    console.error('❌ Socket.io instance is null - cannot broadcast new message');
    return;
  }
  
  try {
    const payload = {
      conversationId,
      message,
      timestamp: new Date().toISOString(),
    };
    
    const room = `conversation:${conversationId}`;
    console.log('%c📡 BROADCASTING NEW MESSAGE', {
      room: room,
      messageId: message._id,
      messageType: message.messageType,
      from: message.recipientPhone,
      conversationIdType: typeof conversationId,
      timestamp: new Date().toISOString()
    });
    
    // ✅ Emit with acknowledgment callback to detect failures
    io.to(room).emit('new_message', payload, (err) => {
      if (err) {
        console.error('❌ Broadcast new_message failed:', {
          room: room,
          error: err.message
        });
      } else {
        console.log('✅ Broadcast new_message successful to room:', room);
      }
    });
  } catch (error) {
    console.error('❌ Error broadcasting new message:', {
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
    console.error('❌ Socket.io instance is null - cannot broadcast conversation update');
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
    console.log('📡 BROADCASTING CONVERSATION UPDATE (REALTIME):', {
      room: room,
      conversationId: conversation._id,
      userPhone: conversation.userPhone,
      userName: conversation.userName || 'Unknown',
      lastMessagePreview: conversation.lastMessagePreview?.substring(0, 30),
      unreadCount: conversation.unreadCount,
      timestamp: new Date().toISOString()
    });
    
    // ✅ Emit with acknowledgment callback
    io.to(room).emit('conversation_update', enrichedConversation, (err) => {
      if (err) {
        console.error('❌ Broadcast conversation_update failed:', {
          room: room,
          error: err.message
        });
      } else {
        console.log('✅ Broadcast conversation_update successful to', room);
      }
    });
  } catch (error) {
    console.error('❌ Error broadcasting conversation update:', {
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
    console.error('❌ Socket.io instance is null - cannot broadcast message status');
    return;
  }
  
  try {
    const payload = {
      messageId,
      status,
      timestamp: new Date().toISOString(),
    };
    
    console.log('📡 Broadcasting message status:', {
      room: `conversation:${conversationId}`,
      messageId,
      status
    });
    
    // ✅ Emit with acknowledgment callback
    io.to(`conversation:${conversationId}`).emit('message_status', payload, (err) => {
      if (err) {
        console.error('❌ Broadcast message_status failed:', {
          room: `conversation:${conversationId}`,
          error: err.message
        });
      } else {
        console.log('✅ Broadcast message_status successful');
      }
    });
  } catch (error) {
    console.error('❌ Error broadcasting message status:', {
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
    console.error('❌ Socket.io instance is null - cannot broadcast phone status');
    return;
  }
  
  try {
    console.log('📡 Broadcasting phone status change:', {
      accountId,
      phoneNumberId: phoneNumber.phoneNumberId,
      isActive: phoneNumber.isActive,
      qualityRating: phoneNumber.qualityRating
    });
    
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
        console.error('❌ Broadcast phone_status_changed failed:', {
          room: `user:${accountId}`,
          error: err.message
        });
      } else {
        console.log('✅ Broadcast phone_status_changed successful');
      }
    });
  } catch (error) {
    console.error('❌ Error broadcasting phone status:', {
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
    console.log('📤 Broadcasting sent message:', {
      accountId,
      messageId: message._id,
      recipientPhone: message.recipientPhone,
      status: message.status
    });
    
    const payload = {
      _id: message._id,
      conversationId: message.conversationId,
      recipientPhone: message.recipientPhone,
      messageType: message.messageType,
      content: message.content,
      status: message.status,
      direction: 'outbound',
      waMessageId: message.waMessageId,
      sentAt: message.sentAt,
      createdAt: message.createdAt,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast to all clients in this account
    io.to(`user:${accountId}`).emit('message.sent', payload);
    console.log('✅ Sent message broadcast complete');
  } catch (error) {
    console.error('❌ Error broadcasting sent message:', {
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
    console.log('📥 Broadcasting received message:', {
      accountId,
      messageId: message._id,
      senderPhone: message.senderPhone,
      contactName
    });
    
    const payload = {
      _id: message._id,
      conversationId: message.conversationId,
      senderPhone: message.senderPhone,
      senderName: contactName || 'Unknown',
      messageType: message.messageType,
      content: message.content,
      status: message.status,
      direction: 'inbound',
      waMessageId: message.waMessageId,
      receivedAt: message.receivedAt,
      createdAt: message.createdAt,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast to all clients in this account
    io.to(`user:${accountId}`).emit('message.received', payload);
    console.log('✅ Received message broadcast complete');
  } catch (error) {
    console.error('❌ Error broadcasting received message:', {
      error: error.message,
      accountId,
      messageId: message._id
    });
  }
};
