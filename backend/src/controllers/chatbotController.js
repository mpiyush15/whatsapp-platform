import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';

export const createChatbot = async (req, res) => {
  try {
    const { name, description, triggers } = req.body;

    if (!name) {
      return sendValidationError(res, 'Chatbot name required');
    }

    return sendSuccess(res, {
      chatbotId: `bot_${Date.now()}`,
      name,
      status: 'active'
    }, 'Chatbot created');
  } catch (error) {
    return handleControllerError(res, error, 'createChatbot');
  }
};

export const getChatbot = async (req, res) => {
  try {
    const { chatbotId } = req.params;
    return sendSuccess(res, { chatbotId }, 'Chatbot retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getChatbot');
  }
};

export const listChatbots = async (req, res) => {
  try {
    return sendSuccess(res, { chatbots: [] }, 'Chatbots retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listChatbots');
  }
};

export const getChatbots = async (req, res) => {
  try {
    const user = req.user;
    const db = mongoose.connection.db;
    const chatbots = await db.collection('chatbots').find({ accountId: user.accountId }).toArray();
    return sendSuccess(res, { chatbots }, 'Chatbots retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getChatbots');
  }
};

export const updateChatbot = async (req, res) => {
  try {
    const { chatbotId } = req.params;
    return sendSuccess(res, { chatbotId }, 'Chatbot updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateChatbot');
  }
};

export const toggleChatbot = async (req, res) => {
  try {
    const { chatbotId } = req.params;
    return sendSuccess(res, { chatbotId, status: 'toggled' }, 'Chatbot toggled');
  } catch (error) {
    return handleControllerError(res, error, 'toggleChatbot');
  }
};

export const deleteChatbot = async (req, res) => {
  try {
    const { chatbotId } = req.params;
    return sendSuccess(res, { chatbotId }, 'Chatbot deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteChatbot');
  }
};

export const getChatbotInteractions = async (req, res) => {
  try {
    const { chatbotId } = req.params;
    return sendSuccess(res, { chatbotId, interactions: [] }, 'Interactions retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getChatbotInteractions');
  }
};

export const getChatbotLeads = async (req, res) => {
  try {
    const { chatbotId } = req.params;
    return sendSuccess(res, { chatbotId, leads: [] }, 'Chatbot leads retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getChatbotLeads');
  }
};

export const updateLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    return sendSuccess(res, { leadId }, 'Lead updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateLead');
  }
};

export const convertLeadToClient = async (req, res) => {
  try {
    const { leadId } = req.params;
    logger.info('✅ Lead converted to client:', leadId);
    return sendSuccess(res, { leadId, status: 'converted' }, 'Lead converted to client');
  } catch (error) {
    return handleControllerError(res, error, 'convertLeadToClient');
  }
};

export const deleteLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    return sendSuccess(res, { leadId }, 'Lead deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteLead');
  }
};

export default { 
  createChatbot, 
  getChatbot, 
  listChatbots,
  getChatbots,
  updateChatbot,
  toggleChatbot,
  deleteChatbot,
  getChatbotInteractions,
  getChatbotLeads,
  updateLead,
  convertLeadToClient,
  deleteLead
};
