import express from 'express';
import contactController from '../controllers/contactController.js';
import { contactLimiter } from '../middlewares/rateLimiter.js';
import validators from '../middlewares/validators.js';
import { attachDefaultProject, checkProjectQuota, validateProjectFromQuery } from '../middleware/projectAuth.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

/**
 * Contact Routes
 * Handles contact management
 */

// Specific GET routes (must come before /:id routes)
router.get('/fetch-from-chats', validateProjectFromQuery, contactController.fetchContactsFromChats);
router.get('/by-phone/:whatsappNumber', validateProjectFromQuery, contactController.getContactByPhone);

// CRUD operations
router.get('/', validateProjectFromQuery, contactController.getContacts);
router.get('/:id', validateProjectFromQuery, validators.validateObjectId, contactController.getContact);
router.post('/', attachDefaultProject, checkProjectQuota('contact'), contactLimiter, validators.validateCreateContact, contactController.createContact);
router.put('/:id', validators.validateUpdateContact, contactController.updateContact);
router.delete('/:id', validators.validateObjectId, contactController.deleteContact);

// Bulk operations
router.post('/import', attachDefaultProject, checkProjectQuota('contact'), contactLimiter, contactController.importContacts);
router.post('/bulk-update', contactController.bulkUpdateContacts);

// Timeline (activity log) - must come before /:id routes
router.get('/:id/timeline', validators.validateObjectId, contactController.getContactTimeline);

export default router;
