import Message from '../models/Message.js';

class MessageRepository {
  async findRecentDuplicate(conversationId, accountId, content) {
    return Message.findOne({
      conversationId,
      accountId,
      direction: 'outbound',
      'content.text': content,
      createdAt: { $gte: new Date(Date.now() - 2000) }
    });
  }

  async create(messageData) {
    return Message.create(messageData);
  }

  async findByConversation(conversationId, accountId, limit = 50, offset = 0) {
    return Message.find({
      conversationId,
      accountId
    })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean()
      .exec();
  }

  async countByConversation(conversationId, accountId) {
    return Message.countDocuments({ conversationId, accountId });
  }

  async findByIdAndAccount(messageId, accountId) {
    return Message.findOne({ _id: messageId, accountId });
  }

  async updateById(messageId, update, options = { new: true }) {
    return Message.findByIdAndUpdate(messageId, update, options);
  }

  async save(messageDoc) {
    return messageDoc.save();
  }

  async markReadByAgent(conversationId, accountId, agentId) {
    return Message.updateMany(
      { conversationId, accountId },
      {
        $addToSet: {
          readBy: {
            agentId,
            readAt: new Date()
          }
        }
      }
    );
  }

  async searchByText(conversationId, accountId, searchText, limit = 50) {
    return Message.find(
      {
        conversationId,
        accountId,
        'content.text': { $regex: searchText, $options: 'i' }
      },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

export default new MessageRepository();
