import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import contactService from '../services/contactService.js';
import { dispatchWebhookEvent } from '../services/webhookDispatcherService.js';

export const createContact = async (req, res) => {
  try {
    const { accountId } = req.user;
    const contact = await contactService.createContact(accountId, req.body);

    dispatchWebhookEvent({
      accountId,
      projectId: req.projectId || contact?.projectId || null,
      eventType: 'contact.created',
      payload: {
        contactId: String(contact?._id || ''),
        name: contact?.name || '',
        phoneNumber: contact?.phoneNumber || contact?.whatsappNumber || '',
      },
      source: 'contact-controller',
    }).catch((err) => logger.error('contact.created webhook dispatch failed', err));

    logger.info(`✅ Contact created: ${contact._id}`);
    return sendSuccess(res, { contact }, 'Contact created', 201);
  } catch (error) {
    if (error.statusCode === 400) {
      return sendValidationError(res, error.message);
    }
    if (error.code === 11000) {
      return sendSuccess(res, {}, 'Contact already exists', 200);
    }
    return handleControllerError(res, error, 'createContact');
  }
};

export const getContact = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const contactId = req.params?.id || req.params?.contactId;

    const contact = await contactService.getContact(accountId, contactId);
    if (!contact) {
      return sendNotFound(res, 'Contact not found');
    }

    return sendSuccess(res, { contact }, 'Contact retrieved');
  } catch (error) {
    if (error.statusCode === 400) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'getContact');
  }
};

export const listContacts = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const contacts = await contactService.getContacts(accountId);
    return sendSuccess(res, { contacts }, 'Contacts retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listContacts');
  }
};

export const updateContact = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const contactId = req.params?.id || req.params?.contactId;

    const contact = await contactService.updateContact(accountId, contactId, req.body);
    if (!contact) {
      return sendNotFound(res, 'Contact not found');
    }

    return sendSuccess(res, { contact }, 'Contact updated');
  } catch (error) {
    if (error.statusCode === 400) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'updateContact');
  }
};

export const getContacts = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const contacts = await contactService.getContacts(accountId);
    
    return sendSuccess(res, { contacts }, 'Contacts retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getContacts');
  }
};

export const getContactByPhone = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const whatsappNumber = req.params?.whatsappNumber || req.params?.phoneNumber;

    const contact = await contactService.getContactByPhone(accountId, whatsappNumber);
    if (!contact) {
      return sendNotFound(res, 'Contact not found');
    }

    return sendSuccess(res, { contact }, 'Contact retrieved');
  } catch (error) {
    if (error.statusCode === 400) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'getContactByPhone');
  }
};

export const deleteContact = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const contactId = req.params?.id || req.params?.contactId;

    const deletedContact = await contactService.deleteContact(accountId, contactId);
    if (!deletedContact) {
      return sendNotFound(res, 'Contact not found');
    }

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
    const result = await contactService.bulkUpdateContacts(accountId, userId, req.body);

    logger.info(`Bulk ${result.action} completed: ${result.updated} contacts`);

    return sendSuccess(res, {
      updated: result.updated,
      failed: result.failed
    }, `Bulk operation completed`);
  } catch (error) {
    if (error.statusCode === 400) {
      return sendValidationError(res, error.message);
    }
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

    const result = await contactService.getContactTimeline(accountId, contactId, limit, skip);

    return sendSuccess(res, {
      timeline: result.timeline,
      pagination: result.pagination
    }, 'Contact timeline retrieved');
  } catch (error) {
    if (error.statusCode === 400) {
      return sendValidationError(res, error.message);
    }
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
    const newContacts = await contactService.fetchContactsFromChats(accountId);

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
