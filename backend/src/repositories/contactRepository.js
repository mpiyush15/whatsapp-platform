import mongoose from 'mongoose';
import Contact from '../models/Contact.js';

class ContactRepository {
  toObjectId(id) {
    if (!id) return null;
    if (id instanceof mongoose.Types.ObjectId) return id;
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return new mongoose.Types.ObjectId(id);
  }

  async create(contactData) {
    return Contact.create(contactData);
  }

  async findByAccountId(accountId) {
    return Contact.find({ accountId }).sort({ createdAt: -1 }).lean();
  }

  async findByIdAndAccount(contactId, accountId) {
    const objectId = this.toObjectId(contactId);
    if (!objectId) return null;

    return Contact.findOne({ _id: objectId, accountId });
  }

  async findByPhone(accountId, phone) {
    return Contact.findOne({
      accountId,
      $or: [
        { whatsappNumber: phone },
        { phone }
      ]
    }).lean();
  }

  async updateByIdAndAccount(contactId, accountId, updates) {
    const objectId = this.toObjectId(contactId);
    if (!objectId) return null;

    return Contact.findOneAndUpdate(
      { _id: objectId, accountId },
      { $set: updates },
      { new: true }
    );
  }

  async deleteByIdAndAccount(contactId, accountId) {
    const objectId = this.toObjectId(contactId);
    if (!objectId) return null;

    return Contact.findOneAndDelete({ _id: objectId, accountId });
  }

  async updateManyByIds(contactIds, accountId, update) {
    const objectIds = contactIds
      .map(id => this.toObjectId(id))
      .filter(Boolean);

    return Contact.updateMany({ _id: { $in: objectIds }, accountId }, update);
  }

  async deleteManyByIds(contactIds, accountId) {
    const objectIds = contactIds
      .map(id => this.toObjectId(id))
      .filter(Boolean);

    return Contact.deleteMany({ _id: { $in: objectIds }, accountId });
  }

  async findByAccountIdForPhones(accountId) {
    return Contact.find({ accountId }, { whatsappNumber: 1, phone: 1 }).lean();
  }

  async getRecentConversationsRaw(accountId, limit = 100) {
    const db = mongoose.connection.db;

    return db.collection('conversations')
      .find({ accountId })
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .toArray();
  }
}

export default new ContactRepository();
