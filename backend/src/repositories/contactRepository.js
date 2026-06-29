import mongoose from 'mongoose';
import Contact from '../models/Contact.js';
import Enquiry from '../models/Enquiry.js';
import { normalizePhone, phoneLookupVariants } from '../utils/normalizePhone.js';

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

  async upsertByPhone(accountId, phone, contactData) {
    const {
      accountId: _accountId,
      phone: _phone,
      whatsappNumber: _whatsappNumber,
      createdAt: _createdAt,
      firstContactAt: _firstContactAt,
      ...setData
    } = contactData || {};

    return Contact.findOneAndUpdate(
      {
        accountId,
        $or: [
          { whatsappNumber: phone },
          { phone }
        ]
      },
      {
        $set: {
          ...setData,
          updatedAt: new Date()
        },
        $setOnInsert: {
          accountId,
          phone,
          whatsappNumber: phone,
          firstContactAt: new Date(),
          createdAt: new Date()
        }
      },
      {
        returnDocument: 'after',
        upsert: true,
        setDefaultsOnInsert: true
      }
    );
  }

  buildListQuery(accountId, filters = {}) {
    const query = { accountId };

    if (filters.projectId) {
      query.projectId = filters.projectId;
    }

    if (filters.rawOnly) {
      query.source = {
        $in: [
          'Manual',
          'Import',
          'CSV Import',
        ],
      };
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.status && filters.status !== 'all') {
      query.leadStatus = filters.status;
    }

    const tags = Array.isArray(filters.tags)
      ? filters.tags
      : String(filters.tags || '')
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);
    if (tags.length > 0) {
      query.tags = { $all: tags };
    }

    if (filters.source) {
      query.source = filters.source;
    }

    if (filters.area) {
      query['customAttributes.area'] = { $regex: String(filters.area).trim(), $options: 'i' };
    }

    if (filters.courseInterest) {
      query['customAttributes.courseInterest'] = { $regex: String(filters.courseInterest).trim(), $options: 'i' };
    }

    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
        { whatsappNumber: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { source: { $regex: term, $options: 'i' } },
        { tags: { $regex: term, $options: 'i' } },
        { notes: { $regex: term, $options: 'i' } },
        { 'customAttributes.area': { $regex: term, $options: 'i' } },
        { 'customAttributes.courseInterest': { $regex: term, $options: 'i' } }
      ];
    }

    return query;
  }

  async applyRawContactExclusions(query, accountId, filters = {}) {
    query.source = filters.source || {
      $in: [
        'Manual',
        'Import',
        'CSV Import',
      ],
    };

    const enquiryRows = await Enquiry.find({
      accountId,
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
    }).select('contactId phone').lean();

    const enquiryContactIds = enquiryRows
      .map((row) => row.contactId)
      .filter(Boolean);
    const enquiryPhones = new Set();

    for (const row of enquiryRows) {
      const normalized = normalizePhone(row.phone);
      if (!normalized) continue;
      for (const variant of phoneLookupVariants(normalized)) {
        enquiryPhones.add(variant);
      }
    }

    if (enquiryContactIds.length > 0) {
      query._id = { ...(query._id || {}), $nin: enquiryContactIds };
    }
    if (enquiryPhones.size > 0) {
      const phones = Array.from(enquiryPhones);
      query.$and = [
        ...(query.$and || []),
        { phone: { $nin: phones } },
        { whatsappNumber: { $nin: phones } },
      ];
    }

    return query;
  }

  async findByAccountId(accountId, filters = {}) {
    const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 1000);
    const offset = Math.max(Number(filters.offset) || 0, 0);
    const query = this.buildListQuery(accountId, filters);

    const baseQuery = { accountId };
    if (filters.projectId) baseQuery.projectId = filters.projectId;

    if (filters.rawOnly) {
      await this.applyRawContactExclusions(query, accountId, filters);
      await this.applyRawContactExclusions(baseQuery, accountId, filters);
    }

    const [contacts, total, statsAgg, allProjectTags] = await Promise.all([
      Contact.find(query)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Contact.countDocuments(query),
      Contact.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            new: { $sum: { $cond: [{ $eq: ["$leadStatus", "new"] }, 1, 0] } },
            contacted: { $sum: { $cond: [{ $eq: ["$leadStatus", "contacted"] }, 1, 0] } },
            qualified: { $sum: { $cond: [{ $eq: ["$leadStatus", "qualified"] }, 1, 0] } },
            proposal: { $sum: { $cond: [{ $eq: ["$leadStatus", "proposal"] }, 1, 0] } },
            won: { $sum: { $cond: [{ $eq: ["$leadStatus", "won"] }, 1, 0] } },
            lost: { $sum: { $cond: [{ $eq: ["$leadStatus", "lost"] }, 1, 0] } },
            totalValue: { $sum: { $ifNull: ["$leadValue", 0] } }
          }
        }
      ]),
      Contact.distinct('tags', baseQuery)
    ]);

    const stats = statsAgg[0] || {
      total: 0, new: 0, contacted: 0, qualified: 0, proposal: 0, won: 0, lost: 0, totalValue: 0
    };
    
    stats.tags = (allProjectTags || []).filter(Boolean);
    
    delete stats._id;

    return {
      contacts,
      stats,
      total,
      hasMore: offset + contacts.length < total,
      limit,
      offset
    };
  }

  async findByIdAndAccount(contactId, accountId, projectId = null) {
    const objectId = this.toObjectId(contactId);
    if (!objectId) return null;

    const query = { _id: objectId, accountId };
    if (projectId) query.projectId = projectId;

    return Contact.findOne(query);
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

  async updateByIdAndAccount(contactId, accountId, updates, projectId = null) {
    const objectId = this.toObjectId(contactId);
    if (!objectId) return null;

    const query = { _id: objectId, accountId };
    if (projectId) query.projectId = projectId;

    return Contact.findOneAndUpdate(
      query,
      { $set: updates },
      { new: true }
    );
  }

  async deleteByIdAndAccount(contactId, accountId, projectId = null) {
    const objectId = this.toObjectId(contactId);
    if (!objectId) return null;

    const query = { _id: objectId, accountId };
    if (projectId) query.projectId = projectId;

    return Contact.findOneAndDelete(query);
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
