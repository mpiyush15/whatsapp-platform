import express from 'express';
import messageService from '../services/messageService.js';
import { requireJWT } from '../middlewares/jwtAuth.js';
import { emitToConversation, emitToAccount } from '../services/liveChat-socketHandler.js';
import { broadcastSentMessage, broadcastConversationUpdate, broadcastNewMessage } from '../services/socketService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

/**
 * Transform message from DB format to frontend format
 * Flattens nested content structure and normalizes field names
 */
const transformMessage = (msg) => {
  if (!msg) return null;
  
  // Extract text content from various formats
  let textContent = '';
  if (typeof msg.content === 'string') {
    textContent = msg.content;
  } else if (typeof msg.content === 'object' && msg.content?.text) {
    textContent = msg.content.text;
  } else if (typeof msg.content === 'object') {
    // For other object types, try to extract meaningful content
    textContent = msg.content?.caption || msg.content?.templateName || JSON.stringify(msg.content);
  }
  
  // Filter out placeholder/error messages and show descriptive text
  if (textContent.includes('{"type"') || textContent.includes('"unknown"')) {
    textContent = '[📨 System Message - Webhook Test Data]'; 
  }
  
  return {
    _id: msg._id?.toString(),
    conversationId: msg.conversationId?.toString(),
    accountId: msg.accountId,
    phoneNumberId: msg.phoneNumberId,
    
    // Content handling - flatten structure
    content: textContent || '',
    messageType: msg.messageType || 'text',
    
    // Media fields
    mediaUrl: msg.content?.mediaUrl,
    mediaType: msg.content?.mediaType,
    fileName: msg.content?.filename,
    fileSize: msg.content?.fileSize,
    mimeType: msg.content?.mimeType,
    
    // Direction and sender type
    direction: msg.direction,
    senderType: msg.direction === 'inbound' ? 'customer' : 'agent',
    
    // Status (map 'queued' to 'sent' for frontend compatibility)
    status: msg.status === 'queued' ? 'sent' : msg.status,
    
    // Recipient info
    recipientPhone: msg.recipientPhone,
    recipientName: msg.recipientName,
    
    // Metadata
    isInternalNote: msg.isInternalNote || false,
    createdAt: msg.createdAt?.toISOString(),
    updatedAt: msg.updatedAt?.toISOString(),
    
    // Additional fields
    waMessageId: msg.waMessageId,
    readBy: msg.readBy || [],
    replyTo: msg.replyTo,
    source: msg.source
  };
};

// ✅ All routes require JWT authentication
router.use(requireJWT);

// Setup multer for file uploads
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads/messages');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
    // Videos
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/flac', 'audio/aac',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

/**
 * POST /api/messages
 * Send message to customer
 */
router.post('/', async (req, res) => {
  try {
    const { conversationId, content, messageType = 'text' } = req.body;
    const accountId = req.account.accountId;
    const agentId = req.user._id;

    // Validate required fields
    if (!conversationId || !content) {
      return res.status(400).json({
        success: false,
        message: 'conversationId and content are required',
        error: 'MISSING_FIELDS',
        required: ['conversationId', 'content']
      });
    }

    // Send message (phoneNumberId will be fetched from conversation)
    const message = await messageService.sendMessage(
      conversationId,
      content,
      messageType,
      accountId,
      null, // phoneNumberId will be resolved from conversation
      agentId
    );

    // ✅ Broadcast conversation update via socket so chat updates in real-time
    const io = req.app.locals.io;
    if (io) {
      try {
        // Get updated conversation to broadcast
        const { Conversation } = await import('../models/Conversation.js');
        const updatedConv = await Conversation.findById(conversationId)
          .select('_id userName userPhone status unreadCount lastMessageAt lastMessagePreview lastMessageType messageCount createdAt updatedAt')
          .lean();
        
        if (updatedConv) {
          // 1. Broadcast message to conversation room so it appears immediately in chat window
          broadcastNewMessage(io, conversationId, message);
          
          // 2. Broadcast updated conversation to user room so chat list updates
          broadcastConversationUpdate(io, accountId, updatedConv);
        }
      } catch (broadcastError) {
        console.warn('⚠️ Socket broadcast error:', broadcastError.message);
      }
    }

    // ✅ Return successful response
    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: transformMessage(message)
    });
  } catch (error) {
    logger.error('❌ Error sending message:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    if (error.message === 'Conversation not found') {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        error: 'NOT_FOUND'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/messages/:messageId
 * Get single message
 */
router.get('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const accountId = req.account.accountId;

    const { Message } = await import('../models/Message.js');
    const message = await Message.findOne({
      _id: messageId,
      accountId
    })
      .populate('readBy.agentId', 'name email')
      .populate('replyTo', 'content.text messageType')
      .lean();

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
        error: 'NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    logger.error('❌ Error getting message:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get message',
      error: error.message
    });
  }
});

/**
 * GET /api/messages
 * Get messages for conversation
 */
router.get('/', async (req, res) => {
  try {
    const { conversationId, limit = 50, offset = 0 } = req.query;
    const accountId = req.account.accountId;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'conversationId is required',
        error: 'MISSING_CONVERSATION_ID'
      });
    }

    // Get messages
    const result = await messageService.getMessages(
      conversationId,
      accountId,
      Math.min(parseInt(limit) || 50, 100),
      parseInt(offset) || 0
    );

    // Transform messages to match frontend interface
    const transformedMessages = result.messages.map(msg => transformMessage(msg));

    return res.status(200).json({
      success: true,
      data: transformedMessages,
      pagination: {
        total: result.total,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    logger.error('❌ Error getting messages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: error.message
    });
  }
});

/**
 * PATCH /api/messages/:messageId/status
 * Update message status (delivered, read, failed)
 */
router.patch('/:messageId/status', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status, errorCode, errorMessage } = req.body;
    const accountId = req.account.accountId;

    // Validate status
    const validStatuses = ['queued', 'sent', 'delivered', 'read', 'failed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        error: 'INVALID_STATUS'
      });
    }

    // Update status
    const message = await messageService.updateMessageStatus(
      messageId,
      accountId,
      status,
      { errorCode, errorMessage }
    );

    // Emit real-time event based on status
    let eventName = 'message_status_updated';
    if (status === 'delivered') {
      eventName = 'message_delivered';
    } else if (status === 'read') {
      eventName = 'message_read';
    }

    // Emit to conversation room so agents see updates
    if (message.conversationId) {
      emitToConversation(accountId, message.conversationId, eventName, {
        messageId,
        conversationId: message.conversationId,
        status,
        timestamp: new Date()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Message status updated',
      data: message
    });
  } catch (error) {
    logger.error('❌ Error updating message status:', error);
    if (error.message === 'Message not found') {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
        error: 'NOT_FOUND'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to update message status',
      error: error.message
    });
  }
});

/**
 * POST /api/messages/:messageId/mark-read
 * Mark message as read by agent
 */
router.post('/:messageId/mark-read', async (req, res) => {
  try {
    const { messageId } = req.params;
    const accountId = req.account.accountId;
    const agentId = req.user._id;

    // Mark as read
    const message = await messageService.markMessageAsRead(
      messageId,
      accountId,
      agentId
    );

    // Emit real-time event
    if (message.conversationId) {
      emitToConversation(accountId, message.conversationId, 'message_read_by_agent', {
        messageId,
        conversationId: message.conversationId,
        readBy: agentId,
        timestamp: message.updatedAt
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Message marked as read',
      data: message
    });
  } catch (error) {
    logger.error('❌ Error marking message as read:', error);
    if (error.message === 'Message not found') {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
        error: 'NOT_FOUND'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to mark as read',
      error: error.message
    });
  }
});

/**
 * POST /api/messages/:messageId/reaction
 * Add emoji reaction to message
 */
router.post('/:messageId/reaction', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const accountId = req.account.accountId;
    const agentId = req.user._id;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'emoji is required',
        error: 'MISSING_EMOJI'
      });
    }

    // Add reaction
    const message = await messageService.addReaction(
      messageId,
      accountId,
      emoji,
      agentId
    );

    // Emit real-time event
    if (message.conversationId) {
      emitToConversation(accountId, message.conversationId, 'message_reaction', {
        messageId,
        conversationId: message.conversationId,
        emoji,
        addedBy: agentId,
        timestamp: new Date()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Reaction added',
      data: message
    });
  } catch (error) {
    logger.error('❌ Error adding reaction:', error);
    if (error.message === 'Message not found') {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
        error: 'NOT_FOUND'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to add reaction',
      error: error.message
    });
  }
});

/**
 * DELETE /api/messages/:messageId/reaction/:emoji
 * Remove reaction from message
 */
router.delete('/:messageId/reaction/:emoji', async (req, res) => {
  try {
    const { messageId, emoji } = req.params;
    const accountId = req.account.accountId;
    const agentId = req.user._id;

    // Remove reaction
    const message = await messageService.removeReaction(
      messageId,
      accountId,
      emoji,
      agentId
    );

    return res.status(200).json({
      success: true,
      message: 'Reaction removed',
      data: message
    });
  } catch (error) {
    logger.error('❌ Error removing reaction:', error);
    if (error.message === 'Message not found') {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
        error: 'NOT_FOUND'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to remove reaction',
      error: error.message
    });
  }
});

/**
 * POST /api/messages/:messageId/forward
 * Forward message to another conversation
 */
router.post('/:messageId/forward', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { targetConversationId } = req.body;
    const accountId = req.account.accountId;
    const forwardingAgentId = req.user._id;

    if (!targetConversationId) {
      return res.status(400).json({
        success: false,
        message: 'targetConversationId is required',
        error: 'MISSING_TARGET_CONVERSATION'
      });
    }

    // Forward message
    const message = await messageService.forwardMessage(
      messageId,
      accountId,
      targetConversationId,
      forwardingAgentId
    );

    return res.status(201).json({
      success: true,
      message: 'Message forwarded',
      data: message
    });
  } catch (error) {
    logger.error('❌ Error forwarding message:', error);
    if (error.message === 'Source message not found') {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
        error: 'NOT_FOUND'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to forward message',
      error: error.message
    });
  }
});

/**
 * GET /api/messages/search
 * Search messages by content
 */
router.get('/search', async (req, res) => {
  try {
    const { conversationId, q, limit = 50 } = req.query;
    const accountId = req.account.accountId;

    if (!conversationId || !q) {
      return res.status(400).json({
        success: false,
        message: 'conversationId and q (query) are required',
        error: 'MISSING_PARAMS'
      });
    }

    // Import and search
    const messages = await messageService.searchMessages(
      conversationId,
      accountId,
      q,
      Math.min(parseInt(limit) || 50, 100)
    );

    return res.status(200).json({
      success: true,
      data: messages,
      query: q
    });
  } catch (error) {
    logger.error('❌ Error searching messages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search messages',
      error: error.message
    });
  }
});

/**
 * POST /api/messages/upload
 * Upload file for message attachment
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { conversationId, messageType = 'document' } = req.body;
    const accountId = req.account.accountId;

    if (!conversationId || !req.file) {
      return res.status(400).json({
        success: false,
        message: 'conversationId and file are required',
        error: 'MISSING_FIELDS',
        required: ['conversationId', 'file']
      });
    }

    // Construct the media URL
    const relativePath = path.relative(
      path.join(__dirname, '../../'),
      req.file.path
    ).replace(/\\/g, '/');
    
    const mediaUrl = `${process.env.BACKEND_URL || 'http://localhost:5050'}/${relativePath}`;

    // File metadata
    const fileMetadata = {
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      mediaUrl,
      messageType: messageType || 'document'
    };

    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      mediaUrl,
      ...fileMetadata
    });
  } catch (error) {
    logger.error('❌ Error uploading file:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) logger.error('Failed to delete file:', err);
      });
    }

    if (error.message.includes('File type not allowed')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'INVALID_FILE_TYPE'
      });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File is too large (max 100MB)',
        error: 'FILE_TOO_LARGE'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
});

export default router;
