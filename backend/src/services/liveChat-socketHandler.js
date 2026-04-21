import { getSocketIO } from './liveChat-socketService.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * Socket.IO Connection Handler
 * Manages socket connections, authentication, and event listeners
 */

/**
 * Setup Socket.IO event handlers
 * Call this after Socket.IO is initialized
 */
export const setupSocketIOHandlers = (io) => {
  // Middleware: Authenticate socket connection
  io.use(async (socket, next) => {
    try {
      // Get token from socket handshake query
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token (use your existing JWT verification logic)
      // This should be done with your auth middleware
      // For now, we'll assume token is valid if present
      socket.user = {
        // Decode token and get user info
        // This depends on your JWT setup
      };

      next();
    } catch (error) {
      logger.error('❌ Socket auth error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Handle socket connection
  io.on('connection', (socket) => {
    logger.info(`✅ Agent connected: ${socket.id}`);

    // Handle room joining
    socket.on('join_account', (accountId) => {
      logger.info(`📍 Agent ${socket.id} joined account room: ${accountId}`);
      socket.join(`account:${accountId}`);
    });

    socket.on('join_conversation', (data) => {
      // Handle both old format (accountId, conversationId) and new format (object with conversationId)
      const conversationId = typeof data === 'string' ? data : (data?.conversationId || data);
      const room = `conversation:${conversationId}`;
      logger.info(`📍 Agent ${socket.id} joined conversation room: ${room}`);
      socket.join(room);
    });

    socket.on('leave_conversation', (data) => {
      const conversationId = typeof data === 'string' ? data : (data?.conversationId || data);
      const room = `conversation:${conversationId}`;
      logger.info(`📍 Agent ${socket.id} left conversation room: ${room}`);
      socket.leave(room);
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { conversationId, agentId, agentName } = data;
      const room = `conversation:${conversationId}`;

      socket
        .to(room)
        .emit('agent_typing', {
          conversationId,
          agentId,
          agentName,
          timestamp: new Date()
        });
    });

    socket.on('typing_stop', (data) => {
      const { conversationId, agentId } = data;
      const room = `conversation:${conversationId}`;

      socket
        .to(room)
        .emit('agent_typing_stop', {
          conversationId,
          agentId,
          timestamp: new Date()
        });
    });

    // Handle agent status changes
    socket.on('agent_status_change', (data) => {
      const { agentId, status, conversationId } = data;

      if (conversationId) {
        const room = `conversation:${conversationId}`;
        io.to(room).emit('agent_status_changed', {
          agentId,
          status, // available, busy, away, offline
          timestamp: new Date()
        });
      }
    });

    // Handle conversation opened (agent viewing)
    socket.on('conversation_opened', (data) => {
      const { accountId, conversationId, agentId, agentName } = data;

      socket
        .to(`account:${accountId}:conversation:${conversationId}`)
        .emit('agent_viewing_conversation', {
          conversationId,
          agentId,
          agentName,
          viewingAt: new Date()
        });
    });

    // Handle conversation closed (agent closes view)
    socket.on('conversation_closed', (data) => {
      const { accountId, conversationId, agentId } = data;

      socket
        .to(`account:${accountId}:conversation:${conversationId}`)
        .emit('agent_closed_conversation', {
          conversationId,
          agentId,
          closedAt: new Date()
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`❌ Agent disconnected: ${socket.id}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`❌ Socket error for ${socket.id}:`, error);
    });
  });

  logger.info('✅ Socket.IO handlers setup complete');
};

/**
 * Emit event to specific conversation
 */
export const emitToConversation = (accountId, conversationId, eventName, data) => {
  try {
    const io = getSocketIO();
    const room = `conversation:${conversationId}`;

    io.to(room).emit(eventName, {
      ...data,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('❌ Error emitting to conversation:', error);
  }
};

/**
 * Emit event to all agents in account
 */
export const emitToAccount = (accountId, eventName, data) => {
  try {
    const io = getSocketIO();
    const room = `account:${accountId}`;

    io.to(room).emit(eventName, {
      ...data,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('❌ Error emitting to account:', error);
  }
};

/**
 * Emit event to specific agent
 */
export const emitToAgent = (agentId, eventName, data) => {
  try {
    const io = getSocketIO();
    const room = `agent:${agentId}`;

    io.to(room).emit(eventName, {
      ...data,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('❌ Error emitting to agent:', error);
  }
};

export default {
  setupSocketIOHandlers,
  emitToConversation,
  emitToAccount,
  emitToAgent
};
