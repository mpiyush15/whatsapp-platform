import express from 'express';
import multer from 'multer';
import * as mediaLibraryController from '../controllers/mediaLibraryController.js';
import { validateProjectFromQuery } from '../middleware/projectAuth.js';

const router = express.Router();

const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB for general media library uploads
});

// GET /api/media-library
router.get('/', validateProjectFromQuery, mediaLibraryController.getMedia);

// POST /api/media-library/upload
router.post('/upload', validateProjectFromQuery, upload.single('file'), mediaLibraryController.uploadMedia);

// GET /api/media-library/:id
router.get('/public/:id', mediaLibraryController.getPublicMediaUrl);

// DELETE /api/media-library/:id
router.delete('/:id', validateProjectFromQuery, mediaLibraryController.deleteMedia);

export default router;
