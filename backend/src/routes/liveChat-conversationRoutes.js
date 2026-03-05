import express from 'express';
import conversationService from '../services/conversationService.js';
import internalNoteService from '../services/internalNoteService.js';
import tagService from '../services/tagService.js';
import { requireJWT } from '../middlewares/jwtAuth.js';
import { emitToConversation, emitToAccount } from '../services/liveChat-socketHandler.js';

const router = express.Router();

// ✅ All routes require JWT authentication
router.use(requireJWT);

/**
 * GET /api/conversations
 * List conversations with filters, search, pagination
 */
router.get('/', async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const workspaceId = req.account.workspaceId;
    const phoneNumberId = req.headers['x-phone-number-id'];

    // Parse query parameters
    const {
      status = null,
      assignedToMe = false,
      tags = null,
      search = '',
      limit = 50,
      offset = 0
    } = req.query;

    // Build filters object
    const filters = {
      status: status === 'null' || status === '' ? null : status,
      assignedToMe: assignedToMe === 'true',
      agentId: assignedToMe === 'true' ? req.user._id : null,
      tags: tags ? tags.split(',') : [],
      search: search || '',
      limit: Math.min(parseInt(limit) || 50, 100),
      offset: parseInt(offset) || 0
    };

    // Get conversations
    const result = await conversationService.listConversations(
      accountId,
      workspaceId,
      phoneNumberId,
      filters
    );

    return res.status(200).json({
      success: true,
      data: result.conversations,
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    console.error('❌ Error listing conversations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list conversations',
      error: error.message
    });
  }
});

/**
 * GET /api/conversations/:conversationId
 * Get single conversation with all details
 */
router.get('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const accountId = req.account.accountId;

    // Get conversation detail
    const conversation = await conversationService.getConversationDetail(
      conversationId,
      accountId
    );

    return res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('❌ Error getting conversation:', error);
    if (error.message === 'Conversation not found') {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        error: 'NOT_FOUND'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to get conversation',
      error: error.message
    });
  }
});

/**
 * PATCH /api/conversations/:conversationId
 * Update conversation (priority, notes, status)
 */
router.patch('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const accountId = req.account.accountId;
    const { priority, notes, customAttributes } = req.body;

    // Build update object
    const updates = {};
    if (priority) updates.priority = priority;
    if (notes !== undefined) updates.notes = notes;
    if (customAttributes) updates.customAttributes = customAttributes;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
        error: 'EMPTY_UPDATE'
      });
    }

    // Update conversation
    const { Conversation } = await import('../models/Conversation.js');
    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, accountId },
      updates,
      { new: true }
    ).populate('assignedAgentId', 'name email');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        error: 'NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('❌ Error updating conversation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update conversation',
      error: error.message
    });
  }
});

/**
 * POST /api/conversations/:conversationId/assign
 * Assign conversation to agent
 */
router.post('/:conversationId/assign', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { agentId } = req.body;
    const accountId = req.account.accountId;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'agentId is required',
        error: 'MISSING_AGENT_ID'
      });
    }

    // Assign conversation
    const conversation = await conversationService.assignConversation(
      conversationId,
      agentId,
      accountId,
      'manual'
    );

    // Emit real-time event
    emitToAccount(accountId, 'conversation_assigned', {
      conversationId,
      agentId,
      conversationData: conversation
    });

    return res.status(200).json({
      success: true,
      message: 'Conversation assigned successfully',
      data: conversation
    });
  } catch (error) {
    console.error('❌ Error assigning conversation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign conversation',
      error: error.message
    });
  }
});

/**
 * POST /api/conversations/:conversationId/close
 * Close conversation
 */
router.post('/:conversationId/close', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { reason } = req.body;
    const accountId = req.account.accountId;
    const closedByAgentId = req.user._id;

    // Close conversation
    const conversation = await conversationService.closeConversation(
      conversationId,
      accountId,
      reason || 'manual',
      closedByAgentId
    );

    // Emit real-time event
    emitToConversation(accountId, conversationId, 'conversation_closed', {
      conversationId,
      closedBy: closedByAgentId,
      reason: reason || 'manual'
    });

    return res.status(200).json({
      success: true,
      message: 'Conversation closed',
      data: conversation
    });
  } catch (error) {
    console.error('❌ Error closing conversation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to close conversation',
      error: error.message
    });
  }
});

/**
 * POST /api/conversations/:conversationId/reopen
 * Reopen closed conversation
 */
router.post('/:conversationId/reopen', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const accountId = req.account.accountId;
    const reopenedByAgentId = req.user._id;

    // Reopen conversation
    const conversation = await conversationService.reopenConversation(
      conversationId,
      accountId,
      reopenedByAgentId
    );

    // Emit real-time event
    emitToConversation(accountId, conversationId, 'conversation_reopened', {
      conversationId,
      reopenedBy: reopenedByAgentId
    });

    return res.status(200).json({
      success: true,
      message: 'Conversation reopened',
      data: conversation
    });
  } catch (error) {
    console.error('❌ Error reopening conversation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reopen conversation',
      error: error.message
    });
  }
});

/**
 * POST /api/conversations/:conversationId/tags
 * Add tag to conversation
 */
router.post('/:conversationId/tags', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { tagName } = req.body;
    const accountId = req.account.accountId;

    if (!tagName) {
      return res.status(400).json({
        success: false,
        message: 'tagName is required',
        error: 'MISSING_TAG_NAME'
      });
    }

    // Add tag
    const conversation = await conversationService.addTagToConversation(
      conversationId,
      tagName,
      accountId
    );

    // Emit real-time event
    emitToConversation(accountId, conversationId, 'tag_added', {
      conversationId,
      tagName,
      addedBy: req.user._id
    });

    return res.status(200).json({
      success: true,
      message: 'Tag added',
      data: conversation
    });
  } catch (error) {
    console.error('❌ Error adding tag:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
        error: 'TAG_NOT_FOUND'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to add tag',
      error: error.message
    });
  }
});

/**
 * DELETE /api/conversations/:conversationId/tags/:tagName
 * Remove tag from conversation
 */
router.delete('/:conversationId/tags/:tagName', async (req, res) => {
  try {
    const { conversationId, tagName } = req.params;
    const accountId = req.account.accountId;

    // Remove tag
    const conversation = await conversationService.removeTagFromConversation(
      conversationId,
      tagName,
      accountId
    );

    // Emit real-time event
    emitToConversation(accountId, conversationId, 'tag_removed', {
      conversationId,
      tagName,
      removedBy: req.user._id
    });

    return res.status(200).json({
      success: true,
      message: 'Tag removed',
      data: conversation
    });
  } catch (error) {
    console.error('❌ Error removing tag:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove tag',
      error: error.message
    });
  }
});

/**
 * POST /api/conversations/:conversationId/mark-read
 * Mark conversation as read by agent
 */
router.post('/:conversationId/mark-read', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const accountId = req.account.accountId;
    const agentId = req.user._id;

    // Mark as read
    const conversation = await conversationService.markConversationAsRead(
      conversationId,
      agentId,
      accountId
    );

    return res.status(200).json({
      success: true,
      message: 'Conversation marked as read',
      data: conversation
    });
  } catch (error) {
    console.error('❌ Error marking conversation as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark as read',
      error: error.message
    });
  }
});

/**
 * GET /api/conversations/:conversationId/timeline
 * Get conversation activity timeline
 */
router.get('/:conversationId/timeline', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const accountId = req.account.accountId;
    const { limit = 100 } = req.query;

    // Get timeline
    const timeline = await conversationService.getConversationTimeline(
      conversationId,
      accountId,
      Math.min(parseInt(limit) || 100, 500)
    );

    return res.status(200).json({
      success: true,
      data: timeline
    });
  } catch (error) {
    console.error('❌ Error getting timeline:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get timeline',
      error: error.message
    });
  }
});

/**
 * POST /api/conversations/:conversationId/notes
 * Create internal note
 */
router.post('/:conversationId/notes', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, isResolution = false, mentions = [] } = req.body;
    const accountId = req.account.accountId;
    const createdByAgentId = req.user._id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Note content cannot be empty',
        error: 'EMPTY_CONTENT'
      });
    }

    // Create note
    const note = await internalNoteService.createInternalNote(
      conversationId,
      accountId,
      content,
      createdByAgentId,
      isResolution,
      mentions
    );

    return res.status(201).json({
      success: true,
      message: 'Internal note created',
      data: note
    });
  } catch (error) {
    console.error('❌ Error creating note:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create note',
      error: error.message
    });
  }
});

/**
 * GET /api/conversations/:conversationId/notes
 * Get conversation internal notes
 */
router.get('/:conversationId/notes', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const accountId = req.account.accountId;
    const { limit = 50 } = req.query;

    // Get notes
    const notes = await internalNoteService.getNotes(
      conversationId,
      accountId,
      Math.min(parseInt(limit) || 50, 100)
    );

    return res.status(200).json({
      success: true,
      data: notes
    });
  } catch (error) {
    console.error('❌ Error getting notes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get notes',
      error: error.message
    });
  }
});

/**
 * PATCH /api/conversations/:conversationId/notes/:noteId
 * Update internal note
 */
router.patch('/:conversationId/notes/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { content } = req.body;
    const accountId = req.account.accountId;
    const updatedByAgentId = req.user._id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Note content cannot be empty',
        error: 'EMPTY_CONTENT'
      });
    }

    // Update note
    const note = await internalNoteService.updateNote(
      noteId,
      accountId,
      content,
      updatedByAgentId
    );

    return res.status(200).json({
      success: true,
      message: 'Internal note updated',
      data: note
    });
  } catch (error) {
    console.error('❌ Error updating note:', error);
    if (error.message === 'Note not found') {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
        error: 'NOT_FOUND'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to update note',
      error: error.message
    });
  }
});

/**
 * DELETE /api/conversations/:conversationId/notes/:noteId
 * Delete internal note
 */
router.delete('/:conversationId/notes/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const accountId = req.account.accountId;
    const deletedByAgentId = req.user._id;

    // Delete note
    const note = await internalNoteService.deleteNote(
      noteId,
      accountId,
      deletedByAgentId
    );

    return res.status(200).json({
      success: true,
      message: 'Internal note deleted',
      data: note
    });
  } catch (error) {
    console.error('❌ Error deleting note:', error);
    if (error.message === 'Note not found') {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
        error: 'NOT_FOUND'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to delete note',
      error: error.message
    });
  }
});

export default router;
