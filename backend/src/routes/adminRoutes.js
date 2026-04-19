import express from 'express';
import { requireJWT } from '../middlewares/jwtAuth.js';
import logger from '../utils/logger.js';
import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
import {
  getOrganizations,
  getPendingUsers,
  sendPaymentReminder,
  sendReminderAllPending,
  changeUserStatus,
  insertOldCashfreeOrders,
  getTransactions,
  syncCashfreeTransactions,
  activateAccount
} from '../controllers/adminController.js';

const router = express.Router();

// All routes require JWT authentication
router.use(requireJWT);

/**
 * GET /api/admin/organizations
 * List all organizations with status, subscriptions, and invoices (superadmin only)
 */
router.get('/organizations', getOrganizations);

/**
 * GET /api/admin/pending-users
 * List all accounts with pending payment (superadmin only)
 */
router.get('/pending-users', getPendingUsers);

/**
 * POST /api/admin/send-payment-reminder
 * Send payment reminder to a specific pending user (superadmin only)
 */
router.post('/send-payment-reminder', sendPaymentReminder);

/**
 * POST /api/admin/send-reminder-all-pending
 * Send payment reminders to all pending users (superadmin only)
 */
router.post('/send-reminder-all-pending', sendReminderAllPending);

/**
 * POST /api/admin/change-user-status
 * Change user status from pending to active (superadmin only)
 */
router.post('/change-user-status', changeUserStatus);

/**
 * POST /api/admin/insert-old-cashfree-orders
 * Insert old Cashfree orders for testing sync (superadmin only)
 */
router.post('/insert-old-cashfree-orders', insertOldCashfreeOrders);

/**
 * GET /api/admin/transactions
 * Get all platform transactions (superadmin only)
 */
router.get('/transactions', getTransactions);

/**
 * POST /api/admin/sync-cashfree
 * Sync transactions from Cashfree API (superadmin only)
 */
router.post('/sync-cashfree', syncCashfreeTransactions);

/**
 * POST /api/admin/accounts/:accountId/activate
 * Manually activate account & create subscription + invoice + send email (superadmin only)
 */
router.post('/accounts/:accountId/activate', activateAccount);

export default router;
