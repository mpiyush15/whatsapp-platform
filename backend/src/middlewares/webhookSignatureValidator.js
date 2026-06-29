import crypto from 'crypto';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * Middleware to validate WhatsApp webhook HMAC signature
 * Verifies that incoming webhooks are really from Meta/WhatsApp
 * 
 * Meta sends X-Hub-Signature: sha256=<hmac_value>
 * We verify by computing HMAC(app_secret, raw_body) and comparing
 */
export const validateWebhookSignature = (req, res, next) => {
  // GET requests are for webhook verification and don't have signatures.
  // The verification is handled by comparing hub.verify_token in the query string.
  if (req.method === 'GET') {
    return next();
  }

  // Get signature from header
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.META_APP_SECRET;
  
  // Validate that app secret is configured
  if (!appSecret) {
    logger.error('❌ CRITICAL: META_APP_SECRET environment variable not set');
    return res.status(500).json({
      success: false,
      code: 'MISSING_APP_SECRET',
      message: 'Webhook validation failed: missing META_APP_SECRET'
    });
  }
  
  // Get raw body (must be string/buffer, not parsed JSON)
  const rawBody = req.rawBody || JSON.stringify(req.body);
  
  if (!signature) {
    logger.error('❌ WEBHOOK SECURITY: Missing X-Hub-Signature-256 header');
    return res.status(401).json({
      success: false,
      code: 'INVALID_WEBHOOK_SIGNATURE',
      message: 'Webhook signature validation failed: missing signature header'
    });
  }
  
  try {
    // Signature format: "sha256=<hash>"
    const [algorithm, receivedHash] = signature.split('=');
    
    if (algorithm !== 'sha256') {
      logger.error('❌ WEBHOOK SECURITY: Invalid signature algorithm:', algorithm);
      return res.status(401).json({
        success: false,
        code: 'INVALID_WEBHOOK_ALGORITHM',
        message: 'Webhook signature validation failed: invalid algorithm'
      });
    }
    
    // Compute HMAC-SHA256
    const computedHash = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');
    
    // Timing-safe comparison to prevent timing attacks
    const hashBuffer1 = Buffer.from(computedHash);
    const hashBuffer2 = Buffer.from(receivedHash);
    
    const isValid = crypto.timingSafeEqual(hashBuffer1, hashBuffer2);
    
    if (!isValid) {
      logger.error('❌ WEBHOOK SECURITY: Signature mismatch');
      logger.error('  Expected:', computedHash);
      logger.error('  Received:', receivedHash);
      return res.status(401).json({
        success: false,
        code: 'WEBHOOK_SIGNATURE_MISMATCH',
        message: 'Webhook signature validation failed: signature mismatch'
      });
    }
    
    logger.info('✅ WEBHOOK SECURITY: Signature valid - trusted source confirmed');
    next();
    
  } catch (error) {
    logger.error('❌ WEBHOOK SECURITY: Signature validation error:', error.message);
    res.status(401).json({
      success: false,
      code: 'SIGNATURE_VALIDATION_ERROR',
      message: 'Webhook signature validation failed'
    });
  }
};

export default validateWebhookSignature;
