/**
 * CLIENT: Templates
 * Manage WhatsApp message templates (tenant isolated)
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET all templates (tenant isolated)
router.get('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    const templates = await db().collection('templates').find({
      accountId
    }).sort({ createdAt: -1 }).toArray();

    return sendSuccess(res, templates, 'Your templates');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// CREATE template (tenant isolated)
router.post('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { name, category, content } = req.body;

    if (!name || !content) {
      return sendError(res, 'Name and content required', 400);
    }

    const newTemplate = {
      accountId,
      name,
      category: category || 'general',
      content,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db().collection('templates').insertOne(newTemplate);
    return sendSuccess(res, { ...newTemplate, _id: result.insertedId }, 'Template created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// UPDATE template (tenant isolated)
router.put('/:templateId', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { templateId } = req.params;
    const { name, content, status } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (content) updateData.content = content;
    if (status) updateData.status = status;
    updateData.updatedAt = new Date();

    const result = await db().collection('templates').findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(templateId), accountId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return sendError(res, 'Template not found', 404);
    }

    return sendSuccess(res, result.value, 'Template updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
