import express from 'express'
import { requireJWT } from '../middlewares/jwtAuth.js'
import {
  exchangeCodeForToken,
  selectPhoneNumber,
  getConnectedPhones,
  disconnectWhatsApp
} from '../controllers/oauthController.js'

const router = express.Router()

/**
 * POST /api/integrations/whatsapp/exchange
 * Exchange OAuth code for access token + fetch WABAs + phones
 * Frontend calls this after user authorizes
 */
router.post('/whatsapp/exchange', requireJWT, exchangeCodeForToken)

/**
 * POST /api/integrations/whatsapp/select-phone
 * User selects a phone number from the list
 */
router.post('/whatsapp/select-phone', requireJWT, selectPhoneNumber)

/**
 * GET /api/integrations/whatsapp/phones
 * Get all connected phone numbers
 */
router.get('/whatsapp/phones', requireJWT, getConnectedPhones)

/**
 * POST /api/integrations/whatsapp/disconnect
 * Disconnect WhatsApp
 */
router.post('/whatsapp/disconnect', requireJWT, disconnectWhatsApp)

export default router
