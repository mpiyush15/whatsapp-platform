import express from 'express';
import multer from 'multer';
import messageController from '../controllers/messageController.js';
import { resolvePhoneNumber } from '../middlewares/phoneNumberHelper.js';
import { messageLimiter } from '../middlewares/rateLimiter.js';
import validators from '../middlewares/validators.js';
import handleMulterError from '../middlewares/multerErrorHandler.js';
import { attachDefaultProject, checkProjectQuota, validateProjectFromQuery } from '../middleware/projectAuth.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

// Configure multer for memory storage (files stored in buffer)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 16 * 1024 * 1024 // 16MB limit (WhatsApp requirement)
  }
});

/**
 * Message Routes
 * Handles message sending and retrieval
 * Note: All routes use resolvePhoneNumber middleware to auto-detect phone number from API key
 */

// Send messages (phoneNumberId is optional - will auto-detect from account)
router.post('/send', attachDefaultProject, checkProjectQuota('message'), messageLimiter, validators.validateSendMessage, resolvePhoneNumber, messageController.sendTextMessage);
router.post('/send-template', attachDefaultProject, checkProjectQuota('message'), messageLimiter, validators.validateSendTemplateMessage, resolvePhoneNumber, messageController.sendTemplateMessage);
router.post('/send-media', attachDefaultProject, checkProjectQuota('message'), messageLimiter, upload.single('file'), handleMulterError, resolvePhoneNumber, messageController.sendMediaMessage);

// Get messages
router.get('/', validateProjectFromQuery, messageController.getMessages);
router.get('/:id', validateProjectFromQuery, messageController.getMessage);

// Failed messages
router.get('/failed/list', validateProjectFromQuery, messageController.getFailedMessages);
router.post('/failed/:failedMessageId/retry', messageController.retryFailedMessage);
router.delete('/failed/:failedMessageId', messageController.deleteFailedMessage);

export default router;
