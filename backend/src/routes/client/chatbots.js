/**
 * CLIENT: Chatbots
 * Manage own chatbots (tenant isolated)
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET all chatbots (tenant isolated)
router.get('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const projectId = req.query.projectId || req.projectId || null;

    const query = { accountId };
    if (projectId) query.projectId = projectId;

    const chatbots = await db().collection('chatbots').find(query).sort({ createdAt: -1 }).toArray();

    return sendSuccess(res, chatbots, 'Your chatbots');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// CREATE chatbot (tenant isolated)
router.post('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const projectId = req.body.projectId || req.query.projectId || req.projectId || null;
    const { name, description, flows = {} } = req.body;

    if (!name) {
      return sendError(res, 'Name required', 400);
    }

    const newChatbot = {
      accountId,
      projectId,
      name,
      description: description || '',
      flows,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db().collection('chatbots').insertOne(newChatbot);
    return sendSuccess(res, { ...newChatbot, _id: result.insertedId }, 'Chatbot created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// UPDATE chatbot (tenant isolated)
router.put('/:chatbotId', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const projectId = req.body.projectId || req.query.projectId || req.projectId || null;
    const { chatbotId } = req.params;
    const { name, description, flows, status } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (flows) updateData.flows = flows;
    if (status) updateData.status = status;
    updateData.updatedAt = new Date();

    const query = { _id: new mongoose.Types.ObjectId(chatbotId), accountId };
    if (projectId) query.projectId = projectId;

    const result = await db().collection('chatbots').findOneAndUpdate(
      query,
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return sendError(res, 'Chatbot not found', 404);
    }

    return sendSuccess(res, result.value, 'Chatbot updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
