import express from 'express';
import multer from 'multer';
import { uploadToS3 } from '../services/s3Service.js';
import logger from '../utils/logger.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/clinic/upload-logo
 * Upload clinic logo to S3 and return S3 URL
 */
router.post('/upload-logo', upload.single('file'), async (req, res) => {
  try {
    const { projectId, type } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    logger.info(`Uploading clinic logo for project: ${projectId}`);

    // Prepare upload parameters
    const fileName = req.file.originalname || `clinic-logo-${Date.now()}`;
    const mimeType = req.file.mimetype;

    // Upload to S3
    const { s3Url, s3Key } = await uploadToS3(
      req.file.buffer,
      `clinic-assets/${projectId}/logo`,
      fileName,
      mimeType
    );

    logger.info(`✅ Clinic logo uploaded to S3: ${s3Url}`);

    return res.json({
      success: true,
      s3Url,
      s3Key,
      message: 'Clinic logo uploaded successfully'
    });

  } catch (error) {
    logger.error('Error uploading clinic logo:', error);
    return res.status(500).json({
      error: 'Failed to upload clinic logo',
      message: error.message
    });
  }
});

/**
 * POST /api/clinic/upload-pdf
 * Upload prescription PDF to S3 and return S3 URL
 */
router.post('/upload-pdf', upload.single('file'), async (req, res) => {
  try {
    const { projectId, type } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    // Validate PDF
    if (!req.file.mimetype.includes('pdf')) {
      return res.status(400).json({ error: 'Invalid file type. Please upload a PDF file.' });
    }

    logger.info(`Uploading prescription PDF for project: ${projectId}`);

    // Prepare upload parameters
    const fileName = req.file.originalname || `prescription-${Date.now()}.pdf`;
    const mimeType = req.file.mimetype;

    // Upload to S3
    const { s3Url, s3Key } = await uploadToS3(
      req.file.buffer,
      `clinic-assets/${projectId}/prescription-pdf`,
      fileName,
      mimeType
    );

    logger.info(`✅ Prescription PDF uploaded to S3: ${s3Url}`);

    return res.json({
      success: true,
      s3Url,
      s3Key,
      fileName,
      message: 'Prescription PDF uploaded successfully'
    });

  } catch (error) {
    logger.error('Error uploading prescription PDF:', error);
    return res.status(500).json({
      error: 'Failed to upload prescription PDF',
      message: error.message
    });
  }
});

export default router;
