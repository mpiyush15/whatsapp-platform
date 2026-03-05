import express from 'express';
import messageService from '../services/messageService.js';
import { requireJWT } from '../middlewares/jwtAuth.js';
import { emitToConversation, emitToAccount } from '../services/liveChat-socketHandler.js';

const router = express.Router();

// ✅ All routes require JWT authentication
router.use(requireJWT);

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

    // Emit real-time event
    emitToConversation(accountId, conversationId, 'message_sent', {
      messageId: message._id,
      conversationId,
      content,
      messageType,
      sentBy: agentId,
      timestamp: message.createdAt
    });

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('❌ Error sending message:', error);
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
      error: error.message
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
    console.error('❌ Error getting message:', error);
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

    return res.status(200).json({
      success: true,
      data: result.messages,
      pagination: {
        total: result.total,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    console.error('❌ Error getting messages:', error);
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

    emitToAccount(accountId, eventName, {
      messageId,
      status,
      timestamp: new Date()
    });

    return res.status(200).json({
      success: true,
      message: 'Message status updated',
      data: message
    });
  } catch (error) {
    console.error('❌ Error updating message status:', error);
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
    emitToAccount(accountId, 'message_read_by_agent', {
      messageId,
      readBy: agentId,
      timestamp: message.updatedAt
    });

    return res.status(200).json({
      success: true,
      message: 'Message marked as read',
      data: message
    });
  } catch (error) {
    console.error('❌ Error marking message as read:', error);
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
    emitToAccount(accountId, 'reaction_added', {
      messageId,
      emoji,
      addedBy: agentId,
      timestamp: new Date()
    });

    return res.status(200).json({
      success: true,
      message: 'Reaction added',
      data: message
    });
  } catch (error) {
    console.error('❌ Error adding reaction:', error);
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
    console.error('❌ Error removing reaction:', error);
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
    console.error('❌ Error forwarding message:', error);
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
    console.error('❌ Error searching messages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search messages',
      error: error.message
    });
  }
});

export default router;
