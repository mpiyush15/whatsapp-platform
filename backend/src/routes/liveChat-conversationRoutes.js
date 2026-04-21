import express from 'express';
import conversationService from '../services/conversationService.js';
import internalNoteService from '../services/internalNoteService.js';
import tagService from '../services/tagService.js';
import { requireJWT } from '../middlewares/jwtAuth.js';
import { emitToConversation, emitToAccount } from '../services/liveChat-socketHandler.js';
import Conversation from '../models/Conversation.js';
import Contact from '../models/Contact.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
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

    logger.info('📡 Fetching conversations:', { accountId, workspaceId, phoneNumberId });

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

    logger.info('✅ Conversations fetched:', result.conversations.length);
    if (result.conversations.length > 0) {
      logger.info('📋 Sample conversation:', {
        id: result.conversations[0]._id,
        conversationId: result.conversations[0].conversationId,
        userName: result.conversations[0].userName,
        userPhone: result.conversations[0].userPhone
      });
    }

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
    logger.error('❌ Error listing conversations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list conversations',
      error: error.message
    });
  }
});

/**
 * GET /api/conversations/debug/count
 * Debug endpoint: Check if conversations exist for this account
 */
router.get('/debug/count', async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { Conversation } = await import('../models/Conversation.js');
    
    const total = await Conversation.countDocuments({ accountId });
    const byStatus = await Conversation.aggregate([
      { $match: { accountId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Get first few conversations
    const sample = await Conversation.find({ accountId }).limit(3).lean();
    
    return res.status(200).json({
      success: true,
      total,
      byStatus,
      sampleConversations: sample.map(c => ({
        _id: c._id,
        userName: c.userName,
        userPhone: c.userPhone,
        status: c.status,
        workspaceId: c.workspaceId,
        phoneNumberId: c.phoneNumberId
      }))
    });
  } catch (error) {
    logger.error('❌ Error in debug count:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/conversations/quick-replies
 * Get quick reply templates for agents (separate from Meta templates)
 */
router.get('/quick-replies', async (req, res) => {
  try {
    const accountId = req.account?.accountId;
    
    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'Account ID is required'
      });
    }
    
    logger.info('📝 Fetching quick replies for accountId:', accountId);
    
    // Import QuickReply model (separate from Meta templates)
    const QuickReply = await import('../models/QuickReply.js');
    
    // Fetch quick replies for this account - simpler query
    const quickReplies = await QuickReply.default.find({
      accountId: accountId,
      isActive: true
    })
      .select('_id name content category messageType mediaUrl fileName')
      .sort({ createdAt: -1 })
      .lean();
    
    logger.info('✅ Quick replies found:', quickReplies.length);
    
    return res.status(200).json({
      success: true,
      message: 'Quick replies fetched successfully',
      data: quickReplies || []
    });
  } catch (error) {
    logger.error('❌ Error fetching quick replies:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch quick replies',
      error: error.message
    });
  }
});

/**
 * POST /api/conversations/quick-replies
 * Create a new quick reply
 */
router.post('/quick-replies', async (req, res) => {
  try {
    const accountId = req.account?.accountId;
    
    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'Account ID is required'
      });
    }
    
    const { name, content, category, messageType, mediaUrl, fileName, mimeType } = req.body;

    // Validate required fields
    if (!name || !content) {
      return res.status(400).json({
        success: false,
        message: 'Name and content are required'
      });
    }

    logger.info('➕ Creating quick reply:', { accountId, name });

    // Import QuickReply model
    const QuickReply = await import('../models/QuickReply.js');

    // Create new quick reply - simplified
    const quickReply = new QuickReply.default({
      accountId,
      name: name.trim(),
      content: content.trim(),
      category: category || 'General',
      messageType: messageType || 'text',
      mediaUrl: mediaUrl || null,
      fileName: fileName || null,
      mimeType: mimeType || null,
      isActive: true
    });

    await quickReply.save();

    logger.info('✅ Quick reply created:', quickReply._id);

    return res.status(201).json({
      success: true,
      message: 'Quick reply created successfully',
      data: quickReply
    });
  } catch (error) {
    logger.error('❌ Error creating quick reply:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to create quick reply',
      error: error.message
    });
  }
});

/**
 * DELETE /api/conversations/quick-replies/:replyId
 * Delete a quick reply
 */
router.delete('/quick-replies/:replyId', async (req, res) => {
  try {
    const { replyId } = req.params;
    const accountId = req.account.accountId;

    // Import QuickReply model
    const QuickReply = await import('../models/QuickReply.js');

    // Delete quick reply
    const result = await QuickReply.default.findOneAndDelete({
      _id: replyId,
      accountId
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Quick reply not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Quick reply deleted successfully'
    });
  } catch (error) {
    logger.error('❌ Error deleting quick reply:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete quick reply',
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
    logger.error('❌ Error getting conversation:', error);
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
 * GET /api/conversations/:conversationId/messages
 * Get messages for a specific conversation
 */
router.get('/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const accountId = req.account.accountId;

    // Import message service
    const messageService = (await import('../services/messageService.js')).default;

    // Get messages for this conversation
    const result = await messageService.getMessages(
      conversationId,
      accountId,
      Math.min(parseInt(limit) || 50, 100),
      parseInt(offset) || 0
    );

    logger.info(`📨 Fetched ${result.messages.length} messages for conversation ${conversationId}`);

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
    logger.error('❌ Error getting messages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: error.message
    });
  }
});

/**
 * PATCH /api/conversations/:conversationId
 * Update conversation (priority, notes, status, tags, userName)
 */
router.patch('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const accountId = req.account.accountId;
    const { priority, notes, customAttributes, tags, status, userName } = req.body;

    // Build update object
    const updates = {};
    if (priority) updates.priority = priority;
    if (notes !== undefined) updates.notes = notes;
    if (customAttributes) updates.customAttributes = customAttributes;
    if (tags && Array.isArray(tags)) updates.tags = tags;
    if (status && ['open', 'closed', 'pending'].includes(status)) updates.status = status;
    if (userName && typeof userName === 'string') updates.userName = userName.trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
        error: 'EMPTY_UPDATE'
      });
    }

    // Update conversation
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

    // Emit real-time update
    emitToConversation(accountId, conversationId, 'conversation_updated', {
      conversationId,
      updates: {
        priority: updates.priority,
        tags: updates.tags,
        status: updates.status,
        userName: updates.userName,
        customAttributes: updates.customAttributes
      }
    });

    return res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    logger.error('❌ Error updating conversation:', error);
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
    logger.error('❌ Error assigning conversation:', error);
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
    logger.error('❌ Error closing conversation:', error);
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
    logger.error('❌ Error reopening conversation:', error);
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
    logger.error('❌ Error adding tag:', error);
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
    logger.error('❌ Error removing tag:', error);
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
    logger.error('❌ Error marking conversation as read:', error);
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
    logger.error('❌ Error getting timeline:', error);
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
    logger.error('❌ Error creating note:', error);
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
    logger.error('❌ Error getting notes:', error);
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
    logger.error('❌ Error updating note:', error);
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
    logger.error('❌ Error deleting note:', error);
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

/**
 * POST /api/live-chat/sync-contact
 * Sync conversation contact details to Contact model
 * Creates or updates contact (handles duplicates via unique index)
 * No duplicate contacts - unique on (accountId, whatsappNumber)
 */
router.post('/sync-contact', async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { whatsappNumber, name, tags = [], notes } = req.body;

    if (!whatsappNumber) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp number is required',
        error: 'MISSING_PHONE'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Contact name is required',
        error: 'MISSING_NAME'
      });
    }

    // 🔍 Check if contact exists for this account + phone
    let contact = await Contact.findOne({
      accountId,
      whatsappNumber
    });

    if (contact) {
      // Update existing contact (no duplicate)
      logger.info(`📝 Updating existing contact: ${whatsappNumber}`);
      contact = await Contact.findByIdAndUpdate(
        contact._id,
        {
          $set: {
            name,
            notes: notes || contact.notes,
            tags: tags.length > 0 ? tags : contact.tags,
            lastContactedAt: new Date(),
            messageCount: (contact.messageCount || 0) + 1
          }
        },
        { new: true }
      );
    } else {
      // Create new contact (handles duplicate prevention via unique index)
      logger.info(`✨ Creating new contact: ${whatsappNumber}`);
      try {
        contact = await Contact.create({
          accountId,
          name,
          phone: `+${whatsappNumber}`,
          whatsappNumber,
          type: 'customer',
          isOptedIn: true,
          optInDate: new Date(),
          firstContactAt: new Date(),
          tags: tags || [],
          notes: notes || '',
          messageCount: 1,
          conversationCount: 1
        });
      } catch (err) {
        if (err.code === 11000) {
          // Duplicate key error - try to fetch and update
          logger.info(`⚠️ Duplicate contact detected, fetching existing: ${whatsappNumber}`);
          contact = await Contact.findOne({
            accountId,
            whatsappNumber
          });

          if (contact) {
            // Update the existing contact
            contact = await Contact.findByIdAndUpdate(
              contact._id,
              {
                $set: {
                  name,
                  notes: notes || contact.notes,
                  tags: tags.length > 0 ? tags : contact.tags,
                  lastContactedAt: new Date(),
                  messageCount: (contact.messageCount || 0) + 1
                }
              },
              { new: true }
            );
          }
        } else {
          throw err;
        }
      }
    }

    logger.info(`✅ Contact synced successfully: ${contact._id}`);

    return res.status(200).json({
      success: true,
      message: 'Contact synced successfully',
      data: {
        contact,
        action: contact.createdAt ? 'updated' : 'created'
      }
    });
  } catch (error) {
    logger.error('❌ Error syncing contact:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to sync contact',
      error: error.message
    });
  }
});

/**
 * POST /api/live-chat/sync-all-contacts
 * Bulk sync all conversations to Contact model
 * Creates missing contacts from all conversations - prevents duplicates via unique index
 */
router.post('/sync-all-contacts', async (req, res) => {
  try {
    const accountId = req.account.accountId;

    // Fetch all conversations for this account
    const conversations = await Conversation.find({ accountId }).lean();

    if (conversations.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No conversations to sync',
        data: {
          synced: 0,
          skipped: 0,
          failed: 0
        }
      });
    }

    let synced = 0;
    let skipped = 0;
    let failed = 0;

    // Sync each conversation to contact
    for (const conv of conversations) {
      try {
        if (!conv.userPhone || !conv.userName) {
          logger.info(`⏭️ Skipping conversation ${conv._id} - missing phone/name`);
          skipped++;
          continue;
        }

        // Check if contact exists
        let contact = await Contact.findOne({
          accountId,
          whatsappNumber: conv.userPhone
        });

        if (contact) {
          // Update existing contact
          await Contact.findByIdAndUpdate(contact._id, {
            $set: {
              name: conv.userName,
              tags: conv.tags || contact.tags,
              messageCount: conv.messageCount || 0,
              conversationCount: (contact.conversationCount || 0) + 1,
              lastContactedAt: conv.lastMessageAt || contact.lastContactedAt
            }
          });
          skipped++; // Already existed
        } else {
          // Create new contact
          await Contact.create({
            accountId,
            name: conv.userName,
            phone: `+${conv.userPhone}`,
            whatsappNumber: conv.userPhone,
            type: 'customer',
            isOptedIn: true,
            optInDate: new Date(),
            firstContactAt: conv.createdAt || new Date(),
            tags: conv.tags || [],
            notes: conv.notes || '',
            messageCount: conv.messageCount || 0,
            conversationCount: 1,
            lastContactedAt: conv.lastMessageAt
          });
          synced++;
        }
      } catch (err) {
        if (err.code === 11000) {
          // Duplicate key - fetch and update
          const existing = await Contact.findOne({
            accountId,
            whatsappNumber: conv.userPhone
          });
          if (existing) {
            await Contact.findByIdAndUpdate(existing._id, {
              $set: {
                name: conv.userName,
                tags: conv.tags || existing.tags,
                messageCount: conv.messageCount || 0,
                conversationCount: (existing.conversationCount || 0) + 1,
                lastContactedAt: conv.lastMessageAt || existing.lastContactedAt
              }
            });
            skipped++;
          }
        } else {
          logger.error(`❌ Failed to sync conversation ${conv._id}:`, err);
          failed++;
        }
      }
    }

    logger.info(`✅ Bulk sync completed: ${synced} synced, ${skipped} updated, ${failed} failed`);

    return res.status(200).json({
      success: true,
      message: 'Bulk contact sync completed',
      data: {
        synced,
        skipped,
        failed,
        total: conversations.length
      }
    });
  } catch (error) {
    logger.error('❌ Error in bulk sync:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to bulk sync contacts',
      error: error.message
    });
  }
});

/**
 * POST /api/conversations/:conversationId/send-message
 * Send text message to conversation
 */
router.post('/:conversationId/send-message', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, mediaUrl, mediaType } = req.body;
    const accountId = req.account.accountId;
    const agentId = req.user._id;
    const agentName = req.user.name || 'Agent';

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message text cannot be empty',
        error: 'EMPTY_MESSAGE'
      });
    }

    // Get conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      accountId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        error: 'NOT_FOUND'
      });
    }

    // Import s3Service for media upload
    const { uploadToS3 } = await import('../services/s3Service.js');
    
    // Handle media upload to S3 if mediaUrl is provided
    let finalMediaUrl = mediaUrl;
    if (mediaUrl && mediaUrl.startsWith('data:')) {
      try {
        // Convert dataURL to buffer
        const matches = mediaUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Upload to S3
          const s3Result = await uploadToS3(
            buffer,
            accountId,
            mediaType || 'media',
            mimeType,
            `message-${Date.now()}`
          );
          
          finalMediaUrl = s3Result.s3Url;
          logger.info(`✅ Media uploaded to S3: ${finalMediaUrl}`);
        }
      } catch (err) {
        logger.error('❌ Error uploading media to S3:', err.message);
        // Continue with dataURL if S3 fails
      }
    }

    // Import Message model
    const Message = mongoose.model('Message');

    // Create message
    const message = await Message.create({
      accountId,
      conversationId: conversation.conversationId,
      phoneNumberId: conversation.phoneNumberId,
      recipientPhone: conversation.userPhone,
      recipientName: conversation.userName,
      senderRole: 'agent',
      senderName: agentName,
      messageType: 'text',
      direction: 'outbound',
      content: { text, mediaUrl: finalMediaUrl, mediaType },
      status: 'sent',
      sentAt: new Date(),
      sentByAgentId: agentId
    });

    // Update conversation
    await Conversation.findOneAndUpdate(
      { _id: conversationId },
      {
        lastMessageAt: new Date(),
        lastMessagePreview: text.substring(0, 100),
        lastMessageType: 'text',
        messageCount: conversation.messageCount + 1
      }
    );

    logger.info(`✅ Message sent: ${message._id}`);

    // Emit real-time event to conversation room
    emitToConversation(accountId, conversation.conversationId, 'new_message', {
      _id: message._id,
      conversationId: conversation.conversationId,
      senderRole: 'agent',
      senderName: agentName,
      text,
      mediaUrl: finalMediaUrl,
      mediaType,
      status: 'sent',
      createdAt: message.sentAt
    });

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    logger.error('❌ Error sending message:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

/**
 * GET /api/live-chat/conversations/stats
 * Get conversation and message statistics for a given month/year
 */
router.get('/stats', async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;

    // Convert month/year to date range
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    logger.info('📊 Fetching stats for:', { accountId, month, year, startDate, endDate });

    // Import Message model
    const { default: Message } = await import('../models/Message.js');

    // Count messages by direction
    const messageStats = await Message.aggregate([
      {
        $match: {
          accountId: accountId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$direction',
          count: { $sum: 1 }
        }
      }
    ]);

    // Count total unread conversations
    const unreadStats = await Conversation.countDocuments({
      accountId: accountId,
      unreadCount: { $gt: 0 }
    });

    // Count total conversations
    const totalConversations = await Conversation.countDocuments({
      accountId: accountId
    });

    // Parse message stats
    let messagesSent = 0;
    let messagesReceived = 0;
    
    messageStats.forEach(stat => {
      if (stat._id === 'outbound') {
        messagesSent = stat.count;
      } else if (stat._id === 'inbound') {
        messagesReceived = stat.count;
      }
    });

    const totalMessages = messagesSent + messagesReceived;

    const stats = {
      messagesSent,
      messagesReceived,
      totalMessages,
      unreadCount: unreadStats,
      broadcastedCount: totalConversations,
      period: {
        month: parseInt(month),
        year: parseInt(year),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    };

    logger.info('✅ Stats calculated:', stats);

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('❌ Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation stats',
      error: error.message
    });
  }
});

export default router;
