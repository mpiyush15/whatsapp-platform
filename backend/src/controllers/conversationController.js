import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import * as conversationService from '../services/conversationService.js';
import * as messageService from '../services/messageService.js';
import { dispatchWebhookEvent } from '../services/webhookDispatcherService.js';

export const getConversation = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const { conversationId } = req.params;

    const conversation = await conversationService.getConversationDetail(conversationId, accountId, req.projectId);
    return sendSuccess(res, { conversation }, 'Conversation retrieved');
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return sendNotFound(res, 'Conversation not found');
    }
    return handleControllerError(res, error, 'getConversation');
  }
};

export const listConversations = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const workspaceId = req.query?.workspaceId || req.user?.workspaceId || null;
    const phoneNumberId = req.query?.phoneNumberId || null;

    const requestedLimit = parseInt(req.query?.limit || '50', 10);
    const result = await conversationService.listConversations(accountId, workspaceId, phoneNumberId, {
      status: req.query?.status || null,
      search: req.query?.search || '',
      projectId: req.query?.projectId || req.projectId || null,
      limit: Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50,
      offset: parseInt(req.query?.offset || '0', 10)
    });

    return sendSuccess(res, result, 'Conversations retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listConversations');
  }
};

export const assignConversation = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const { conversationId } = req.params;
    const { agentId } = req.body;

    if (!agentId) {
      return sendValidationError(res, 'Agent ID required');
    }

    const conversation = await conversationService.assignConversation(conversationId, agentId, accountId, 'manual', agentId, req.projectId);

    dispatchWebhookEvent({
      accountId,
      projectId: req.projectId || conversation?.projectId || null,
      eventType: 'conversation.assigned',
      payload: {
        conversationId,
        agentId,
      },
      source: 'conversation-controller',
    }).catch((err) => logger.error('conversation.assigned webhook dispatch failed', err));

    return sendSuccess(res, { conversation }, 'Conversation assigned');
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return sendNotFound(res, 'Conversation not found');
    }
    return handleControllerError(res, error, 'assignConversation');
  }
};

export const getConversations = async (req, res) => {
  try {
    return listConversations(req, res);
  } catch (error) {
    return handleControllerError(res, error, 'getConversations');
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const { conversationId } = req.params;
    const limit = parseInt(req.query?.limit || '50', 10);
    const offset = parseInt(req.query?.offset || '0', 10);

    const result = await messageService.getMessages(conversationId, accountId, limit, offset);

    return sendSuccess(res, result, 'Messages retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getConversationMessages');
  }
};

export const getContactStatus = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const { conversationId } = req.params;

    const conversation = await conversationService.getConversationDetail(conversationId, accountId, req.projectId);

    return sendSuccess(res, {
      conversationId,
      contactPhone: conversation.userPhone,
      contactName: conversation.userName,
      online: false,
      lastMessageAt: conversation.lastMessageAt || null
    }, 'Contact status retrieved');
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return sendNotFound(res, 'Conversation not found');
    }
    return handleControllerError(res, error, 'getContactStatus');
  }
};

export const replyToConversation = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const { conversationId } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return sendValidationError(res, 'Message is required');
    }

    const sentMessage = await messageService.sendMessage(
      conversationId,
      message,
      'text',
      accountId,
      req.body?.phoneNumberId || null,
      req.user?._id || null
    );

    return sendSuccess(res, { message: sentMessage }, 'Reply sent');
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return sendNotFound(res, 'Conversation not found');
    }
    return handleControllerError(res, error, 'replyToConversation');
  }
};

export const markAsRead = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const { conversationId } = req.params;

    const conversation = await conversationService.markConversationAsRead(
      conversationId,
      req.user?._id || null,
      accountId,
      req.projectId
    );

    return sendSuccess(res, { conversationId, markedAsRead: true, unreadCount: conversation?.unreadCount || 0 }, 'Marked as read');
  } catch (error) {
    return handleControllerError(res, error, 'markAsRead');
  }
};

export const updateStatus = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const { conversationId } = req.params;
    const { status } = req.body;

    if (!status || !['open', 'closed'].includes(status)) {
      return sendValidationError(res, 'Status must be either open or closed');
    }

    const conversation = status === 'closed'
      ? await conversationService.closeConversation(conversationId, accountId, 'manual', req.user?._id || null, req.projectId)
      : await conversationService.reopenConversation(conversationId, accountId, req.user?._id || null, req.projectId);

    return sendSuccess(res, { conversation }, 'Status updated');
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return sendNotFound(res, 'Conversation not found');
    }
    return handleControllerError(res, error, 'updateStatus');
  }
};

export default { 
  getConversation, 
  listConversations, 
  assignConversation,
  getConversations,
  getConversationMessages,
  getContactStatus,
  replyToConversation,
  markAsRead,
  updateStatus
};
