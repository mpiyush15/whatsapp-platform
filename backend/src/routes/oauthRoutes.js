import express from 'express'
import { requireJWT } from '../middlewares/jwtAuth.js'
import logger from '../utils/logger.js';
import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
import {
  handleWhatsAppOAuth,
  getWhatsAppStatus,
  disconnectWhatsApp
} from '../controllers/oauthController.js'

const router = express.Router()

/**
 * POST /api/integrations/whatsapp/oauth
 * Exchange OAuth code for access token + phone numbers
 * Requires: JWT authentication
 * Body: { code, state }
 */
router.post('/whatsapp/oauth', requireJWT, handleWhatsAppOAuth)

/**
 * POST /api/integrations/whatsapp/oauth/callback
 * Handle OAuth redirect callback - exchange code immediately
 * Requires: JWT authentication
 * Body: { code, state }
 */
router.post('/whatsapp/oauth/callback', requireJWT, handleWhatsAppOAuth)

/**
 * GET /api/integrations/whatsapp/status
 * Get current WhatsApp connection status
 * Requires: JWT authentication
 * Returns: List of connected phone numbers
 */
router.get('/whatsapp/status', requireJWT, getWhatsAppStatus)

/**
 * POST /api/integrations/whatsapp/disconnect
 * Disconnect WhatsApp (mark phones inactive)
 * Requires: JWT authentication
 */
router.post('/whatsapp/disconnect', requireJWT, disconnectWhatsApp)

export default router
