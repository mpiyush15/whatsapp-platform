import Lead from '../models/Lead.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Contact from '../models/Contact.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * Lead Service - Handle lead capture, scoring, and management
 */

// Intent keywords for lead detection
const INTENT_KEYWORDS = {
  demo_request: ['demo', 'show me', 'let me see', 'walk through', 'how does', 'can you show'],
  pricing_inquiry: ['price', 'cost', 'how much', 'rates', 'plans', 'pricing', 'quote'],
  product_info: ['features', 'capabilities', 'what does', 'can i', 'do you have'],
  purchase_intent: ['want', 'need', 'buy', 'purchase', 'interested', 'looking for', 'require'],
  comparison: ['vs', 'versus', 'compare', 'better than', 'alternatives', 'similar'],
  integration: ['integrate', 'connect', 'api', 'sync', 'plugin', 'extension'],
  support_request: ['help', 'problem', 'issue', 'broken', 'not working', 'error'],
  complaint: ['complaint', 'disappointed', 'unhappy', 'bad', 'poor', 'terrible']
};

/**
 * Detect intent from message text
 */
export const detectIntent = (messageText) => {
  const text = messageText.toLowerCase();

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return intent;
    }
  }

  return 'inquiry'; // default intent
};

/**
 * Extract keywords from message
 */
export const extractKeywords = (messageText) => {
  const text = messageText.toLowerCase();
  const keywords = new Set();

  for (const keyword of Object.values(INTENT_KEYWORDS).flat()) {
    if (text.includes(keyword)) {
      keywords.add(keyword);
    }
  }

  return Array.from(keywords);
};

/**
 * Calculate lead score (0-100)
 */
export const calculateLeadScore = (lead) => {
  let score = 50; // Base score

  const breakdown = {
    engagement: 0,
    intent: 0,
    recency: 0,
    completion: 0
  };

  // 1. Engagement Score (0-30)
  // More messages = higher engagement
  const messageScore = Math.min(30, (lead.messageCount / 10) * 30);
  breakdown.engagement = Math.round(messageScore);

  // 2. Intent Score (0-40)
  // Certain intents indicate higher likelihood to convert
  const intentScores = {
    purchase_intent: 40,
    demo_request: 35,
    pricing_inquiry: 30,
    product_info: 25,
    integration: 30,
    comparison: 25,
    customization: 30,
    support_request: 15,
    complaint: 10,
    inquiry: 20,
    other: 15
  };
  breakdown.intent = intentScores[lead.intent] || 15;

  // 3. Recency Score (0-20)
  // Recent activity = higher score
  const hoursSinceLastMessage = (Date.now() - lead.lastMessage.getTime()) / (1000 * 60 * 60);
  if (hoursSinceLastMessage < 24) {
    breakdown.recency = 20; // Very recent
  } else if (hoursSinceLastMessage < 7 * 24) {
    breakdown.recency = 15; // This week
  } else if (hoursSinceLastMessage < 30 * 24) {
    breakdown.recency = 10; // This month
  } else {
    breakdown.recency = 5; // Older
  }

  // 4. Completion Score (0-10)
  // Complete profile = higher score
  let completionItems = 0;
  if (lead.name) completionItems++;
  if (lead.email) completionItems++;
  if (lead.phone) completionItems++;
  if (lead.company) completionItems++;
  breakdown.completion = (completionItems / 4) * 10;

  // Calculate total
  score = breakdown.engagement + breakdown.intent + breakdown.recency + breakdown.completion;

  return {
    score: Math.round(Math.min(100, score)),
    breakdown
  };
};

/**
 * Auto-capture lead from conversation
 */
export const captureLeadFromConversation = async (accountId, conversationId) => {
  try {
    // Fetch conversation with messages
    const conversation = await Conversation.findById(conversationId)
      .lean();

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    // Fetch contact
    const contact = await Contact.findById(conversation.contactId)
      .lean();

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    // Get most recent message from contact
    const latestMessage = await Message.findOne({
      conversationId,
      direction: 'inbound'
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!latestMessage) {
      return null; // No inbound messages
    }

    // Detect intent and extract keywords
    const intent = detectIntent(latestMessage.body);
    const keywords = extractKeywords(latestMessage.body);

    // Check if lead already exists
    const existingLead = await Lead.findOne({
      accountId,
      conversationId,
      contactId: conversation.contactId
    });

    if (existingLead) {
      // Update existing lead
      existingLead.messageCount = (existingLead.messageCount || 0) + 1;
      existingLead.lastMessage = new Date();
      existingLead.sourceMessage = latestMessage.body;

      // Update intent and keywords if not already set
      if (!existingLead.intent || existingLead.intent === 'inquiry') {
        existingLead.intent = intent;
      }
      if (keywords.length > 0) {
        existingLead.keywords = Array.from(new Set([...existingLead.keywords, ...keywords]));
      }

      // Recalculate score
      const scoreData = calculateLeadScore(existingLead);
      existingLead.score = scoreData.score;
      existingLead.scoreBreakdown = scoreData.breakdown;

      await existingLead.save();
      return existingLead;
    } else {
      // Create new lead
      const leadData = {
        accountId,
        conversationId,
        contactId: conversation.contactId,
        phoneNumberId: conversation.phoneNumberId,
        name: contact.name,
        email: contact.email || '',
        phone: contact.whatsappNumber || contact.phoneNumber || '',
        company: contact.company || '',
        intent,
        keywords,
        messageCount: 1,
        firstMessage: new Date(),
        lastMessage: new Date(),
        sourceMessage: latestMessage.body
      };

      const lead = new Lead(leadData);

      // Calculate initial score
      const scoreData = calculateLeadScore(lead);
      lead.score = scoreData.score;
      lead.scoreBreakdown = scoreData.breakdown;

      await lead.save();
      return lead;
    }
  } catch (error) {
    logger.error('❌ Lead capture error:', error.message);
    throw error;
  }
};

/**
 * Get leads for account with filters
 */
export const getLeads = async (accountId, filters = {}) => {
  try {
    const query = { accountId };

    // Apply filters
    if (filters.projectId) {
      query.projectId = filters.projectId;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.intent) {
      query.intent = filters.intent;
    }
    if (filters.minScore) {
      query.score = { $gte: parseInt(filters.minScore) };
    }
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } },
        { company: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return leads;
  } catch (error) {
    logger.error('❌ Get leads error:', error.message);
    throw error;
  }
};

/**
 * Get lead statistics for account
 */
export const getLeadStats = async (accountId) => {
  try {
    const stats = {
      total: await Lead.countDocuments({ accountId }),
      new: await Lead.countDocuments({ accountId, status: 'new' }),
      contacted: await Lead.countDocuments({ accountId, status: 'contacted' }),
      qualified: await Lead.countDocuments({ accountId, status: 'qualified' }),
      converted: await Lead.countDocuments({ accountId, status: 'converted' }),
      lost: await Lead.countDocuments({ accountId, status: 'lost' }),
      stale: await Lead.countDocuments({ accountId, status: 'stale' })
    };

    const avgScore = await Lead.aggregate([
      { $match: { accountId } },
      { $group: { _id: null, avgScore: { $avg: '$score' } } }
    ]);

    stats.averageScore = avgScore.length > 0 ? Math.round(avgScore[0].avgScore) : 0;

    return stats;
  } catch (error) {
    logger.error('❌ Get lead stats error:', error.message);
    throw error;
  }
};

/**
 * Mark stale leads (no activity in 30 days)
 */
export const markStaleLeads = async (accountId) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await Lead.updateMany(
      {
        accountId,
        status: { $in: ['new', 'contacted'] },
        lastMessage: { $lt: thirtyDaysAgo }
      },
      {
        $set: { status: 'stale', updatedAt: new Date() }
      }
    );

    return result.modifiedCount;
  } catch (error) {
    logger.error('❌ Mark stale leads error:', error.message);
    throw error;
  }
};

export default {
  captureLeadFromConversation,
  getLeads,
  getLeadStats,
  markStaleLeads,
  calculateLeadScore,
  detectIntent,
  extractKeywords
};
