import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { sendSuccess, sendValidationError } from '../../utils/responseHandler.js';
import { handleControllerError } from '../../utils/errorHandler.js';
import { AccountType } from '../../constants/enums.js';
import logger from '../../utils/logger.js';
import { JWT_SECRET } from '../../config/jwt.js';

const router = express.Router();

/**
 * SUPERADMIN LOGIN
 * POST /api/auth/superadmin/login
 * Only ReplySQL admins can login here
 */
export const superadminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return sendValidationError(res, 'Email and password required');
    }

    const db = mongoose.connection.db;

    // Find superadmin account
    const account = await db.collection('accounts').findOne({
      email,
      type: AccountType.INTERNAL // Only superadmins are INTERNAL
    });

    if (!account) {
      return sendValidationError(res, 'Invalid credentials');
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, account.password);
    if (!passwordMatch) {
      return sendValidationError(res, 'Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        accountId: String(account.accountId ?? ''),
        name: account.name,
        type: AccountType.INTERNAL,
        email: account.email,
        role: account.role || 'superadmin'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info(`Superadmin login: ${email}`);

    return sendSuccess(
      res,
      {
        token,
        user: {
          accountId: account.accountId,
          email: account.email,
          name: account.name,
          type: AccountType.INTERNAL
        }
      },
      'Superadmin login successful'
    );
  } catch (error) {
    return handleControllerError(res, error, 'superadminLogin');
  }
};

/**
 * CLIENT LOGIN
 * POST /api/auth/client/login
 * Clients login here with accountId isolation
 */
export const clientLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return sendValidationError(res, 'Email and password required');
    }

    const db = mongoose.connection.db;

    // Find client account
    const account = await db.collection('accounts').findOne({
      email,
      type: AccountType.CLIENT // Only clients are CLIENT type
    });

    if (!account) {
      return sendValidationError(res, 'Invalid credentials');
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, account.password);
    if (!passwordMatch) {
      return sendValidationError(res, 'Invalid credentials');
    }

    // Check if account is active
    if (account.status !== 'active') {
      return sendValidationError(res, 'Account is not active');
    }

    // Generate JWT token with accountId
    const token = jwt.sign(
      {
        accountId: String(account.accountId ?? ''),
        name: account.name,
        type: AccountType.CLIENT,
        email: account.email,
        role: account.role || 'user'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info(`Client login: ${email} (accountId: ${account.accountId})`);

    return sendSuccess(
      res,
      {
        token,
        user: {
          accountId: account.accountId,
          email: account.email,
          name: account.name,
          type: AccountType.CLIENT,
          companyName: account.companyName
        }
      },
      'Client login successful'
    );
  } catch (error) {
    return handleControllerError(res, error, 'clientLogin');
  }
};

/**
 * REFRESH TOKEN
 * POST /api/auth/refresh-token
 * Get new token before expiry
 */
export const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return sendValidationError(res, 'Token required');
    }

    // Verify old token
    const decoded = jwt.verify(token, JWT_SECRET, {
      ignoreExpiration: true
    });

    // Generate new token
    const newToken = jwt.sign(
      {
        accountId: String(decoded.accountId ?? ''),
        name: decoded.name,
        type: decoded.type,
        email: decoded.email,
        role: decoded.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return sendSuccess(
      res,
      { token: newToken },
      'Token refreshed'
    );
  } catch (error) {
    return handleControllerError(res, error, 'refreshToken');
  }
};

// Export functions
export default {
  superadminLogin,
  clientLogin,
  refreshToken
};
