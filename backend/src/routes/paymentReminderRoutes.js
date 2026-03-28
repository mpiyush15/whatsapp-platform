import express from 'express';
import { requireJWT } from '../middlewares/jwtAuth.js';
import { sendPaymentReminders, getPendingPayments, markReminderSent } from '../controllers/paymentReminderController.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

/**
 * Payment Reminder Routes
 * Admin endpoints for managing payment reminders and pending accounts
 */

/**
 * @route   POST /api/admin/payment-reminders/send
 * @desc    Send payment reminders to all pending accounts
 * @access  Admin only (JWT required)
 */
router.post('/send', requireJWT, sendPaymentReminders);

/**
 * @route   GET /api/admin/payment-reminders/pending
 * @desc    Get all pending payment accounts
 * @access  Admin only (JWT required)
 */
router.get('/pending', requireJWT, getPendingPayments);

/**
 * @route   POST /api/admin/payment-reminders/mark-sent/:accountId
 * @desc    Mark a reminder as sent for an account
 * @access  Admin only (JWT required)
 */
router.post('/mark-sent/:accountId', requireJWT, markReminderSent);

export default router;
