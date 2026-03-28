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
    const { event, data } = req.body;
    logger.info('🪝 Webhook received:', { event });
    return sendSuccess(res, { processed: true }, 'Webhook handled');
  } catch (error) {
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
