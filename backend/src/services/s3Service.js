import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import axios from 'axios';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * S3 Media Service for WhatsApp Platform
 * 
 * Handles:
 * - Downloading media from WhatsApp Cloud API
 * - Uploading media to S3
 * - Generating signed URLs for private files
 * - Media type detection and validation
 */

// S3 Configuration
const AWS_CONFIG = {
  region: process.env.AWS_REGION || 'ap-south-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'pixels-official';
const MEDIA_PREFIX = process.env.WHATSAPP_MEDIA_PREFIX || 'whatsapp-media/';

// Validate configuration
if (!AWS_CONFIG.accessKeyId || !AWS_CONFIG.secretAccessKey) {
  console.error('❌ AWS credentials not configured!');
  console.error('Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env file');
}

// Initialize S3 Client
const s3Client = new S3Client({
  region: AWS_CONFIG.region,
  credentials: {
    accessKeyId: AWS_CONFIG.accessKeyId,
    secretAccessKey: AWS_CONFIG.secretAccessKey,
  },
});

/**
 * Generate unique filename for S3
 * Format: accountId/YYYY-MM-DD/type/uuid-originalname.ext
 */
const generateS3Key = (accountId, mediaType, originalFilename = '') => {
  const date = new Date();
  const dateFolder = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const uuid = crypto.randomUUID();
  
  // Extract extension from original filename
  const ext = originalFilename ? path.extname(originalFilename) : '';
  const filename = `${uuid}${ext}`;
  
  return `${MEDIA_PREFIX}${accountId}/${dateFolder}/${mediaType}/${filename}`;
};

/**
 * Get file extension from MIME type
 */
const getExtensionFromMimeType = (mimeType) => {
  const mimeMap = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/3gpp': '.3gp',
    'audio/aac': '.aac',
    'audio/mp4': '.m4a',
    'audio/mpeg': '.mp3',
    'audio/amr': '.amr',
    'audio/ogg': '.ogg',
    'application/pdf': '.pdf',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/msword': '.doc',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  };
  
  return mimeMap[mimeType] || '';
};

/**
 * Download media from WhatsApp Cloud API
 * 
 * @param {string} mediaId - WhatsApp media ID from webhook
 * @param {string} accessToken - WhatsApp access token
 * @returns {Promise<{buffer: Buffer, mimeType: string, filename: string}>}
 */
export const downloadMediaFromWhatsApp = async (mediaId, accessToken) => {
  try {
    console.log(`📥 Downloading media from WhatsApp: ${mediaId}`);
    
    // Step 1: Get media URL from WhatsApp
    const mediaUrlResponse = await axios.get(
      `https://graph.facebook.com/v21.0/${mediaId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    const { url, mime_type, file_size, sha256 } = mediaUrlResponse.data;
    console.log(`📄 Media info - Type: ${mime_type}, Size: ${file_size} bytes`);
    
    // Step 2: Download media file
    const mediaResponse = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      responseType: 'arraybuffer',
    });
    
    const buffer = Buffer.from(mediaResponse.data);
    const extension = getExtensionFromMimeType(mime_type);
    const filename = `${mediaId}${extension}`;
    
    console.log(`✅ Downloaded ${buffer.length} bytes from WhatsApp`);
    
    return {
      buffer,
      mimeType: mime_type,
      filename,
      fileSize: file_size,
      sha256,
    };
  } catch (error) {
    console.error('❌ Error downloading media from WhatsApp:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw new Error(`Failed to download media: ${error.message}`);
  }
};

/**
 * Upload buffer to S3
 * 
 * @param {Buffer} buffer - File buffer
 * @param {string} accountId - Account ID for folder structure
 * @param {string} mediaType - Type: image/video/audio/document
 * @param {string} mimeType - MIME type
 * @param {string} originalFilename - Original filename (optional)
 * @returns {Promise<{s3Key: string, s3Url: string}>}
 */
export const uploadToS3 = async (buffer, accountId, mediaType, mimeType, originalFilename = '') => {
  try {
    const s3Key = generateS3Key(accountId, mediaType, originalFilename);
    
    console.log(`☁️  Uploading to S3: ${s3Key}`);
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
      // Make publicly accessible
      ACL: 'public-read',
    });
    
    await s3Client.send(command);
    
    // Generate public URL (if bucket is public) or signed URL
    const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    
    console.log(`✅ Uploaded to S3: ${s3Url}`);
    
    return {
      s3Key,
      s3Url,
    };
  } catch (error) {
    console.error('❌ Error uploading to S3:', error.message);
    throw new Error(`Failed to upload to S3: ${error.message}`);
  }
};

/**
 * Generate signed URL for private S3 objects
 * 
 * @param {string} s3Key - S3 object key
 * @param {number} expiresIn - URL expiration in seconds (default: 1 hour)
 * @returns {Promise<string>} - Signed URL
 */
export const getSignedUrlForS3Object = async (s3Key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    
    return signedUrl;
  } catch (error) {
    console.error('❌ Error generating signed URL:', error.message);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

/**
 * Complete workflow: Download from WhatsApp + Upload to S3
 * 
 * @param {string} mediaId - WhatsApp media ID
 * @param {string} accessToken - WhatsApp access token
 * @param {string} accountId - Account ID
 * @param {string} mediaType - Type: image/video/audio/document
 * @returns {Promise<Object>} - Media details with S3 URL
 */
export const downloadAndUploadMedia = async (mediaId, accessToken, accountId, mediaType) => {
  try {
    console.log(`🔄 Starting media transfer: WhatsApp → S3`);
    console.log(`Media ID: ${mediaId}, Type: ${mediaType}, Account: ${accountId}`);
    
    // Step 1: Download from WhatsApp
    const { buffer, mimeType, filename, fileSize, sha256 } = await downloadMediaFromWhatsApp(
      mediaId,
      accessToken
    );
    
    // Step 2: Upload to S3
    const { s3Key, s3Url } = await uploadToS3(buffer, accountId, mediaType, mimeType, filename);
    
    console.log(`✅ Media transfer complete: ${mediaId} → ${s3Url}`);
    
    return {
      mediaId,
      s3Key,
      s3Url,
      mimeType,
      filename,
      fileSize,
      sha256,
      mediaType,
    };
  } catch (error) {
    console.error(`❌ Failed to transfer media ${mediaId}:`, error.message);
    throw error;
  }
};

/**
 * Upload local file/buffer directly to S3 (for outbound media)
 * 
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} accountId - Account ID
 * @param {string} mediaType - Type: image/video/audio/document
 * @param {string} mimeType - MIME type
 * @param {string} originalFilename - Original filename
 * @returns {Promise<Object>} - S3 details
 */
export const uploadMediaToS3 = async (fileBuffer, accountId, mediaType, mimeType, originalFilename) => {
  try {
    const { s3Key, s3Url } = await uploadToS3(
      fileBuffer,
      accountId,
      mediaType,
      mimeType,
      originalFilename
    );
    
    return {
      s3Key,
      s3Url,
      mimeType,
      filename: originalFilename,
      fileSize: fileBuffer.length,
      mediaType,
    };
  } catch (error) {
    console.error('❌ Failed to upload media:', error.message);
    throw error;
  }
};

/**
 * Determine media type from MIME type
 */
export const getMediaTypeFromMime = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
};

export default {
  downloadMediaFromWhatsApp,
  uploadToS3,
  getSignedUrlForS3Object,
  downloadAndUploadMedia,
  uploadMediaToS3,
  getMediaTypeFromMime,
};
