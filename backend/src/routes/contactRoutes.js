import express from 'express';
import contactController from '../controllers/contactController.js';
import { contactLimiter } from '../middlewares/rateLimiter.js';
import validators from '../middlewares/validators.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

/**
 * Contact Routes
 * Handles contact management
 */

// Specific GET routes (must come before /:id routes)
router.get('/fetch-from-chats', contactController.fetchContactsFromChats);
router.get('/by-phone/:whatsappNumber', contactController.getContactByPhone);

// CRUD operations
router.get('/', contactController.getContacts);
router.post('/', contactLimiter, validators.validateCreateContact, contactController.createContact);
router.put('/:id', validators.validateUpdateContact, contactController.updateContact);
router.delete('/:id', validators.validateObjectId, contactController.deleteContact);

// Bulk operations
router.post('/import', contactLimiter, contactController.importContacts);
router.post('/bulk-update', validators.validateObjectId, contactController.bulkUpdateContacts);

// Timeline (activity log) - must come before /:id routes
router.get('/:id/timeline', validators.validateObjectId, contactController.getContactTimeline);

export default router;
