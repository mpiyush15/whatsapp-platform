import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import logger from '../utils/logger.js';

class LiveChatConversationService {
  async updateConversationAfterOutbound(conversation, accountId, { lastMessagePreview, lastMessageType }) {
    await Conversation.findOneAndUpdate(
      { conversationId: conversation.conversationId, accountId },
      {
        lastMessageAt: new Date(),
        lastMessagePreview,
        lastMessageType,
        messageCount: conversation.messageCount + 1,
      }
    );
  }

  resolveMediaTypeFromMime(mimeType = '') {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';
    return 'document';
  }

  async createOutboundMessageForConversation({
    conversationId,
    accountId,
    agentId,
    agentName,
    text,
    mediaUrl,
    mediaType,
    replyToId,
    emoji,
  }) {
    if (!text || !String(text).trim()) {
      if (!emoji) {
        const error = new Error('Message text or emoji cannot be empty');
        error.statusCode = 400;
        error.code = 'EMPTY_MESSAGE';
        throw error;
      }
    }

    const conversation = await Conversation.findOne({
      conversationId,
      accountId,
    });

    if (!conversation) {
      const error = new Error('Conversation not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    let finalMediaUrl = mediaUrl;
    if (mediaUrl && mediaUrl.startsWith('data:')) {
      try {
        const { uploadToS3 } = await import('./s3Service.js');
        const matches = mediaUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');

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
      }
    }

    let replyToMessageId = null;
    if (replyToId) {
      const replyToMessage = await Message.findOne({ _id: replyToId, conversationId });
      if (!replyToMessage) {
        const error = new Error('Message to reply to not found');
        error.statusCode = 404;
        error.code = 'REPLY_TO_NOT_FOUND';
        throw error;
      }
      replyToMessageId = replyToId;
    }

    const message = await Message.create({
      accountId,
      conversationId: conversation.conversationId,
      phoneNumberId: conversation.phoneNumberId,
      recipientPhone: conversation.userPhone,
      recipientName: conversation.userName,
      senderRole: 'agent',
      senderName: agentName,
      messageType: mediaType ? 'media' : 'text',
      direction: 'outbound',
      content: { text: text || '', mediaUrl: finalMediaUrl, mediaType, emoji },
      status: 'sent',
      sentAt: new Date(),
      sentByAgentId: agentId,
      replyTo: replyToMessageId,
      reactions: [],
    });

    await this.updateConversationAfterOutbound(conversation, accountId, {
      lastMessagePreview: text ? text.substring(0, 100) : `📎 ${mediaType || 'Media'}`,
      lastMessageType: mediaType ? 'media' : 'text',
    });

    logger.info(`✅ Message sent: ${message._id} | Reply: ${replyToMessageId ? '✓' : '✗'} | Emoji: ${emoji ? '✓' : '✗'}`);

    return {
      message,
      conversation,
      finalMediaUrl,
      replyToMessageId,
      text: text || '',
      mediaType,
      emoji,
    };
  }

  async createMediaMessageForConversation({
    conversationId,
    accountId,
    agentId,
    agentName,
    caption,
    file,
  }) {
    if (!file) {
      const error = new Error('No file provided');
      error.statusCode = 400;
      error.code = 'NO_FILE';
      throw error;
    }

    const conversation = await Conversation.findOne({
      conversationId,
      accountId,
    });

    if (!conversation) {
      const error = new Error('Conversation not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const mimeType = file.mimetype || 'application/octet-stream';
    const mediaType = this.resolveMediaTypeFromMime(mimeType);

    logger.info(`📎 Media file received: ${file.originalname} (${mediaType}) | Size: ${file.size} bytes`);

    const base64Data = file.buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const message = await Message.create({
      accountId,
      conversationId: conversation.conversationId,
      phoneNumberId: conversation.phoneNumberId,
      recipientPhone: conversation.userPhone,
      recipientName: conversation.userName,
      senderRole: 'agent',
      senderName: agentName,
      messageType: 'media',
      direction: 'outbound',
      content: {
        text: caption || '',
        mediaUrl: dataUrl,
        mediaType,
        filename: file.originalname,
      },
      status: 'sent',
      sentAt: new Date(),
      sentByAgentId: agentId,
      reactions: [],
    });

    await this.updateConversationAfterOutbound(conversation, accountId, {
      lastMessagePreview: `📎 ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`,
      lastMessageType: 'media',
    });

    logger.info(`✅ Media message saved: ${message._id}`);

    return {
      message,
      conversation,
      mediaType,
      mimeType,
      dataUrl,
      caption: caption || '',
      fileName: file.originalname,
      fileBuffer: file.buffer,
    };
  }

  /**
   * Get conversation + message statistics for a given month/year.
   * @param {string} accountId
   * @param {number|string} month  1-12
   * @param {number|string} year   e.g. 2026
   * @returns {Promise<object>} stats
   */
  async getConversationStats(accountId, month, year) {
    const { default: Message } = await import('../models/Message.js');

    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0, 23, 59, 59, 999);

    logger.info('📊 [stats] Fetching stats for:', { accountId, month, year, startDate, endDate });

    const [messageStats, unreadCount, totalConversations] = await Promise.all([
      Message.aggregate([
        {
          $match: {
            accountId,
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$direction',
            count: { $sum: 1 }
          }
        }
      ]),
      Conversation.countDocuments({ accountId, unreadCount: { $gt: 0 } }),
      Conversation.countDocuments({ accountId }),
    ]);

    let messagesSent = 0;
    let messagesReceived = 0;
    messageStats.forEach(stat => {
      if (stat._id === 'outbound') messagesSent = stat.count;
      else if (stat._id === 'inbound') messagesReceived = stat.count;
    });

    const stats = {
      messagesSent,
      messagesReceived,
      totalMessages: messagesSent + messagesReceived,
      unreadCount,
      broadcastedCount: totalConversations,
      period: {
        month: parseInt(month),
        year: parseInt(year),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    };

    logger.info('✅ [stats] Stats calculated:', stats);
    return stats;
  }

  /**
   * Update conversation metadata (priority, notes, status, tags, userName, customAttributes).
   * @param {string} conversationId  Mongo _id
   * @param {string} accountId
   * @param {object} updates  Validated fields only
   * @returns {Promise<object>} Updated conversation doc (populated assignedAgentId)
   */
  async updateConversationDetails(conversationId, accountId, updates) {
    if (!updates || Object.keys(updates).length === 0) {
      const err = new Error('No fields to update');
      err.statusCode = 400;
      err.code = 'EMPTY_UPDATE';
      throw err;
    }

    const conversationRepository = (await import('../repositories/conversationRepository.js')).default;
    const conversation = await Conversation.findOneAndUpdate(
      conversationRepository.buildConversationIdentityFilter(conversationId, accountId),
      updates,
      { new: true }
    ).populate('assignedAgentId', 'name email');

    if (!conversation) {
      const err = new Error('Conversation not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    logger.info(`✅ [updateConversationDetails] Conversation ${conversationId} updated`);
    return conversation;
  }

  /**
   * Add or update an emoji reaction on a message.
   * @param {string} messageId
   * @param {string} conversationId
   * @param {string} accountId
   * @param {string} emoji
   * @returns {Promise<object>} Updated message doc
   */
  async addMessageReaction(messageId, conversationId, accountId, emoji) {
    if (!emoji) {
      const err = new Error('Emoji is required');
      err.statusCode = 400;
      err.code = 'MISSING_EMOJI';
      throw err;
    }

    const message = await Message.findOne({ _id: messageId, conversationId, accountId });
    if (!message) {
      const err = new Error('Message not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (!message.reactions) message.reactions = [];

    const existing = message.reactions.find(r => r.emoji === emoji);
    if (existing) {
      existing.addedAt = new Date();
    } else {
      message.reactions.push({ emoji, addedAt: new Date() });
    }

    await message.save();
    logger.info(`😊 [addMessageReaction] Reaction ${emoji} saved on message ${messageId}`);
    return message;
  }
}

export default new LiveChatConversationService();
