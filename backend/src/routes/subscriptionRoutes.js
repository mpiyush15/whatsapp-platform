import express from 'express';
import * as subscriptionController from '../controllers/subscriptionController.js';
import { requireJWT } from '../middlewares/jwtAuth.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

/**
 * PROTECTED ROUTES - Requires JWT
 */

// Superadmin routes (must be before generic routes)
router.get('/', requireJWT, subscriptionController.getAllSubscriptions);

// Payment/Checkout routes
router.post('/create-order', requireJWT, subscriptionController.createOrder);
router.post('/verify-payment', requireJWT, subscriptionController.verifyPayment);
router.get('/payments', requireJWT, subscriptionController.getPayments);  // Get user's payments/invoices
router.get('/credits', requireJWT, subscriptionController.getCredits);  // Get user's credit balance and ledger
router.get('/usage', requireJWT, subscriptionController.getUsageStats);  // Get usage and quota metrics for UI meters
router.get('/triggers', requireJWT, subscriptionController.getBillingTriggers);  // Get low-credit + renewal trigger states
router.post('/credits/adjust', requireJWT, subscriptionController.adjustCredits);  // Internal admin credit adjustments

// Credit pack routes
router.get('/credit-packs', requireJWT, subscriptionController.getCreditPacks);  // Get available credit packs + settings
router.post('/buy-credits', requireJWT, subscriptionController.buyCredits);  // Initiate credit purchase with Cashfree

// 🔴 Pending Transaction routes
router.get('/pending-transactions', requireJWT, subscriptionController.getPendingTransactions);  // Client pending transactions
router.get('/all-pending-transactions', requireJWT, subscriptionController.getAllPendingTransactions);  // Superadmin all pending

// User subscription routes
router.get('/my-subscriptions', requireJWT, subscriptionController.getMySubscription);
router.post('/my-subscriptions', requireJWT, subscriptionController.getMySubscription);  // POST version for client calls
router.get('/my-subscription', requireJWT, subscriptionController.getMySubscription);
router.post('/my-subscription', requireJWT, subscriptionController.getMySubscription);  // POST version for client calls
router.post('/create', requireJWT, subscriptionController.createSubscription);
router.post('/change-plan', requireJWT, subscriptionController.changePlan);
router.post('/cancel', requireJWT, subscriptionController.cancelSubscription);
router.post('/pause', requireJWT, subscriptionController.pauseSubscription);
router.post('/resume', requireJWT, subscriptionController.resumeSubscription);
router.patch('/:id/status', requireJWT, subscriptionController.updateSubscriptionStatus);
router.get('/:subscriptionId/transactions', requireJWT, subscriptionController.getSubscriptionTransactions);  // Get transactions for a subscription

export default router;
