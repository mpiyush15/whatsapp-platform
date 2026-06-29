/**
 * SUPERADMIN: Plans Management
 * Create, update, view all subscription plans
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET all plans
router.get('/', async (req, res) => {
  try {
    const plans = await db().collection('plans').find({}).toArray();
    return sendSuccess(res, plans, 'All subscription plans');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// CREATE plan
router.post('/', async (req, res) => {
  try {
    const { name, price, monthlyPrice, features, description, maxMessages, maxContacts } = req.body;

    if (!name || !price) {
      return sendError(res, 'Name and price required', 400);
    }

    const newPlan = {
      name,
      price,
      monthlyPrice: monthlyPrice || price,
      features: features || [],
      description: description || '',
      maxMessages: maxMessages || null,
      maxContacts: maxContacts || null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db().collection('plans').insertOne(newPlan);
    return sendSuccess(res, { ...newPlan, _id: result.insertedId }, 'Plan created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// UPDATE plan
router.put('/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const { name, price, features, active } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (price) updateData.price = price;
    if (features) updateData.features = features;
    if (active !== undefined) updateData.active = active;
    updateData.updatedAt = new Date();

    const result = await db().collection('plans').findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(planId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return sendError(res, 'Plan not found', 404);
    }

    return sendSuccess(res, result.value, 'Plan updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// DELETE plan
router.delete('/:planId', async (req, res) => {
  try {
    const { planId } = req.params;

    const result = await db().collection('plans').deleteOne(
      { _id: new mongoose.Types.ObjectId(planId) }
    );

    if (result.deletedCount === 0) {
      return sendError(res, 'Plan not found', 404);
    }

    return sendSuccess(res, null, 'Plan deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
