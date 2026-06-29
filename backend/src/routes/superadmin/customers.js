/**
 * SUPERADMIN: Customers Management
 * List, create, update, delete client accounts
 */

import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';
import { AccountType } from '../../constants/enums.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET all clients (all CLIENT type accounts - superadmin can see all)
router.get('/', async (req, res) => {
  try {
    const customers = await db().collection('accounts').find({
      type: AccountType.CLIENT
    }).toArray();

    return sendSuccess(res, customers, 'All customers retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// GET specific client by accountId
router.get('/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const customer = await db().collection('accounts').findOne({
      accountId,
      type: AccountType.CLIENT
    });

    if (!customer) {
      return sendError(res, 'Customer not found', 404);
    }

    return sendSuccess(res, customer);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// CREATE new client account
router.post('/', async (req, res) => {
  try {
    const { email, company, phone, password, plan = 'free' } = req.body;

    if (!email || !company || !password) {
      return sendError(res, 'Email, company, and password required', 400);
    }

    // Check if email already exists
    const existing = await db().collection('accounts').findOne({ email });
    if (existing) {
      return sendError(res, 'Email already registered', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate accountId (sequential or UUID)
    const lastClient = await db().collection('accounts')
      .findOne({ type: AccountType.CLIENT }, { sort: { createdAt: -1 } });
    
    const lastId = lastClient?.accountId ? parseInt(lastClient.accountId) : 2600000;
    const newAccountId = String(lastId + 1);

    // Create account
    const newAccount = {
      accountId: newAccountId,
      email,
      company,
      phone,
      password: hashedPassword,
      type: AccountType.CLIENT,
      plan,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db().collection('accounts').insertOne(newAccount);

    return sendSuccess(res, { ...newAccount, _id: result.insertedId }, 'Customer created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// UPDATE client
router.put('/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { email, company, phone, plan, status } = req.body;

    const updateData = {};
    if (email) updateData.email = email;
    if (company) updateData.company = company;
    if (phone) updateData.phone = phone;
    if (plan) updateData.plan = plan;
    if (status) updateData.status = status;
    updateData.updatedAt = new Date();

    const result = await db().collection('accounts').findOneAndUpdate(
      { accountId, type: AccountType.CLIENT },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return sendError(res, 'Customer not found', 404);
    }

    return sendSuccess(res, result.value, 'Customer updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// DELETE client (soft delete)
router.delete('/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    const result = await db().collection('accounts').findOneAndUpdate(
      { accountId, type: AccountType.CLIENT },
      { $set: { status: 'deleted', deletedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return sendError(res, 'Customer not found', 404);
    }

    return sendSuccess(res, result.value, 'Customer deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
