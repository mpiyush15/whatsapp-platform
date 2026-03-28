/**
 * COMPANY ROUTES
 * Special: accountId === '2600000' (ReplySQL official company)
 * Similar to CLIENT but for company's own operations
 */

import express from 'express';
import { tenantAuth } from '../../middleware/tenantAuth.js';

const router = express.Router();

// Subroutes
import messagesRoutes from './messages.js';
import conversationsRoutes from './conversations.js';
import broadcastsRoutes from './broadcasts.js';
import contactsRoutes from './contacts.js';
import analyticsRoutes from './analytics.js';

// Middleware to verify company account
const companyOnly = (req, res, next) => {
  if (req.user?.accountId !== '2600000') {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Company account only'
    });
  }
  next();
};

// Mount subroutes with company protection
router.use('/messages', companyOnly, messagesRoutes);
router.use('/conversations', companyOnly, conversationsRoutes);
router.use('/broadcasts', companyOnly, broadcastsRoutes);
router.use('/contacts', companyOnly, contactsRoutes);
router.use('/analytics', companyOnly, analyticsRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    role: 'company',
    accountId: req.user?.accountId
  });
});

export default router;
