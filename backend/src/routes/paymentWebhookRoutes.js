import express from 'express';
import { requireJWT } from '../middlewares/jwtAuth.js';
import logger from '../utils/logger.js';
import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
import {
  handleCashfreeWebhook,
  getPaymentStatus,
  retryPayment
} from '../controllers/paymentWebhookController.js';

const router = express.Router();

/**
 * Public endpoint - Cashfree webhook (no auth required)
 * Cashfree will POST here when payment status changes
 */
router.post('/cashfree', handleCashfreeWebhook);

/**
 * Protected endpoints
 */

// Get payment status by order ID
router.get('/status/:orderId', requireJWT, getPaymentStatus);

// Retry failed payment
router.post('/retry/:orderId', requireJWT, retryPayment);

export default router;
