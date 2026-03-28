/**
 * Billing Routes - Subscription, Invoices, and Billing Management
 */

import express from 'express';
import * as billingController from '../controllers/billingController.js';
import { requireJWT } from '../middlewares/jwtAuth.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

/**
 * Subscription Management
 */

// Create subscription after payment
router.post('/subscriptions', requireJWT, billingController.createSubscription);

// Get user's subscriptions
router.get('/subscriptions', requireJWT, billingController.getMySubscriptions);

// Change/Upgrade/Downgrade plan
router.put('/subscriptions/:subscriptionId/change-plan', requireJWT, billingController.changePlan);

// Cancel subscription
router.post('/subscriptions/:subscriptionId/cancel', requireJWT, billingController.cancelSubscription);

/**
 * Invoices & Billing History
 */

// Get all invoices (superadmin only)
router.get('/admin/invoices', requireJWT, billingController.getAllInvoices);

// Get billing history
router.get('/invoices', requireJWT, billingController.getBillingHistory);

// Get specific invoice
router.get('/invoices/:invoiceId', requireJWT, billingController.getInvoice);

// Download invoice (redirect to S3 signed URL)
router.get('/invoices/:invoiceId/download', requireJWT, billingController.downloadInvoice);

/**
 * Billing Dashboard
 */

// Get billing stats
router.get('/stats', requireJWT, billingController.getBillingStats);

/**
 * ✅ CLIENT ONBOARDING: Revenue Analytics
 */
router.get('/admin/revenue/summary', requireJWT, billingController.getRevenueSummary);
router.get('/admin/revenue/monthly', requireJWT, billingController.getMonthlyRevenue);

/**
 * Account Dashboard - Usage, Payments, Transactions
 */
router.get('/usage', requireJWT, billingController.getUsageMetrics);
router.get('/payment-methods', requireJWT, billingController.getPaymentMethods);
router.get('/transactions', requireJWT, billingController.getTransactions);

export default router;
