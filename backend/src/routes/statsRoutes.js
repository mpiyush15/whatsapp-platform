import express from 'express';
import statsController from '../controllers/statsController.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
import { validateProjectFromQuery } from '../middleware/projectAuth.js';
const router = express.Router();

/**
 * Stats Routes
 * Provides analytics and statistics
 */

router.get('/', validateProjectFromQuery, statsController.getStats);
router.get('/daily', validateProjectFromQuery, statsController.getDailyStats);

export default router;
