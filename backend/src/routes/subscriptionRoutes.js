import express from 'express';
import * as subscriptionController from '../controllers/subscriptionController.js';
import { requireJWT } from '../middlewares/jwtAuth.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

/**
 * PROTECTED ROUTES - Requires JWT
 */

// Payment/Checkout routes
router.post('/create-order', requireJWT, subscriptionController.createOrder);
router.post('/verify-payment', requireJWT, subscriptionController.verifyPayment);

// 🔴 Pending Transaction routes
router.get('/pending-transactions', requireJWT, subscriptionController.getPendingTransactions);  // Client pending transactions
router.get('/all-pending-transactions', requireJWT, subscriptionController.getAllPendingTransactions);  // Superadmin all pending

// User subscription routes
router.get('/my-subscription', requireJWT, subscriptionController.getMySubscription);
router.post('/create', requireJWT, subscriptionController.createSubscription);
router.post('/change-plan', requireJWT, subscriptionController.changePlan);
router.post('/cancel', requireJWT, subscriptionController.cancelSubscription);
router.post('/pause', requireJWT, subscriptionController.pauseSubscription);
router.post('/resume', requireJWT, subscriptionController.resumeSubscription);

// Superadmin routes
router.get('/', requireJWT, subscriptionController.getAllSubscriptions);

export default router;
