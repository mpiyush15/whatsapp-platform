import crypto from 'crypto';

/**
 * Middleware to validate WhatsApp webhook HMAC signature
 * Verifies that incoming webhooks are really from Meta/WhatsApp
 * 
 * Meta sends X-Hub-Signature: sha256=<hmac_value>
 * We verify by computing HMAC(app_secret, raw_body) and comparing
 */
export const validateWebhookSignature = (req, res, next) => {
  // Get signature from header
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.META_APP_SECRET;
  
  // Validate that app secret is configured
  if (!appSecret) {
    console.error('❌ CRITICAL: META_APP_SECRET environment variable not set');
    return res.status(500).json({
      success: false,
      code: 'MISSING_APP_SECRET',
      message: 'Webhook validation failed: missing META_APP_SECRET'
    });
  }
  
  // Get raw body (must be string/buffer, not parsed JSON)
  const rawBody = req.rawBody || JSON.stringify(req.body);
  
  if (!signature) {
    console.error('❌ WEBHOOK SECURITY: Missing X-Hub-Signature-256 header');
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
      console.error('❌ WEBHOOK SECURITY: Invalid signature algorithm:', algorithm);
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
      console.error('❌ WEBHOOK SECURITY: Signature mismatch');
      console.error('  Expected:', computedHash);
      console.error('  Received:', receivedHash);
      return res.status(401).json({
        success: false,
        code: 'WEBHOOK_SIGNATURE_MISMATCH',
        message: 'Webhook signature validation failed: signature mismatch'
      });
    }
    
    console.log('✅ WEBHOOK SECURITY: Signature valid - trusted source confirmed');
    next();
    
  } catch (error) {
    console.error('❌ WEBHOOK SECURITY: Signature validation error:', error.message);
    res.status(401).json({
      success: false,
      code: 'SIGNATURE_VALIDATION_ERROR',
      message: 'Webhook signature validation failed'
    });
  }
};

export default validateWebhookSignature;
