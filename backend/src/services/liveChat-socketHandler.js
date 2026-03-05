import { getSocketIO } from './liveChat-socketService.js';

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
      console.error('❌ Socket auth error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Handle socket connection
  io.on('connection', (socket) => {
    console.log(`✅ Agent connected: ${socket.id}`);

    // Handle room joining
    socket.on('join_account', (accountId) => {
      console.log(`📍 Agent ${socket.id} joined account room: ${accountId}`);
      socket.join(`account:${accountId}`);
    });

    socket.on('join_conversation', (accountId, conversationId) => {
      console.log(`📍 Agent ${socket.id} joined conversation: ${conversationId}`);
      socket.join(`account:${accountId}`);
      socket.join(`account:${accountId}:conversation:${conversationId}`);
    });

    socket.on('leave_conversation', (accountId, conversationId) => {
      console.log(`📍 Agent ${socket.id} left conversation: ${conversationId}`);
      socket.leave(`account:${accountId}:conversation:${conversationId}`);
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { accountId, conversationId, agentId, agentName } = data;

      socket
        .to(`account:${accountId}:conversation:${conversationId}`)
        .emit('agent_typing', {
          conversationId,
          agentId,
          agentName,
          timestamp: new Date()
        });
    });

    socket.on('typing_stop', (data) => {
      const { accountId, conversationId, agentId } = data;

      socket
        .to(`account:${accountId}:conversation:${conversationId}`)
        .emit('agent_typing_stop', {
          conversationId,
          agentId,
          timestamp: new Date()
        });
    });

    // Handle agent status changes
    socket.on('agent_status_change', (data) => {
      const { accountId, agentId, status } = data;

      io.to(`account:${accountId}`).emit('agent_status_changed', {
        agentId,
        status, // available, busy, away, offline
        timestamp: new Date()
      });
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
      console.log(`❌ Agent disconnected: ${socket.id}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });
  });

  console.log('✅ Socket.IO handlers setup complete');
};

/**
 * Emit event to specific conversation
 */
export const emitToConversation = (accountId, conversationId, eventName, data) => {
  try {
    const io = getSocketIO();
    const room = `account:${accountId}:conversation:${conversationId}`;

    io.to(room).emit(eventName, {
      ...data,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Error emitting to conversation:', error);
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
    console.error('❌ Error emitting to account:', error);
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
    console.error('❌ Error emitting to agent:', error);
  }
};

export default {
  setupSocketIOHandlers,
  emitToConversation,
  emitToAccount,
  emitToAgent
};
