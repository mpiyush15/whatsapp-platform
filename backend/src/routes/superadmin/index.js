/**
 * SUPERADMIN ROUTES
 * Protected by: tenantAuth + superadminOnly middleware
 * Access: Only superadmin (accountId: 'admin')
 */

import express from 'express';
import { superadminOnly } from '../../middleware/tenantAuth.js';

const router = express.Router();

// Subroutes
import customersRoutes from './customers.js';
import plansRoutes from './plans.js';
import paymentsRoutes from './payments.js';
import invoicesRoutes from './invoices.js';
import analyticsRoutes from './analytics.js';
import settingsRoutes from './settings.js';
import usersRoutes from './users.js';
import campaignsRoutes from './campaigns.js';

// Mount subroutes with superadmin protection
router.use('/customers', superadminOnly, customersRoutes);
router.use('/plans', superadminOnly, plansRoutes);
router.use('/payments', superadminOnly, paymentsRoutes);
router.use('/invoices', superadminOnly, invoicesRoutes);
router.use('/analytics', superadminOnly, analyticsRoutes);
router.use('/settings', superadminOnly, settingsRoutes);
router.use('/users', superadminOnly, usersRoutes);
router.use('/campaigns', superadminOnly, campaignsRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    role: 'superadmin',
    accountId: req.user?.accountId
  });
});

export default router;
