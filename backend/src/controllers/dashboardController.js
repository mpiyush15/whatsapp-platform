import { sendSuccess } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';

export const getDashboard = async (req, res) => {
  try {
    const accountId = req.account.accountId;

    return sendSuccess(res, {
      stats: {
        totalMessages: 0,
        totalConversations: 0,
        activeAgents: 0,
        averageResponseTime: 0
      }
    }, 'Dashboard retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getDashboard');
  }
};

export const getMetrics = async (req, res) => {
  try {
    return sendSuccess(res, { metrics: {} }, 'Metrics retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getMetrics');
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const user = req.user;
    const db = mongoose.connection.db;
    
    // Get counts from all collections
    const [organizations, payments, invoices, contacts, conversations, broadcasts, chatbots] = await Promise.all([
      db.collection('organizations').countDocuments({ accountId: user.accountId }),
      db.collection('payments').countDocuments({ accountId: user.accountId }),
      db.collection('invoices').countDocuments({ accountId: user.accountId }),
      db.collection('contacts').countDocuments({ accountId: user.accountId }),
      db.collection('conversations').countDocuments({ accountId: user.accountId }),
      db.collection('broadcasts').countDocuments({ accountId: user.accountId }),
      db.collection('chatbots').countDocuments({ accountId: user.accountId }),
    ]);
    
    const stats = {
      totalOrganizations: organizations,
      totalPayments: payments,
      totalInvoices: invoices,
      totalContacts: contacts,
      totalConversations: conversations,
      totalBroadcasts: broadcasts,
      totalChatbots: chatbots,
      lastUpdated: new Date()
    };
    
    return sendSuccess(res, { stats }, 'Dashboard stats retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getDashboardStats');
  }
};

export const getDashboardActivity = async (req, res) => {
  try {
    return sendSuccess(res, { activity: [] }, 'Dashboard activity retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getDashboardActivity');
  }
};

export default { 
  getDashboard, 
  getMetrics,
  getDashboardStats,
  getDashboardActivity
};
