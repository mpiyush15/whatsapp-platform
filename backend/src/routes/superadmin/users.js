/**
 * SUPERADMIN: Team Management
 * Admin users, permissions, access logs
 */

import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;
const INTERNAL_ROLE_MATRIX = {
  'ops-admin': ['billing', 'customers', 'reconciliation', 'credits'],
  support: ['tickets', 'refunds', 'organizations'],
  sales: ['leads', 'demo-requests', 'organizations'],
  marketing: ['offers', 'campaigns', 'announcements'],
  'finance-ops': ['payments', 'invoices', 'revenue'],
  superadmin: ['*'],
};

// GET all admin users (superadmin only)
router.get('/', async (req, res) => {
  try {
    const users = await db().collection('admin_users')
      .find({})
      .project({ password: 0 })
      .sort({ createdAt: -1 })
      .toArray();
    return sendSuccess(res, users, 'Admin users');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// CREATE admin user (superadmin only)
router.post('/', async (req, res) => {
  try {
    const { email, name, password, role = 'ops-admin' } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password required', 400);
    }

    if (!INTERNAL_ROLE_MATRIX[role]) {
      return sendError(res, 'Invalid internal role', 400);
    }

    const existing = await db().collection('admin_users').findOne({ email });
    if (existing) {
      return sendError(res, 'Email already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      email,
      name: name || email,
      password: hashedPassword,
      role,
      permissions: INTERNAL_ROLE_MATRIX[role],
      isActive: true,
      mustResetPassword: false,
      accessBoundary: 'admin.domain',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db().collection('admin_users').insertOne(newUser);
    const created = { ...newUser };
    delete created.password;

    return sendSuccess(res, { ...created, _id: result.insertedId }, 'Admin user created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// UPDATE admin permissions (superadmin only)
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions, role, isActive, name } = req.body;

    if (role && !INTERNAL_ROLE_MATRIX[role]) {
      return sendError(res, 'Invalid internal role', 400);
    }

    const updateData = {};
    if (permissions) updateData.permissions = permissions;
    if (role) {
      updateData.role = role;
      updateData.permissions = permissions || INTERNAL_ROLE_MATRIX[role];
    }
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (name) updateData.name = name;
    updateData.updatedAt = new Date();

    const result = await db().collection('admin_users').findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: updateData },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    if (!result.value) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, result.value, 'User permissions updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// SUSPEND / REACTIVATE internal user
router.patch('/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const result = await db().collection('admin_users').findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: { isActive: Boolean(isActive), updatedAt: new Date() } },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    if (!result.value) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, result.value, isActive ? 'User reactivated' : 'User suspended');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// RESET internal user password
router.post('/:userId/reset-password', async (req, res) => {
  try {
    const { userId } = req.params;
    const tempPassword = `Replysys@${Math.random().toString(36).slice(-8)}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const result = await db().collection('admin_users').findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          password: hashedPassword,
          mustResetPassword: true,
          updatedAt: new Date(),
        }
      },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    if (!result.value) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, {
      user: result.value,
      temporaryPassword: tempPassword,
    }, 'Temporary password generated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
