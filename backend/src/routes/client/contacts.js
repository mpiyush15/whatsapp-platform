/**
 * CLIENT: Contacts
 * Manage own contacts (tenant isolated)
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET all contacts (tenant isolated)
router.get('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    const contacts = await db().collection('contacts').find({
      accountId
    }).sort({ createdAt: -1 }).toArray();

    return sendSuccess(res, contacts, 'Your contacts');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// CREATE contact (tenant isolated)
router.post('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { phone, name, email, tags = [] } = req.body;

    if (!phone || !name) {
      return sendError(res, 'Phone and name required', 400);
    }

    // Check if contact already exists
    const existing = await db().collection('contacts').findOne({
      accountId,
      phone
    });

    if (existing) {
      return sendError(res, 'Contact already exists', 400);
    }

    const newContact = {
      accountId,
      phone,
      name,
      email: email || null,
      tags,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db().collection('contacts').insertOne(newContact);

    return sendSuccess(res, { ...newContact, _id: result.insertedId }, 'Contact created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// UPDATE contact (tenant isolated)
router.put('/:contactId', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { contactId } = req.params;
    const { name, email, tags } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (tags) updateData.tags = tags;
    updateData.updatedAt = new Date();

    const result = await db().collection('contacts').findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(contactId), accountId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return sendError(res, 'Contact not found', 404);
    }

    return sendSuccess(res, result.value, 'Contact updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// DELETE contact (tenant isolated)
router.delete('/:contactId', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { contactId } = req.params;

    const result = await db().collection('contacts').findOneAndDelete({
      _id: new mongoose.Types.ObjectId(contactId),
      accountId
    });

    if (!result.value) {
      return sendError(res, 'Contact not found', 404);
    }

    return sendSuccess(res, result.value, 'Contact deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
