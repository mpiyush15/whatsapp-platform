/**
 * CLIENT ROUTES
 * Protected by: tenantAuth + clientOnly middleware
 * Access: Regular clients only (accountId: 2600001, 2600002, etc.)
 */

import express from 'express';
import { clientOnly } from '../../middleware/tenantAuth.js';

const router = express.Router();

// Subroutes
import messagesRoutes from './messages.js';
import conversationsRoutes from './conversations.js';
import broadcastsRoutes from './broadcasts.js';
import contactsRoutes from './contacts.js';
import chatbotsRoutes from './chatbots.js';
import templatesRoutes from './templates.js';
import agentsRoutes from './agents.js';
import accountRoutes from './account.js';
import invoicesRoutes from './invoices.js';
import subscriptionRoutes from './subscription.js';
import analyticsRoutes from './analytics.js';

// Mount subroutes with client protection
router.use('/messages', clientOnly, messagesRoutes);
router.use('/conversations', clientOnly, conversationsRoutes);
router.use('/broadcasts', clientOnly, broadcastsRoutes);
router.use('/contacts', clientOnly, contactsRoutes);
router.use('/chatbots', clientOnly, chatbotsRoutes);
router.use('/templates', clientOnly, templatesRoutes);
router.use('/agents', clientOnly, agentsRoutes);
router.use('/account', clientOnly, accountRoutes);
router.use('/invoices', clientOnly, invoicesRoutes);
router.use('/subscription', clientOnly, subscriptionRoutes);
router.use('/analytics', clientOnly, analyticsRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    role: 'client',
    accountId: req.user?.accountId
  });
});

export default router;
