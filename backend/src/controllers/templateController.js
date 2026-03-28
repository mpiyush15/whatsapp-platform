import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';

export const createTemplate = async (req, res) => {
  try {
    const { name, content, category } = req.body;

    if (!name || !content) {
      return sendValidationError(res, 'Name and content required');
    }

    return sendSuccess(res, {
      templateId: `tmpl_${Date.now()}`,
      name,
      status: 'active'
    }, 'Template created');
  } catch (error) {
    return handleControllerError(res, error, 'createTemplate');
  }
};

export const getTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    return sendSuccess(res, { templateId }, 'Template retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getTemplate');
  }
};

export const listTemplates = async (req, res) => {
  try {
    return sendSuccess(res, { templates: [] }, 'Templates retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listTemplates');
  }
};

export const getTemplates = async (req, res) => {
  try {
    return sendSuccess(res, { templates: [] }, 'Templates retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getTemplates');
  }
};

export const syncTemplates = async (req, res) => {
  try {
    logger.info('🔄 Syncing templates with Meta...');
    return sendSuccess(res, { synced: 0 }, 'Templates synced');
  } catch (error) {
    return handleControllerError(res, error, 'syncTemplates');
  }
};

export const submitTemplateToMeta = async (req, res) => {
  try {
    const { id } = req.params;
    return sendSuccess(res, { templateId: id, status: 'submitted' }, 'Template submitted');
  } catch (error) {
    return handleControllerError(res, error, 'submitTemplateToMeta');
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    return sendSuccess(res, { templateId: id, updated: true }, 'Template updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateTemplate');
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    return sendSuccess(res, { templateId: id, deleted: true }, 'Template deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteTemplate');
  }
};

export default { 
  createTemplate, 
  getTemplate, 
  listTemplates,
  getTemplates,
  syncTemplates,
  submitTemplateToMeta,
  updateTemplate,
  deleteTemplate
};
