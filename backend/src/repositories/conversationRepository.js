import Conversation from '../models/Conversation.js';
import mongoose from 'mongoose';

class ConversationRepository {
  buildConversationIdentityFilter(conversationId, accountId, projectId = null) {
    const normalizedConversationId = String(conversationId || '');
    const filter = {
      accountId,
      $or: [
        { conversationId: normalizedConversationId }
      ]
    };

    if (projectId) {
      filter.projectId = projectId;
    }

    if (mongoose.Types.ObjectId.isValid(normalizedConversationId)) {
      filter.$or.push({ _id: normalizedConversationId });
    }

    return filter;
  }

  buildListQuery(accountId, workspaceId, phoneNumberId, filters = {}) {
    const {
      status = null,
      assignedToMe = false,
      agentId = null,
      tags = [],
      search = '',
      projectId = null
    } = filters;

    const query = { accountId };

    if (projectId) {
      query.projectId = projectId;
    }

    if (workspaceId && workspaceId.trim()) {
      query.workspaceId = workspaceId;
    }

    if (phoneNumberId && phoneNumberId.trim()) {
      query.phoneNumberId = phoneNumberId;
    }

    if (status) {
      query.status = status;
    }

    if (assignedToMe && agentId) {
      query.assignedAgentId = agentId;
    }

    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { userName: { $regex: term, $options: 'i' } },
        { userPhone: { $regex: term, $options: 'i' } },
        { lastMessagePreview: { $regex: term, $options: 'i' } },
        { tags: { $regex: term, $options: 'i' } },
      ];
    }

    // CRITICAL: Only show conversations that actually have an inbound message (i.e. client replied)
    // Purely outbound campaign messages will stay hidden until the client replies
    query.hasInboundMessage = true;

    return query;
  }

  async findWithFilters(query, limit = 50, offset = 0) {
    return Conversation.find(query)
      .sort({ lastMessageAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('assignedAgentId', 'name email')
      .lean();
  }

  async countByQuery(query) {
    return Conversation.countDocuments(query);
  }

  async findByIdAndAccount(conversationId, accountId, projectId = null) {
    const filter = { _id: conversationId, accountId };
    if (projectId) filter.projectId = projectId;
    return Conversation.findOne(filter).populate('assignedAgentId', 'name email phone status');
  }

  async assignToAgent(conversationId, accountId, assigneeUserId, reason = 'manual', assignmentAgentId = assigneeUserId, projectId = null) {
    return Conversation.findOneAndUpdate(
      this.buildConversationIdentityFilter(conversationId, accountId, projectId),
      {
        assignedAgentId: assigneeUserId,
        $push: {
          assignmentHistory: {
            agentId: assignmentAgentId,
            assignedAt: new Date(),
            reason
          }
        }
      },
      { new: true }
    ).populate('assignedAgentId', 'name email');
  }

  async updateStatus(conversationId, accountId, status, extraUpdates = {}, projectId = null) {
    return Conversation.findOneAndUpdate(
      this.buildConversationIdentityFilter(conversationId, accountId, projectId),
      {
        status,
        ...extraUpdates
      },
      { new: true }
    );
  }

  async addTag(conversationId, accountId, tagName, projectId = null) {
    return Conversation.findOneAndUpdate(
      this.buildConversationIdentityFilter(conversationId, accountId, projectId),
      { $addToSet: { tags: tagName } },
      { new: true }
    );
  }

  async removeTag(conversationId, accountId, tagName, projectId = null) {
    return Conversation.findOneAndUpdate(
      this.buildConversationIdentityFilter(conversationId, accountId, projectId),
      { $pull: { tags: tagName } },
      { new: true }
    );
  }

  async findLeanByIdAndAccount(conversationId, accountId, projectId = null) {
    const filter = { _id: conversationId, accountId };
    if (projectId) filter.projectId = projectId;
    return Conversation.findOne(filter).lean();
  }

  async updateMetrics(conversationId, accountId, metrics = {}) {
    return Conversation.updateOne(
      { _id: conversationId, accountId },
      metrics
    );
  }

  async markAsRead(conversationId, accountId, agentId, projectId = null) {
    return Conversation.findOneAndUpdate(
      this.buildConversationIdentityFilter(conversationId, accountId, projectId),
      {
        unreadCount: 0,
        lastReadBy: {
          agentId,
          readAt: new Date()
        }
      },
      { new: true }
    );
  }

  async touchAfterOutboundMessage(conversationId, content, messageType = 'text') {
    return Conversation.updateOne(
      { _id: conversationId },
      {
        $set: {
          lastMessageAt: new Date(),
          updatedAt: new Date(),
          lastMessagePreview: String(content || '').substring(0, 200),
          lastMessageType: messageType,
          unreadCount: 0
        },
        $inc: {
          messageCount: 1
        }
      }
    );
  }

  async touchAfterIncomingMessage(conversationId, preview, messageType = 'text') {
    return Conversation.updateOne(
      { _id: conversationId },
      {
        $set: {
          lastMessageAt: new Date(),
          lastMessagePreview: String(preview || '').substring(0, 200),
          lastMessageType: messageType,
          hasInboundMessage: true
        },
        $inc: {
          messageCount: 1,
          unreadCount: 1
        }
      }
    );
  }
}

export default new ConversationRepository();
