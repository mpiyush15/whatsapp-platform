import Media from '../models/Media.js';
import { uploadToS3, getSignedUrlForS3Object } from '../services/s3Service.js';
import { getMediaTypeFromMime } from '../services/s3Service.js';
import { handleControllerError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Get all media for a project
 */
export const getMedia = async (req, res) => {
  try {
    const { projectId } = req.query;
    const accountId = req.user?.accountId;
    
    if (!projectId) {
      return res.status(400).json({ success: false, error: 'projectId is required' });
    }

    const mediaFiles = await Media.find({
      accountId,
      projectId,
      isDeleted: false
    }).sort({ createdAt: -1 });

    return res.json({ success: true, media: mediaFiles });
  } catch (error) {
    return handleControllerError(res, error, 'getMedia');
  }
};

/**
 * Upload new media directly
 */
export const uploadMedia = async (req, res) => {
  try {
    const { projectId, source = 'direct_upload' } = req.query;
    const accountId = req.user?.accountId;

    if (!projectId) {
      return res.status(400).json({ success: false, error: 'projectId is required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const mimeType = req.file.mimetype;
    const s3MediaType = getMediaTypeFromMime(mimeType) || 'other';

    const { s3Url, s3Key } = await uploadToS3(
      req.file.buffer,
      accountId,
      `media_library/${s3MediaType}`,
      mimeType,
      req.file.originalname
    );

    const mediaRecord = await Media.create({
      accountId,
      projectId,
      fileName: req.file.originalname,
      fileType: s3MediaType,
      mediaUrl: s3Url,
      s3Key: s3Key,
      source: source,
      sizeBytes: req.file.size,
      mimeType: mimeType
    });

    return res.json({ success: true, media: mediaRecord });
  } catch (error) {
    return handleControllerError(res, error, 'uploadMedia');
  }
};

/**
 * Delete (soft delete) media
 */
export const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId } = req.query;
    const accountId = req.user?.accountId;

    const mediaRecord = await Media.findOneAndUpdate(
      { _id: id, accountId, projectId },
      { isDeleted: true },
      { new: true }
    );

    if (!mediaRecord) {
      return res.status(404).json({ success: false, error: 'Media not found' });
    }

    return res.json({ success: true, message: 'Media deleted successfully' });
  } catch (error) {
    return handleControllerError(res, error, 'deleteMedia');
  }
};

/**
 * Get public signed URL for media (No Auth Required)
 * Used by the /download/:mediaId redirect route
 */
export const getPublicMediaUrl = async (req, res) => {
  try {
    const { id } = req.params;

    const mediaRecord = await Media.findById(id);

    if (!mediaRecord || mediaRecord.isDeleted) {
      return res.status(404).json({ success: false, error: 'Media not found' });
    }

    // Generate fresh signed URL (valid for 1 hour)
    const signedUrl = await getSignedUrlForS3Object(mediaRecord.s3Key, 3600);

    return res.json({ success: true, url: signedUrl });
  } catch (error) {
    return handleControllerError(res, error, 'getPublicMediaUrl');
  }
};
