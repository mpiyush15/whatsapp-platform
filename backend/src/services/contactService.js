import contactRepository from '../repositories/contactRepository.js';
import contactTimelineService from './contactTimelineService.js';
import { ContactType } from '../constants/enums.js';

class ContactService {
  async createContact(accountId, payload = {}) {
    const {
      name,
      phone,
      whatsappNumber,
      email,
      tags = [],
      source = 'Manual'
    } = payload;

    if (!phone && !whatsappNumber) {
      const error = new Error('Phone or WhatsApp number required');
      error.statusCode = 400;
      throw error;
    }

    const contact = await contactRepository.create({
      accountId,
      name: name || phone || whatsappNumber,
      phone: phone || whatsappNumber,
      whatsappNumber: whatsappNumber || phone,
      email,
      source,
      type: ContactType.CUSTOMER,
      isOptedIn: true,
      optInDate: new Date(),
      firstContactAt: new Date(),
      tags,
      messageCount: 0,
      conversationCount: 0
    });

    return contact;
  }

  async getContacts(accountId) {
    return contactRepository.findByAccountId(accountId);
  }

  async getContact(accountId, contactId) {
    return contactRepository.findByIdAndAccount(contactId, accountId);
  }

  async getContactByPhone(accountId, whatsappNumber) {
    if (!whatsappNumber) {
      const error = new Error('Phone number required');
      error.statusCode = 400;
      throw error;
    }

    return contactRepository.findByPhone(accountId, whatsappNumber);
  }

  async updateContact(accountId, contactId, updates = {}) {
    const allowedUpdates = [
      'name',
      'phone',
      'whatsappNumber',
      'email',
      'tags',
      'notes',
      'type',
      'isOptedIn',
      'source'
    ];

    const sanitizedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowedUpdates.includes(key))
    );

    if (Object.keys(sanitizedUpdates).length === 0) {
      const error = new Error('No valid fields to update');
      error.statusCode = 400;
      throw error;
    }

    return contactRepository.updateByIdAndAccount(contactId, accountId, sanitizedUpdates);
  }

  async deleteContact(accountId, contactId) {
    return contactRepository.deleteByIdAndAccount(contactId, accountId);
  }

  async bulkUpdateContacts(accountId, userId, body = {}) {
    const { contactIds, action, payload = {} } = body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      const error = new Error('Contact IDs array required');
      error.statusCode = 400;
      throw error;
    }

    if (!action) {
      const error = new Error('Action required (add_tag, remove_tag, assign, delete)');
      error.statusCode = 400;
      throw error;
    }

    let result;

    switch (action) {
      case 'add_tag': {
        if (!payload.tag) {
          const error = new Error('Tag name required');
          error.statusCode = 400;
          throw error;
        }

        result = await contactRepository.updateManyByIds(
          contactIds,
          accountId,
          { $addToSet: { tags: payload.tag } }
        );

        for (const contactId of contactIds) {
          const objectId = contactRepository.toObjectId(contactId);
          if (!objectId) continue;

          await contactTimelineService.logActivity(
            accountId,
            objectId,
            'tag_added',
            { type: 'user', id: userId },
            { tagName: payload.tag },
            `Tag "${payload.tag}" added`
          );
        }
        break;
      }

      case 'remove_tag': {
        if (!payload.tag) {
          const error = new Error('Tag name required');
          error.statusCode = 400;
          throw error;
        }

        result = await contactRepository.updateManyByIds(
          contactIds,
          accountId,
          { $pull: { tags: payload.tag } }
        );

        for (const contactId of contactIds) {
          const objectId = contactRepository.toObjectId(contactId);
          if (!objectId) continue;

          await contactTimelineService.logActivity(
            accountId,
            objectId,
            'tag_removed',
            { type: 'user', id: userId },
            { tagName: payload.tag },
            `Tag "${payload.tag}" removed`
          );
        }
        break;
      }

      case 'assign': {
        if (!payload.assignedTo) {
          const error = new Error('Agent ID required');
          error.statusCode = 400;
          throw error;
        }

        result = await contactRepository.updateManyByIds(
          contactIds,
          accountId,
          { $set: { assignedTo: payload.assignedTo } }
        );

        for (const contactId of contactIds) {
          const objectId = contactRepository.toObjectId(contactId);
          if (!objectId) continue;

          await contactTimelineService.logActivity(
            accountId,
            objectId,
            'assigned',
            { type: 'user', id: userId },
            { agentId: payload.assignedTo, agentName: payload.agentName || 'Agent' },
            `Assigned to ${payload.agentName || 'agent'}`
          );
        }
        break;
      }

      case 'delete': {
        result = await contactRepository.deleteManyByIds(contactIds, accountId);
        break;
      }

      default: {
        const error = new Error('Invalid action');
        error.statusCode = 400;
        throw error;
      }
    }

    const count = result?.modifiedCount || result?.deletedCount || 0;

    return {
      updated: count,
      failed: contactIds.length - count,
      action
    };
  }

  async getContactTimeline(accountId, contactId, limit = 50, skip = 0) {
    const objectId = contactRepository.toObjectId(contactId);
    if (!objectId) {
      const error = new Error('Invalid contact ID');
      error.statusCode = 400;
      throw error;
    }

    const result = await contactTimelineService.getContactTimeline(
      accountId,
      objectId,
      parseInt(limit, 10),
      parseInt(skip, 10)
    );

    return {
      timeline: result.timeline.map(entry => contactTimelineService.formatTimelineEntry(entry)),
      pagination: result.pagination
    };
  }

  async fetchContactsFromChats(accountId) {
    const conversations = await contactRepository.getRecentConversationsRaw(accountId, 100);

    if (!conversations || conversations.length === 0) {
      return [];
    }

    const existingContacts = await contactRepository.findByAccountIdForPhones(accountId);
    const existingPhones = new Set(
      existingContacts.flatMap(c => [c.whatsappNumber, c.phone]).filter(Boolean)
    );

    const phoneSet = new Set();

    conversations.forEach((conv) => {
      if (conv.senderPhone && !existingPhones.has(conv.senderPhone)) {
        phoneSet.add(conv.senderPhone);
      }
      if (conv.phoneNumber && !existingPhones.has(conv.phoneNumber)) {
        phoneSet.add(conv.phoneNumber);
      }
    });

    return Array.from(phoneSet).map((phone) => ({
      name: `Chat ${phone}`,
      whatsappNumber: phone,
      phone,
      type: ContactType.CUSTOMER,
      tags: ['auto-synced'],
      isOptedIn: true
    }));
  }
}

export default new ContactService();
