import express from 'express';
import {
  createBroadcast,
  getBroadcasts,
  getBroadcastById,
  updateBroadcast,
  startBroadcast,
  cancelBroadcast,
  getBroadcastStats,
  deleteBroadcast
} from '../controllers/broadcastController.js';
import { broadcastLimiter } from '../middlewares/rateLimiter.js';
import validators from '../middlewares/validators.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

// Broadcast routes
// Simpler routes (accountId from JWT middleware)
router.get('/', getBroadcasts);
router.post('/', broadcastLimiter, validators.validateCreateBroadcast, createBroadcast);
router.get('/:broadcastId', validators.validateObjectId, getBroadcastById);
router.delete('/:broadcastId', validators.validateObjectId, deleteBroadcast);
router.post('/:broadcastId/start', broadcastLimiter, validators.validateObjectId, startBroadcast);
router.post('/:broadcastId/cancel', cancelBroadcast);
router.get('/:broadcastId/stats', getBroadcastStats);

// Parameterized routes (with explicit phoneNumberId)
router.post('/:accountId/:phoneNumberId/broadcasts', broadcastLimiter, createBroadcast);
router.get('/:accountId/:phoneNumberId/broadcasts', getBroadcasts);
router.get('/:accountId/broadcasts/:broadcastId', getBroadcastById);
router.put('/:accountId/broadcasts/:broadcastId', updateBroadcast);
router.post('/:accountId/:phoneNumberId/broadcasts/:broadcastId/start', broadcastLimiter, startBroadcast);
router.post('/:accountId/broadcasts/:broadcastId/cancel', cancelBroadcast);
router.get('/:accountId/broadcasts/:broadcastId/stats', getBroadcastStats);

export default router;
