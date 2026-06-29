import express from 'express';
import { connectWhatsApp, getConnectedPhones, disconnectWhatsApp } from '../controllers/whatsappConnectController.js';
import { requireJWT } from '../middlewares/jwtAuth.js';
import { requireSubscription } from '../middlewares/requireSubscription.js';

const router = express.Router();

/**
 * WhatsApp Connection Routes (Flow B - Embedded Signup)
 */

// Connect WhatsApp (receives waba_id + phone_number_id from FINISH event)
router.post('/connect', requireJWT, requireSubscription, connectWhatsApp);

// Get connected phones
router.get('/phones', requireJWT, getConnectedPhones);

// Disconnect WhatsApp
router.post('/disconnect', requireJWT, disconnectWhatsApp);

export default router;
