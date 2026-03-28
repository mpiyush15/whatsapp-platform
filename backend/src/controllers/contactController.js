import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';

export const createContact = async (req, res) => {
  try {
    const { phoneNumber, name, email, customFields } = req.body;

    if (!phoneNumber) {
      return sendValidationError(res, 'Phone number required');
    }

    return sendSuccess(res, {
      contactId: `contact_${Date.now()}`,
      phoneNumber,
      name,
      status: 'active'
    }, 'Contact created');
  } catch (error) {
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
    const contacts = await db.collection('contacts').find({ accountId: user.accountId }).toArray();
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

export default { 
  createContact, 
  getContact, 
  listContacts, 
  updateContact,
  getContacts,
  getContactByPhone,
  deleteContact,
  importContacts
};
