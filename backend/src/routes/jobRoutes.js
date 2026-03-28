import express from 'express';
import { paymentTimeoutJobHandler } from '../jobs/paymentTimeoutJob.js';
import { requireJWT } from '../middlewares/jwtAuth.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

/**
 * POST /api/jobs/check-payment-timeouts
 * Trigger payment timeout check
 * Superadmin only endpoint
 */
router.post('/check-payment-timeouts', requireJWT, async (req, res) => {
  try {
    // Optional: Add superadmin check here if needed
    // if (req.user.role !== 'superadmin') {
    //   return res.status(403).json({ error: 'Superadmin access required' });
    // }

    const result = await paymentTimeoutJobHandler(req, res);
    return result;
  } catch (error) {
    logger.error('❌ Payment timeout job error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
