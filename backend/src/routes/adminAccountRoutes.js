/**
 * Account Routes
 * Admin and self-service account management endpoints
 */

import express from 'express';
import logger from '../utils/logger.js';
import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
import {
  createAccount,
  listAccounts,
  getAccount,
  updateAccount,
  deleteAccount,
  regenerateApiKey,
  revokeApiKey,
  getMyAccount,
  regenerateMyApiKey
} from '../controllers/accountController.js';

const router = express.Router();

// ==========================================
// ADMIN ROUTES (requires admin auth)
// ==========================================

/**
 * @route   POST /api/admin/accounts
 * @desc    Create new account with auto-generated API key
 * @access  Admin only
 */
router.post('/', createAccount);

/**
 * @route   GET /api/admin/accounts
 * @desc    List all accounts
 * @access  Admin only
 */
router.get('/', listAccounts);

/**
 * @route   GET /api/admin/accounts/:accountId
 * @desc    Get specific account details
 * @access  Admin only
 */
router.get('/:accountId', getAccount);

/**
 * @route   PATCH /api/admin/accounts/:accountId
 * @desc    Update account details
 * @access  Admin only
 */
router.patch('/:accountId', updateAccount);

/**
 * @route   DELETE /api/admin/accounts/:accountId
 * @desc    Delete account
 * @access  Admin only
 */
router.delete('/:accountId', deleteAccount);

/**
 * @route   POST /api/admin/accounts/:accountId/api-key/regenerate
 * @desc    Regenerate API key for account
 * @access  Admin only
 */
router.post('/:accountId/api-key/regenerate', regenerateApiKey);

/**
 * @route   DELETE /api/admin/accounts/:accountId/api-key
 * @desc    Revoke API key for account
 * @access  Admin only
 */
router.delete('/:accountId/api-key', revokeApiKey);

export default router;
