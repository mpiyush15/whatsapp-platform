/**
 * PHASE 4 - SOCKET.IO REAL-TIME UPDATES
 * File: backend/src/socket/socketHandler.js
 * Purpose: Handle real-time message delivery, agent activity, notifications
 * Date: April 25, 2026
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Project from '../models/Project.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Initialize Socket.io server
 * @param {http.Server} httpServer - Express HTTP server
 * @returns {Server} Socket.io server instance
 */
export function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Middleware: Authenticate socket connections
  io.use(authenticateSocket);

  // Handle connections
  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}, accountId: ${socket.accountId}`);

    // Subscribe to account-level events
    socket.join(`account:${socket.accountId}`);

    // Subscribe to project-level events
    if (socket.projectId) {
      socket.join(`project:${socket.projectId}`);
    }

    // Event: User joins project (real-time updates for that project)
    socket.on('join-project', async (projectId) => {
      try {
        // Verify user owns this project
        const project = await Project.findOne({
          projectId,
          accountId: socket.accountId
        });

        if (!project) {
          socket.emit('error', { message: 'Project not found' });
          return;
        }

        socket.projectId = projectId;
        socket.join(`project:${projectId}`);
        console.log(`[Socket] ${socket.id} joined project:${projectId}`);

        // Notify others in project that user is online
        io.to(`project:${projectId}`).emit('user-online', {
          userId: socket.userId,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('[Socket] Error joining project:', error);
        socket.emit('error', { message: 'Failed to join project' });
      }
    });

    // Event: New message received (broadcast to project)
    socket.on('new-message', async (data) => {
      try {
        const { projectId, conversationId, message } = data;

        // Verify project access
        const project = await Project.findOne({
          projectId,
          accountId: socket.accountId
        });

        if (!project) {
          socket.emit('error', { message: 'Project access denied' });
          return;
        }

        // Verify conversation belongs to project
        const conversation = await Conversation.findOne({
          conversationId,
          projectId,
          accountId: socket.accountId
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        // Broadcast new message to all users in project
        io.to(`project:${projectId}`).emit('message-received', {
          conversationId,
          message,
          timestamp: new Date(),
          sender: socket.userId
        });

        console.log(`[Socket] Message in project:${projectId} conversation:${conversationId}`);
      } catch (error) {
        console.error('[Socket] Error on new-message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Event: Conversation status change (typing, read, etc.)
    socket.on('typing-indicator', (data) => {
      try {
        const { projectId, conversationId, isTyping } = data;

        // Broadcast to project that someone is typing
        io.to(`project:${projectId}`).emit('user-typing', {
          conversationId,
          userId: socket.userId,
          isTyping,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('[Socket] Typing indicator error:', error);
      }
    });

    // Event: Mark conversation as read
    socket.on('mark-read', async (data) => {
      try {
        const { projectId, conversationId } = data;

        // Update conversation in database
        await Conversation.findOneAndUpdate(
          { conversationId, projectId, accountId: socket.accountId },
          { lastReadAt: new Date() }
        );

        // Broadcast to project
        io.to(`project:${projectId}`).emit('conversation-read', {
          conversationId,
          userId: socket.userId,
          timestamp: new Date()
        });

        console.log(`[Socket] Conversation ${conversationId} marked as read`);
      } catch (error) {
        console.error('[Socket] Mark read error:', error);
      }
    });

    // Event: Agent activity (assigned, resolved, etc.)
    socket.on('agent-activity', (data) => {
      try {
        const { projectId, activityType, conversationId } = data;

        // Broadcast agent activity
        io.to(`project:${projectId}`).emit('agent-activity-update', {
          agentId: socket.userId,
          conversationId,
          activityType, // 'assigned', 'resolved', 'on-hold', 'transferred'
          timestamp: new Date()
        });

        console.log(`[Socket] Agent activity: ${activityType} in ${projectId}`);
      } catch (error) {
        console.error('[Socket] Agent activity error:', error);
      }
    });

    // Event: Disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);

      // Notify project that user is offline
      if (socket.projectId) {
        io.to(`project:${socket.projectId}`).emit('user-offline', {
          userId: socket.userId,
          timestamp: new Date()
        });
      }
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`[Socket] Error from ${socket.id}:`, error);
    });
  });

  return io;
}

/**
 * Middleware: Authenticate socket connections
 * Verifies JWT token from query parameters or headers
 */
function authenticateSocket(socket, next) {
  try {
    // Get token from query or auth header
    const token = socket.handshake.auth.token || 
                  socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user info to socket
    socket.userId = decoded.userId;
    socket.accountId = decoded.accountId;
    socket.email = decoded.email;

    next();
  } catch (error) {
    console.error('[Socket] Authentication error:', error.message);
    next(new Error('Authentication failed'));
  }
}

/**
 * Broadcast message to entire project
 * @param {Server} io - Socket.io server
 * @param {string} projectId - Project ID
 * @param {string} eventName - Event name to emit
 * @param {object} data - Data to send
 */
export function broadcastToProject(io, projectId, eventName, data) {
  io.to(`project:${projectId}`).emit(eventName, {
    ...data,
    timestamp: new Date()
  });
}

/**
 * Broadcast message to entire account
 * @param {Server} io - Socket.io server
 * @param {string} accountId - Account ID
 * @param {string} eventName - Event name to emit
 * @param {object} data - Data to send
 */
export function broadcastToAccount(io, accountId, eventName, data) {
  io.to(`account:${accountId}`).emit(eventName, {
    ...data,
    timestamp: new Date()
  });
}

/**
 * Send notification to specific user
 * @param {Server} io - Socket.io server
 * @param {string} userId - User ID
 * @param {string} eventName - Event name to emit
 * @param {object} data - Data to send
 */
export function sendNotificationToUser(io, userId, eventName, data) {
  io.to(`user:${userId}`).emit(eventName, {
    ...data,
    timestamp: new Date()
  });
}

export default initializeSocket;
