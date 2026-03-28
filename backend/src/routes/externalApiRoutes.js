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
import { requireApiKey } from '../middlewares/apiKeyAuth.js';

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
router.post('/messages/send', resolvePhoneNumber, messageController.sendTextMessage);

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
router.post('/messages/send-template', resolvePhoneNumber, messageController.sendTemplateMessage);

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
router.post('/messages/send-media', upload.single('file'), resolvePhoneNumber, messageController.sendMediaMessage);

/**
 * GET /api/external/messages
 * List all messages for the account
 * Query params: ?limit=50&offset=0&phoneNumber=xxx
 */
router.get('/messages', messageController.getMessages);

/**
 * GET /api/external/messages/:id
 * Get a specific message
 */
router.get('/messages/:id', messageController.getMessage);

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
router.post('/contacts', contactController.createContact);

/**
 * GET /api/external/contacts
 * List all contacts
 * Query params: ?limit=50&offset=0&search=john
 */
router.get('/contacts', contactController.getContacts);

/**
 * GET /api/external/contacts/:id
 * Get a specific contact
 */
router.get('/contacts/:id', contactController.getContacts);

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
router.put('/contacts/:id', contactController.updateContact);

/**
 * DELETE /api/external/contacts/:id
 * Delete a contact
 */
router.delete('/contacts/:id', contactController.deleteContact);

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
router.post('/broadcasts', broadcastController.createBroadcast);

/**
 * GET /api/external/broadcasts
 * List all broadcasts
 * Query params: ?limit=50&offset=0&status=pending
 */
router.get('/broadcasts', broadcastController.getBroadcasts);

/**
 * GET /api/external/broadcasts/:id
 * Get broadcast details
 */
router.get('/broadcasts/:id', broadcastController.getBroadcastById);

/**
 * GET /api/external/broadcasts/:id/status
 * Get broadcast delivery status
 */
router.get('/broadcasts/:id/status', broadcastController.getBroadcastStats);

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

export default router;
