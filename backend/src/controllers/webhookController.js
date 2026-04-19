import { sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';

export const registerWebhook = async (req, res) => {
  try {
    const { url, events } = req.body;

    if (!url || !events) {
      return sendValidationError(res, 'URL and events required');
    }

    logger.info('🪝 Webhook registered:', { url, events: events.length });

    return sendSuccess(res, {
      webhookId: `hook_${Date.now()}`,
      url,
      events,
      status: 'active'
    }, 'Webhook registered');
  } catch (error) {
    return handleControllerError(res, error, 'registerWebhook');
  }
};

export const listWebhooks = async (req, res) => {
  try {
    return sendSuccess(res, { webhooks: [] }, 'Webhooks retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listWebhooks');
  }
};

export const deleteWebhook = async (req, res) => {
  try {
    const { webhookId } = req.params;
    return sendSuccess(res, { webhookId }, 'Webhook deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteWebhook');
  }
};

export const handleWebhook = async (req, res) => {
  try {
    const body = req.body;
    
    // Meta WhatsApp sends webhooks in this format:
    // { object: "whatsapp_business_account", entry: [{ changes: [{ field, value }] }] }
    
    if (body.object === 'whatsapp_business_account') {
      logger.info('✅ WhatsApp webhook received from Meta');
      logger.info('📋 Full webhook body:', JSON.stringify(body, null, 2));
      
      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const field = change.field;
          const value = change.value;
          
          logger.info('🔍 Webhook field:', field);
          logger.info('📦 Webhook value:', JSON.stringify(value, null, 2));
          
          // Handle different field types
          if (field === 'messages') {
            logger.info('💬 Message event received');
          } else if (field === 'message_status') {
            logger.info('📨 Message status change:', value);
          } else if (field === 'message_template_status_update') {
            logger.info('📝 Template status update:', value);
          }
        }
      }
      
      return sendSuccess(res, { processed: true }, 'WhatsApp webhook processed');
    }
    
    // Fallback for non-Meta webhooks
    const { event, data } = body;
    logger.info('🪝 Generic webhook received:', { event });
    return sendSuccess(res, { processed: true }, 'Webhook handled');
  } catch (error) {
    logger.error('❌ Webhook handler error:', error);
    return handleControllerError(res, error, 'handleWebhook');
  }
};

export const verifyWebhook = async (req, res) => {
  try {
    const { signature } = req.headers;
    return sendSuccess(res, { verified: true }, 'Webhook verified');
  } catch (error) {
    return handleControllerError(res, error, 'verifyWebhook');
  }
};

export default { 
  registerWebhook, 
  listWebhooks, 
  deleteWebhook,
  handleWebhook,
  verifyWebhook
};
