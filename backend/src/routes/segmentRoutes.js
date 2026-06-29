import express from 'express';
import segmentController from '../controllers/segmentController.js';
import validators from '../middlewares/validators.js';
import { validateProjectFromQuery } from '../middleware/projectAuth.js';

const router = express.Router();

/**
 * Segment Routes (CRM)
 * Handles contact segment/audience management
 */

// List all segments
router.get('/', validateProjectFromQuery, segmentController.getSegments);

// Get segment details with contact count
router.get('/:id', validateProjectFromQuery, validators.validateObjectId, segmentController.getSegment);

// Get contacts matching segment
router.get('/:id/contacts', validateProjectFromQuery, validators.validateObjectId, segmentController.getSegmentContacts);

// Create new segment
router.post('/', validators.validateCreateSegment, segmentController.createSegment);

// Update segment
router.put('/:id', validators.validateObjectId, validators.validateUpdateSegment, segmentController.updateSegment);

// Delete segment
router.delete('/:id', validators.validateObjectId, segmentController.deleteSegment);

// Pin/unpin segment
router.patch('/:id/pin', validators.validateObjectId, segmentController.togglePinSegment);

export default router;
