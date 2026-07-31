import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import templateController from '../controllers/templateController.js';
import { createTemplateLimiter, submitTemplateLimiter } from '../middlewares/rateLimiter.js';
import validators from '../middlewares/validators.js';
import handleMulterError from '../middlewares/multerErrorHandler.js';
import { checkPlanLimit } from '../middlewares/checkPlanLimit.js';
import { validateProjectFromQuery } from '../middleware/projectAuth.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// Setup multer for file uploads
const uploadsDir = path.join(__dirname, '../../uploads/templates');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 16 * 1024 * 1024 } // 16MB limit
});

/**
 * Template Routes
 * All routes require authentication
 */

router.get('/', validateProjectFromQuery, templateController.getTemplates);
router.get('/:id', validateProjectFromQuery, validators.validateObjectId, templateController.getTemplate);
router.get('/:id/debug', validators.validateObjectId, templateController.getTemplateDebug);
router.post('/', checkPlanLimit('template'), createTemplateLimiter, upload.single('mediaFile'), handleMulterError, validators.validateCreateTemplate, templateController.createTemplate);
router.post('/sync', templateController.syncTemplates);
router.post('/:id/submit', submitTemplateLimiter, validators.validateObjectId, templateController.submitTemplateToMeta);
router.put('/:id', validators.validateObjectId, upload.single('mediaFile'), handleMulterError, templateController.updateTemplate);
router.post('/:id/duplicate', validators.validateObjectId, templateController.duplicateTemplate);
router.delete('/:id', validators.validateObjectId, templateController.deleteTemplate);

export default router;
