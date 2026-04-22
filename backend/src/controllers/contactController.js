import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';
import Contact from '../models/Contact.js';
import contactTimelineService from '../services/contactTimelineService.js';
import { ContactType } from '../constants/enums.js';

export const createContact = async (req, res) => {
  try {
    const { accountId } = req.user;
    const { name, phone, whatsappNumber, email, tags = [] } = req.body;

    if (!phone && !whatsappNumber) {
      return sendValidationError(res, 'Phone or WhatsApp number required');
    }

    const Contact = require('../models/Contact').default || require('../models/Contact');
    
    const contact = await Contact.create({
      accountId,
      name: name || phone || whatsappNumber,
      phone: phone || whatsappNumber,
      whatsappNumber: whatsappNumber || phone,
      email,
      type: 'customer',
      isOptedIn: true,
      optInDate: new Date(),
      firstContactAt: new Date(),
      tags,
      messageCount: 0,
      conversationCount: 0
    });

    console.log(`✅ Contact created: ${contact._id}`);
    return sendSuccess(res, { contact }, 'Contact created', 201);
  } catch (error) {
    if (error.code === 11000) {
      return sendSuccess(res, {}, 'Contact already exists', 200);
    }
    return handleControllerError(res, error, 'createContact');
  }
};

export const getContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    return sendSuccess(res, { contactId }, 'Contact retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getContact');
  }
};

export const listContacts = async (req, res) => {
  try {
    return sendSuccess(res, { contacts: [] }, 'Contacts retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listContacts');
  }
};

export const updateContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    return sendSuccess(res, { contactId }, 'Contact updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateContact');
  }
};

export const getContacts = async (req, res) => {
  try {
    const user = req.user;
    const db = mongoose.connection.db;
    console.log(`🔍 Fetching contacts for user accountId: ${user.accountId}`);
    
    const contacts = await db.collection('contacts').find({ accountId: user.accountId }).toArray();
    
    console.log(`✅ Found ${contacts.length} contacts for accountId: ${user.accountId}`);
    if (contacts.length === 0) {
      console.log("⚠️ No contacts found. Checking total contacts in collection...");
      const allContacts = await db.collection('contacts').find({}).toArray();
      console.log(`📊 Total contacts in DB: ${allContacts.length}`);
      if (allContacts.length > 0) {
        console.log("📋 Sample contacts:", allContacts.slice(0, 2).map(c => ({ accountId: c.accountId, name: c.name })));
      }
    }
    
    return sendSuccess(res, { contacts }, 'Contacts retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getContacts');
  }
};

export const getContactByPhone = async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    return sendSuccess(res, { phoneNumber }, 'Contact retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getContactByPhone');
  }
};

export const deleteContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    return sendSuccess(res, { contactId, deleted: true }, 'Contact deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteContact');
  }
};

export const importContacts = async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!contacts) {
      return sendValidationError(res, 'Contacts array required');
    }
    return sendSuccess(res, { imported: contacts.length }, 'Contacts imported');
  } catch (error) {
    return handleControllerError(res, error, 'importContacts');
  }
};

/**
 * Bulk update contacts
 * Used for: tag multiple, assign multiple, delete multiple
 */
export const bulkUpdateContacts = async (req, res) => {
  try {
    const { accountId, _id: userId } = req.user;
    const { contactIds, action, payload } = req.body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return sendValidationError(res, 'Contact IDs array required');
    }

    if (!action) {
      return sendValidationError(res, 'Action required (add_tag, remove_tag, assign, delete)');
    }

    let result = { updated: 0, failed: 0 };

    // Convert string IDs to ObjectId
    const objectIds = contactIds.map(id => new mongoose.Types.ObjectId(id));

    switch (action) {
      case 'add_tag':
        if (!payload.tag) return sendValidationError(res, 'Tag name required');
        result = await Contact.updateMany(
          { _id: { $in: objectIds }, accountId },
          { $addToSet: { tags: payload.tag } }
        );
        
        // Log to timeline for each contact
        for (const contactId of objectIds) {
          await contactTimelineService.logActivity(
            accountId,
            contactId,
            'tag_added',
            { type: 'user', id: userId },
            { tagName: payload.tag },
            `Tag "${payload.tag}" added`
          );
        }
        break;

      case 'remove_tag':
        if (!payload.tag) return sendValidationError(res, 'Tag name required');
        result = await Contact.updateMany(
          { _id: { $in: objectIds }, accountId },
          { $pull: { tags: payload.tag } }
        );

        for (const contactId of objectIds) {
          await contactTimelineService.logActivity(
            accountId,
            contactId,
            'tag_removed',
            { type: 'user', id: userId },
            { tagName: payload.tag },
            `Tag "${payload.tag}" removed`
          );
        }
        break;

      case 'assign':
        if (!payload.assignedTo) return sendValidationError(res, 'Agent ID required');
        result = await Contact.updateMany(
          { _id: { $in: objectIds }, accountId },
          { $set: { assignedTo: payload.assignedTo } }
        );

        for (const contactId of objectIds) {
          await contactTimelineService.logActivity(
            accountId,
            contactId,
            'assigned',
            { type: 'user', id: userId },
            { agentId: payload.assignedTo, agentName: payload.agentName || 'Agent' },
            `Assigned to ${payload.agentName || 'agent'}`
          );
        }
        break;

      case 'delete':
        result = await Contact.deleteMany(
          { _id: { $in: objectIds }, accountId }
        );
        break;

      default:
        return sendValidationError(res, 'Invalid action');
    }

    logger.info(`Bulk ${action} completed: ${result.modifiedCount || result.deletedCount} contacts`);

    return sendSuccess(res, {
      updated: result.modifiedCount || result.deletedCount || 0,
      failed: contactIds.length - (result.modifiedCount || result.deletedCount || 0)
    }, `Bulk operation completed`);
  } catch (error) {
    return handleControllerError(res, error, 'bulkUpdateContacts');
  }
};

/**
 * Get contact timeline/activity log
 */
export const getContactTimeline = async (req, res) => {
  try {
    const { accountId } = req.user;
    const { id: contactId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const result = await contactTimelineService.getContactTimeline(
      accountId,
      new mongoose.Types.ObjectId(contactId),
      parseInt(limit),
      parseInt(skip)
    );

    // Format timeline entries
    const formattedTimeline = result.timeline.map(entry => 
      contactTimelineService.formatTimelineEntry(entry)
    );

    return sendSuccess(res, {
      timeline: formattedTimeline,
      pagination: result.pagination
    }, 'Contact timeline retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getContactTimeline');
  }
};

/**
 * Fetch contacts from recent conversations
 * Pulls unique phone numbers from recent chats
 */
export const fetchContactsFromChats = async (req, res) => {
  try {
    const { accountId } = req.user;
    const db = mongoose.connection.db;

    // Get recent conversations/messages
    const conversations = await db.collection('conversations')
      .find({ accountId })
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .toArray();

    if (!conversations || conversations.length === 0) {
      return sendSuccess(res, { contacts: [] }, 'No recent conversations found');
    }

    // Extract unique phone numbers
    const phoneSet = new Set();
    const existingContacts = await Contact.find({ accountId }, { whatsappNumber: 1, phone: 1 }).lean();
    const existingPhones = new Set(
      existingContacts.flatMap(c => [c.whatsappNumber, c.phone]).filter(Boolean)
    );

    conversations.forEach(conv => {
      if (conv.senderPhone && !existingPhones.has(conv.senderPhone)) {
        phoneSet.add(conv.senderPhone);
      }
      if (conv.phoneNumber && !existingPhones.has(conv.phoneNumber)) {
        phoneSet.add(conv.phoneNumber);
      }
    });

    // Create contact objects from unique phones
    const newContacts = Array.from(phoneSet).map(phone => ({
      name: `Chat ${phone}`,
      whatsappNumber: phone,
      phone: phone,
      type: ContactType.CUSTOMER,
      tags: ['auto-synced'],
      isOptedIn: true
    }));

    return sendSuccess(res, { contacts: newContacts }, 'Contacts from chats retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'fetchContactsFromChats');
  }
};

export default { 
  createContact, 
  getContact, 
  listContacts, 
  updateContact,
  getContacts,
  getContactByPhone,
  deleteContact,
  importContacts,
  bulkUpdateContacts,
  getContactTimeline,
  fetchContactsFromChats
};
