/**
 * CLIENT: Agents
 * Manage team members (tenant isolated)
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET all agents (tenant isolated)
router.get('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    const agents = await db().collection('agents').find({
      accountId
    }).sort({ createdAt: -1 }).toArray();

    return sendSuccess(res, agents, 'Your agents');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// INVITE agent (tenant isolated)
router.post('/invite', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { email, role = 'agent' } = req.body;

    if (!email) {
      return sendError(res, 'Email required', 400);
    }

    // Check if already invited
    const existing = await db().collection('agents').findOne({
      accountId,
      email
    });

    if (existing) {
      return sendError(res, 'Agent already exists', 400);
    }

    const newAgent = {
      accountId,
      email,
      role,
      status: 'pending',
      inviteSentAt: new Date(),
      createdAt: new Date()
    };

    const result = await db().collection('agents').insertOne(newAgent);
    return sendSuccess(res, { ...newAgent, _id: result.insertedId }, 'Invite sent', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// UPDATE agent role (tenant isolated)
router.put('/:agentId', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { agentId } = req.params;
    const { role, status } = req.body;

    const updateData = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    updateData.updatedAt = new Date();

    const result = await db().collection('agents').findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(agentId), accountId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return sendError(res, 'Agent not found', 404);
    }

    return sendSuccess(res, result.value, 'Agent updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
