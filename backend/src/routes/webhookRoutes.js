import express from 'express';
import webhookController from '../controllers/webhookController.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

/**
 * Webhook Routes for WhatsApp Cloud API
 * NO AUTHENTICATION REQUIRED - Verified by token
 */

// GET - Webhook verification (Meta calls this to verify your endpoint)
router.get('/whatsapp', webhookController.verifyWebhook);

// POST - Webhook handler (receives incoming messages and status updates)
router.post('/whatsapp', webhookController.handleWebhook);

export default router;
