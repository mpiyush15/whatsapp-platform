import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { 
  createPaymentOrder, 
  verifyPayment, 
  handlePaymentWebhook,
  getInvoice 
} from '../controllers/cashfreePaymentController.js';
import { requireJWT } from '../middlewares/jwtAuth.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

/**
 * PUBLIC ROUTES (no auth needed)
 */

// Cashfree webhook (called by payment gateway)
router.post('/webhook/confirm', handlePaymentWebhook);

// Legacy payment webhook (keep for backward compatibility)
router.post('/webhook/confirm', paymentController.confirmPayment);

/**
 * PROTECTED ROUTES (require authentication)
 */
router.use(requireJWT);

// Cashfree payment flow
router.post('/create-order', requireJWT, createPaymentOrder);
router.post('/verify', requireJWT, verifyPayment);
router.get('/invoice/:orderId', requireJWT, getInvoice);

// Legacy payment routes
router.post('/initiate', paymentController.initiatePayment);
router.get('/my-payments', paymentController.getMyPayments);
router.get('/:paymentId', paymentController.getPaymentDetails);
router.post('/:paymentId/refund', paymentController.refundPayment);

// Superadmin routes
router.get('/', paymentController.getAllPayments);
router.get('/stats/overview', paymentController.getPaymentStats);
router.post('/sync/cashfree', paymentController.syncCashfreePayments);
router.post('/sync/real-transactions', paymentController.syncRealTransactions);

export default router;
