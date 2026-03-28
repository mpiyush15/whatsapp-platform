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

// GET all admin users (superadmin only)
router.get('/', async (req, res) => {
  try {
    const users = await db().collection('admin_users').find({}).projection({ password: 0 }).toArray();
    return sendSuccess(res, users, 'Admin users');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// CREATE admin user (superadmin only)
router.post('/', async (req, res) => {
  try {
    const { email, name, password, role = 'moderator' } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password required', 400);
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
      permissions: [],
      createdAt: new Date()
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
    const { permissions, role } = req.body;

    const updateData = {};
    if (permissions) updateData.permissions = permissions;
    if (role) updateData.role = role;
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

export default router;
