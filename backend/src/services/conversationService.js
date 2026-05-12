import Message from '../models/Message.js';
import InternalNote from '../models/InternalNote.js';
import ActivityTimeline from '../models/ActivityTimeline.js';
import ConversationAssignment from '../models/ConversationAssignment.js';
import Contact from '../models/Contact.js';
import Tag from '../models/Tag.js';
import conversationRepository from '../repositories/conversationRepository.js';
import messageRepository from '../repositories/messageRepository.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * ConversationService
 * Business logic for conversation operations
 * This is the SINGLE SOURCE OF TRUTH for all conversation operations
 */

/**
 * List conversations with filters and pagination
 */
export const listConversations = async (accountId, workspaceId, phoneNumberId, filters = {}) => {
  const {
    limit = 50,
    offset = 0
  } = filters;

  const query = conversationRepository.buildListQuery(accountId, workspaceId, phoneNumberId, filters);

  const conversations = await conversationRepository.findWithFilters(query, limit, offset);
  const total = await conversationRepository.countByQuery(query);

  return {
    conversations,
    total,
    hasMore: offset + limit < total
  };
};

/**
 * Get single conversation with all related data
 */
export const getConversationDetail = async (conversationId, accountId) => {
  const conversation = await conversationRepository.findByIdAndAccount(conversationId, accountId);

  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  // Get last 50 messages
  const messages = await Message.find({
    conversationId: conversation._id,
    accountId
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('readBy.agentId', 'name email')
    .populate('replyTo', 'content.text messageType')
    .lean();

  // Get internal notes
  const notes = await InternalNote.find({
    conversationId: conversation._id,
    accountId
  })
    .sort({ createdAt: -1 })
    .populate('createdByAgentId', 'name email')
    .lean();

  return {
    ...conversation.toObject(),
    messages: messages.reverse(),
    notes
  };
};

/**
 * Assign conversation to agent
 */
export const assignConversation = async (conversationId, agentId, accountId, reason = 'manual') => {
  const conversation = await conversationRepository.assignToAgent(conversationId, accountId, agentId, reason);

  // Create assignment record for tracking
  await ConversationAssignment.create({
    accountId,
    conversationId,
    agentId,
    assignedAt: new Date(),
    status: 'active'
  });

  // Log in activity timeline
  await ActivityTimeline.create({
    accountId,
    conversationId,
    activityType: 'assigned',
    actor: {
      type: 'system',
      name: 'Auto-assign'
    },
    details: new Map([
      ['agentId', agentId.toString()],
      ['reason', reason]
    ])
  });

  return conversation;
};

/**
 * Close conversation
 */
export const closeConversation = async (conversationId, accountId, reason = 'manual', closedByAgentId = null) => {
  const conversation = await conversationRepository.updateStatus(
    conversationId,
    accountId,
    'closed',
    { unreadCount: 0 }
  );

  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  // Update assignment record
  if (conversation.assignedAgentId) {
    await ConversationAssignment.findOneAndUpdate(
      {
        conversationId,
        accountId,
        unassignedAt: null
      },
      {
        unassignedAt: new Date(),
        reason,
        status: 'resolved'
      }
    );
  }

  // Log in activity timeline
  await ActivityTimeline.create({
    accountId,
    conversationId,
    activityType: 'closed',
    actor: {
      type: 'agent',
      id: closedByAgentId
    },
    details: new Map([['reason', reason]])
  });

  return conversation;
};

/**
 * Reopen conversation
 */
export const reopenConversation = async (conversationId, accountId, reopenedByAgentId = null) => {
  const conversation = await conversationRepository.updateStatus(conversationId, accountId, 'open');

  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  // Log in activity timeline
  await ActivityTimeline.create({
    accountId,
    conversationId,
    activityType: 'reopened',
    actor: {
      type: 'agent',
      id: reopenedByAgentId
    }
  });

  return conversation;
};

/**
 * Add tag to conversation
 */
export const addTagToConversation = async (conversationId, tagName, accountId) => {
  // Verify tag exists
  const tag = await Tag.findOne({
    accountId,
    name: tagName
  });

  if (!tag) {
    throw new Error(`Tag '${tagName}' not found`);
  }

  // Add tag to conversation
  const conversation = await conversationRepository.addTag(conversationId, accountId, tagName);

  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  // Increment tag usage count
  await Tag.updateOne(
    { _id: tag._id },
    { $inc: { usageCount: 1 } }
  );

  // Log in activity timeline
  await ActivityTimeline.create({
    accountId,
    conversationId,
    activityType: 'tagged',
    details: new Map([['tagName', tagName]])
  });

  return conversation;
};

/**
 * Remove tag from conversation
 */
export const removeTagFromConversation = async (conversationId, tagName, accountId) => {
  const conversation = await conversationRepository.removeTag(conversationId, accountId, tagName);

  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  // Decrement tag usage count
  const tag = await Tag.findOne({ accountId, name: tagName });
  if (tag) {
    await Tag.updateOne(
      { _id: tag._id },
      { $inc: { usageCount: -1 } }
    );
  }

  // Log in activity timeline
  await ActivityTimeline.create({
    accountId,
    conversationId,
    activityType: 'tag_removed',
    details: new Map([['tagName', tagName]])
  });

  return conversation;
};

/**
 * Add internal note to conversation
 */
export const addInternalNote = async (conversationId, content, createdByAgentId, accountId, isResolution = false) => {
  const note = await InternalNote.create({
    accountId,
    conversationId,
    createdByAgentId,
    content,
    isResolution
  });

  // Log in activity timeline
  await ActivityTimeline.create({
    accountId,
    conversationId,
    activityType: 'internal_note_added',
    actor: {
      type: 'agent',
      id: createdByAgentId
    },
    details: new Map([
      ['noteId', note._id.toString()],
      ['isResolution', isResolution.toString()]
    ])
  });

  return note;
};

/**
 * Get conversation activity timeline
 */
export const getConversationTimeline = async (conversationId, accountId, limit = 100) => {
  const timeline = await ActivityTimeline.find({
    conversationId,
    accountId
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('actor.id', 'name email')
    .lean();

  return timeline.reverse();
};

/**
 * Update conversation metrics (for reporting)
 */
export const updateConversationMetrics = async (conversationId, accountId) => {
  // Count messages
  const messageCount = await Message.countDocuments({
    conversationId,
    accountId
  });

  // Calculate response time and resolution time if closed
  const messages = await Message.find({
    conversationId,
    accountId
  })
    .sort({ createdAt: 1 })
    .lean();

  const conversation = await conversationRepository.findLeanByIdAndAccount(conversationId, accountId);

  let responseTime = null;
  let resolutionTime = null;

  if (messages.length > 0) {
    // First outbound message - response time
    const firstOutbound = messages.find(m => m.direction === 'outbound');
    if (firstOutbound && messages[0]) {
      responseTime = firstOutbound.createdAt - messages[0].createdAt;
    }

    // If closed - resolution time
    if (conversation && conversation.status === 'closed') {
      const lastMessage = messages[messages.length - 1];
      resolutionTime = conversation.updatedAt - messages[0].createdAt;
    }
  }

  // Update conversation
  await conversationRepository.updateMetrics(conversationId, accountId, {
    messageCount,
    responseTime,
    resolutionTime
  });
};

/**
 * Mark conversation as read by agent
 */
export const markConversationAsRead = async (conversationId, agentId, accountId) => {
  const conversation = await conversationRepository.markAsRead(conversationId, accountId, agentId);

  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  const resolvedConversationId = conversation.conversationId || conversationId;

  // Mark all messages as read by this agent
  await messageRepository.markReadByAgent(resolvedConversationId, accountId, agentId);

  return conversation;
};

export default {
  listConversations,
  getConversationDetail,
  assignConversation,
  closeConversation,
  reopenConversation,
  addTagToConversation,
  removeTagFromConversation,
  addInternalNote,
  getConversationTimeline,
  updateConversationMetrics,
  markConversationAsRead
};
