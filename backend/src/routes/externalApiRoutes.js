/**
 * External API Routes (for third-party integrations and API clients)
 * 
 * Auth: API Key (wpk_live_ prefix) via requireApiKey middleware
 * 
 * Purpose: Allow external apps to send messages, manage contacts, create broadcasts, etc.
 * 
 * Usage:
 *   Authorization: Bearer wpk_live_xxxxx
 *   OR
 *   X-API-Key: wpk_live_xxxxx
 * 
 * Routes:
 *   POST   /api/external/messages/send         - Send text message
 *   POST   /api/external/messages/send-template - Send template message
 *   POST   /api/external/messages/send-media   - Send media message
 *   GET    /api/external/messages              - List messages
 *   
 *   POST   /api/external/contacts              - Create contact
 *   GET    /api/external/contacts              - List contacts
 *   GET    /api/external/contacts/:id          - Get contact details
 *   PUT    /api/external/contacts/:id          - Update contact
 *   DELETE /api/external/contacts/:id          - Delete contact
 *   
 *   POST   /api/external/broadcasts            - Send broadcast
 *   GET    /api/external/broadcasts            - List broadcasts
 *   GET    /api/external/broadcasts/:id        - Get broadcast details
 *   
 *   GET    /api/external/health                - Health check
 *   GET    /api/external/account/config        - Get account configuration
 */

import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { requireApiKey, requireApiScope } from '../middlewares/apiKeyAuth.js';
import { apiRateLimiter } from '../middlewares/apiRateLimiter.js';
import WebhookEndpoint from '../models/WebhookEndpoint.js';
import { dispatchWebhookEvent } from '../services/webhookDispatcherService.js';

// Import controllers
import * as messageController from '../controllers/messageController.js';
import * as contactController from '../controllers/contactController.js';
import * as broadcastController from '../controllers/broadcastController.js';
import * as accountController from '../controllers/accountController.js';

// Import middleware
import { resolvePhoneNumber } from '../middlewares/phoneNumberHelper.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

// Apply API Key auth to ALL external routes
router.use(requireApiKey);
router.use(apiRateLimiter);

// Configure multer for media uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 16 * 1024 * 1024 // 16MB limit (WhatsApp requirement)
  }
});

// ============================================
// MESSAGE ROUTES
// ============================================

/**
 * POST /api/external/messages/send
 * Send a text message via API Key
 * 
 * Body:
 * {
 *   "phoneNumber": "+1234567890",
 *   "message": "Hello world!"
 * }
 */
router.post('/messages/send', requireApiScope('messages:write'), resolvePhoneNumber, messageController.sendTextMessage);

/**
 * POST /api/external/messages/send-template
 * Send a template message via API Key
 * 
 * Body:
 * {
 *   "phoneNumber": "+1234567890",
 *   "templateName": "hello_world",
 *   "templateLanguage": "en"
 * }
 */
router.post('/messages/send-template', requireApiScope('messages:write'), resolvePhoneNumber, messageController.sendTemplateMessage);

/**
 * POST /api/external/messages/send-media
 * Send a media message via API Key
 * 
 * FormData:
 * - file: binary file
 * - phoneNumber: recipient phone
 * - mediaType: image | video | document
 * - caption: (optional) media caption
 */
router.post('/messages/send-media', requireApiScope('messages:write'), upload.single('file'), resolvePhoneNumber, messageController.sendMediaMessage);

/**
 * GET /api/external/messages
 * List all messages for the account
 * Query params: ?limit=50&offset=0&phoneNumber=xxx
 */
router.get('/messages', requireApiScope('messages:read'), messageController.getMessages);

/**
 * GET /api/external/messages/:id
 * Get a specific message
 */
router.get('/messages/:id', requireApiScope('messages:read'), messageController.getMessage);

// ============================================
// CONTACT ROUTES
// ============================================

/**
 * POST /api/external/contacts
 * Create a new contact
 * 
 * Body:
 * {
 *   "name": "John Doe",
 *   "phoneNumber": "+1234567890",
 *   "email": "john@example.com",
 *   "tags": ["vip", "customer"]
 * }
 */
router.post('/contacts', requireApiScope('contacts:write'), contactController.createContact);

/**
 * GET /api/external/contacts
 * List all contacts
 * Query params: ?limit=50&offset=0&search=john
 */
router.get('/contacts', requireApiScope('contacts:read'), contactController.getContacts);

/**
 * GET /api/external/contacts/:id
 * Get a specific contact
 */
router.get('/contacts/:id', requireApiScope('contacts:read'), contactController.getContacts);

/**
 * PUT /api/external/contacts/:id
 * Update a contact
 * 
 * Body:
 * {
 *   "name": "Jane Doe",
 *   "email": "jane@example.com",
 *   "tags": ["vip"]
 * }
 */
router.put('/contacts/:id', requireApiScope('contacts:write'), contactController.updateContact);

/**
 * DELETE /api/external/contacts/:id
 * Delete a contact
 */
router.delete('/contacts/:id', requireApiScope('contacts:write'), contactController.deleteContact);

// ============================================
// BROADCAST ROUTES
// ============================================

/**
 * POST /api/external/broadcasts
 * Send a broadcast message
 * 
 * Body:
 * {
 *   "templateName": "promotional",
 *   "templateLanguage": "en",
 *   "recipientPhones": ["+1234567890", "+0987654321"],
 *   "scheduledFor": "2025-12-25T10:00:00Z" (optional)
 * }
 */
router.post('/broadcasts', requireApiScope('broadcasts:write'), broadcastController.createBroadcast);

/**
 * GET /api/external/broadcasts
 * List all broadcasts
 * Query params: ?limit=50&offset=0&status=pending
 */
router.get('/broadcasts', requireApiScope('broadcasts:read'), broadcastController.getBroadcasts);

/**
 * GET /api/external/broadcasts/:id
 * Get broadcast details
 */
router.get('/broadcasts/:id', requireApiScope('broadcasts:read'), broadcastController.getBroadcastById);

/**
 * GET /api/external/broadcasts/:id/status
 * Get broadcast delivery status
 */
router.get('/broadcasts/:id/status', requireApiScope('broadcasts:read'), broadcastController.getBroadcastStats);

// ============================================
// ACCOUNT & HEALTH ROUTES
// ============================================

/**
 * GET /api/external/health
 * Health check - verify API key is valid
 * 
 * Response:
 * {
 *   "success": true,
 *   "status": "healthy",
 *   "account": "AccountID",
 *   "timestamp": "2025-02-27T10:00:00Z"
 * }
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    account: req.account.accountId,
    authType: req.authType,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/external/account/config
 * Get account configuration
 * 
 * Response:
 * {
 *   "name": "Account Name",
 *   "email": "account@example.com",
 *   "plan": "pro",
 *   "status": "active",
 *   "phoneNumbers": [...],
 *   "templates": [...]
 * }
 */
router.get('/account/config', async (req, res) => {
  try {
    // Return basic account config (non-sensitive data only)
    res.json({
      success: true,
      data: {
        name: req.account.name,
        email: req.account.email,
        plan: req.account.plan,
        status: req.account.status,
        accountId: req.account.accountId
      }
    });
  } catch (error) {
    logger.error('❌ Error fetching account config:', error);
    res.status(500).json({
      success: false,
      code: 'ACCOUNT_CONFIG_ERROR',
      message: 'Failed to fetch account configuration'
    });
  }
});

// ============================================
// WEBHOOK ENDPOINT ROUTES
// ============================================

const DEFAULT_EVENTS = ['message.received', 'conversation.assigned', 'contact.created', 'broadcast.completed'];

router.get('/webhooks', requireApiScope('webhooks:write'), async (req, res) => {
  try {
    const list = await WebhookEndpoint.find({
      accountId: req.account.accountId,
      ...(req.projectId ? { $or: [{ projectId: req.projectId }, { projectId: null }] } : {}),
    })
      .sort({ createdAt: -1 })
      .select('-secret');

    return res.json({ success: true, data: { webhooks: list } });
  } catch (error) {
    logger.error('list webhooks error', error);
    return res.status(500).json({ success: false, message: 'Failed to list webhooks' });
  }
});

router.post('/webhooks', requireApiScope('webhooks:write'), async (req, res) => {
  try {
    const { name, url, events, enabled = true, secret } = req.body || {};
    if (!name || !url) {
      return res.status(400).json({ success: false, message: 'name and url are required' });
    }

    const webhookSecret = String(secret || `whsec_${crypto.randomBytes(16).toString('hex')}`);

    const created = await WebhookEndpoint.create({
      accountId: req.account.accountId,
      projectId: req.projectId || null,
      apiKeyId: req.apiKeyId || null,
      name: String(name),
      url: String(url),
      secret: webhookSecret,
      events: Array.isArray(events) && events.length > 0 ? events : DEFAULT_EVENTS,
      enabled: Boolean(enabled),
    });

    return res.status(201).json({
      success: true,
      data: {
        webhook: {
          _id: created._id,
          accountId: created.accountId,
          projectId: created.projectId,
          name: created.name,
          url: created.url,
          events: created.events,
          enabled: created.enabled,
          createdAt: created.createdAt,
        },
        secret: webhookSecret,
      },
      message: 'Webhook endpoint created',
    });
  } catch (error) {
    logger.error('create webhook error', error);
    return res.status(500).json({ success: false, message: 'Failed to create webhook endpoint' });
  }
});

router.post('/webhooks/register', requireApiScope('webhooks:write'), async (req, res) => {
  return res.redirect(307, `${req.baseUrl}/webhooks`);
});

router.patch('/webhooks/:id', requireApiScope('webhooks:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, events, enabled } = req.body || {};

    const updated = await WebhookEndpoint.findOneAndUpdate(
      { _id: id, accountId: req.account.accountId },
      {
        ...(name !== undefined ? { name: String(name) } : {}),
        ...(url !== undefined ? { url: String(url) } : {}),
        ...(Array.isArray(events) ? { events } : {}),
        ...(enabled !== undefined ? { enabled: Boolean(enabled) } : {}),
      },
      { new: true }
    ).select('-secret');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Webhook endpoint not found' });
    }

    return res.json({ success: true, data: { webhook: updated }, message: 'Webhook endpoint updated' });
  } catch (error) {
    logger.error('update webhook error', error);
    return res.status(500).json({ success: false, message: 'Failed to update webhook endpoint' });
  }
});

router.delete('/webhooks/:id', requireApiScope('webhooks:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await WebhookEndpoint.findOneAndDelete({ _id: id, accountId: req.account.accountId });
    if (!removed) {
      return res.status(404).json({ success: false, message: 'Webhook endpoint not found' });
    }
    return res.json({ success: true, data: { id }, message: 'Webhook endpoint deleted' });
  } catch (error) {
    logger.error('delete webhook error', error);
    return res.status(500).json({ success: false, message: 'Failed to delete webhook endpoint' });
  }
});

router.post('/webhooks/:id/test', requireApiScope('webhooks:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const endpoint = await WebhookEndpoint.findOne({ _id: id, accountId: req.account.accountId });
    if (!endpoint) {
      return res.status(404).json({ success: false, message: 'Webhook endpoint not found' });
    }

    const result = await dispatchWebhookEvent({
      accountId: req.account.accountId,
      projectId: endpoint.projectId || req.projectId || null,
      eventType: 'webhook.test',
      payload: {
        webhookId: String(endpoint._id),
        byApiKey: String(req.apiKeyId || ''),
      },
      source: 'external-api',
    });

    return res.json({ success: true, data: result, message: 'Webhook test dispatched' });
  } catch (error) {
    logger.error('webhook test error', error);
    return res.status(500).json({ success: false, message: 'Failed to dispatch webhook test event' });
  }
});

// Explicit event dispatch endpoint for integrations that need immediate callback fanout tests
router.post('/events/dispatch', requireApiScope('webhooks:write'), async (req, res) => {
  try {
    const { eventType, payload = {} } = req.body || {};
    if (!eventType) {
      return res.status(400).json({ success: false, message: 'eventType is required' });
    }

    const result = await dispatchWebhookEvent({
      accountId: req.account.accountId,
      projectId: req.projectId || null,
      eventType: String(eventType),
      payload,
      source: 'external-api',
    });

    return res.json({ success: true, data: result, message: 'Event dispatched' });
  } catch (error) {
    logger.error('event dispatch error', error);
    return res.status(500).json({ success: false, message: 'Failed to dispatch event' });
  }
});

export default router;
