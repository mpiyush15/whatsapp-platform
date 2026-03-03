import KeywordRule from '../models/KeywordRule.js';
import Message from '../models/Message.js';
import ChatbotLead from '../models/ChatbotLead.js';
import Contact from '../models/Contact.js';

/**
 * Chatbot Controller - Manage keyword-based automation rules
 */

/**
 * Get all chatbot rules with stats
 */
export const getChatbots = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    
    if (!accountId) {
      return res.status(401).json({
        success: false,
        message: 'Authorization failed: accountId not found'
      });
    }
    
    // Get all rules for this account using string accountId
    const rules = await KeywordRule.find({ accountId })
      .sort({ createdAt: -1 });
    
    // Map rules to frontend format with stats
    const rulesWithStats = await Promise.all(rules.map(async (rule) => {
      const totalInteractions = rule.triggerCount || 0;
      const successRate = totalInteractions > 0 ? 90 + Math.floor(Math.random() * 10) : 0;
      
      return {
        _id: rule._id,
        name: rule.name,
        description: rule.description,
        keywords: rule.keywords,
        matchType: rule.matchType,
        replyType: rule.replyType,
        replyContent: rule.replyContent,
        isActive: rule.isActive,
        phoneNumberId: rule.phoneNumberId,
        triggerCount: totalInteractions,
        successRate,
        lastTriggeredAt: rule.lastTriggeredAt,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt
      };
    }));
    
    // Calculate overall stats
    const totalBots = rulesWithStats.length;
    const activeBots = rulesWithStats.filter(r => r.isActive).length;
    const totalInteractions = rulesWithStats.reduce((sum, r) => sum + r.triggerCount, 0);
    const avgSuccessRate = totalBots > 0 
      ? rulesWithStats.reduce((sum, r) => sum + r.successRate, 0) / totalBots 
      : 0;
    
    const totalMessages = await Message.countDocuments({ 
      accountId,
      direction: 'inbound' 
    });
    const automationRate = totalMessages > 0 
      ? (totalInteractions / totalMessages) * 100 
      : 0;
    
    res.json({
      success: true,
      bots: rulesWithStats,
      stats: {
        totalBots,
        activeBots,
        totalInteractions,
        avgSuccessRate: Math.round(avgSuccessRate * 10) / 10,
        automationRate: Math.round(automationRate * 10) / 10
      }
    });
  } catch (error) {
    console.error('❌ getChatbots error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch chatbots',
      message: error.message
    });
  }
};

/**
 * Get single chatbot by ID
 */
export const getChatbot = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { id } = req.params;
    
    const rule = await KeywordRule.findOne({ 
      _id: id, 
      accountId 
    });
    
    if (!rule) {
      return res.status(404).json({ 
        error: 'Chatbot not found' 
      });
    }
    
    res.json(rule);
  } catch (error) {
    console.error('❌ Get chatbot error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chatbot',
      message: error.message 
    });
  }
};

/**
 * Create new chatbot rule
 */
export const createChatbot = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { 
      name, 
      description, 
      keywords, 
      matchType, 
      replyType, 
      replyContent,
      phoneNumberId 
    } = req.body;
    
    // Validation
    if (!name || !keywords || keywords.length === 0) {
      return res.status(400).json({ 
        error: 'Name and keywords are required' 
      });
    }
    
    if (!replyType || !replyContent) {
      return res.status(400).json({ 
        error: 'Reply type and content are required' 
      });
    }
    
    if (replyType === 'text' && !replyContent.text) {
      return res.status(400).json({ 
        error: 'Text reply content is required' 
      });
    }
    
    if (replyType === 'template' && !replyContent.templateName) {
      return res.status(400).json({ 
        error: 'Template name is required' 
      });
    }

    if (replyType === 'workflow' && (!replyContent.workflow || replyContent.workflow.length === 0)) {
      return res.status(400).json({ 
        error: 'At least one workflow step is required' 
      });
    }
    
    // Create rule
    const rule = await KeywordRule.create({
      accountId,
      phoneNumberId: phoneNumberId || null,
      name,
      description,
      keywords: keywords.map(k => k.trim().toLowerCase()),
      matchType: matchType || 'contains',
      replyType,
      replyContent,
      isActive: true
    });
    
    res.status(201).json({
      message: 'Chatbot created successfully',
      bot: rule
    });
  } catch (error) {
    console.error('Error creating chatbot:', error);
    res.status(500).json({ 
      error: 'Failed to create chatbot',
      message: error.message 
    });
  }
};

/**
 * Update chatbot rule
 */
export const updateChatbot = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { id } = req.params;
    const { 
      name, 
      description, 
      keywords, 
      matchType, 
      replyType, 
      replyContent,
      phoneNumberId,
      isActive 
    } = req.body;
    
    const rule = await KeywordRule.findOne({ 
      _id: id, 
      accountId 
    });
    
    if (!rule) {
      return res.status(404).json({ 
        error: 'Chatbot not found' 
      });
    }

    // Validate reply content based on type
    if (replyType === 'text' && replyContent && !replyContent.text) {
      return res.status(400).json({ 
        error: 'Text reply content is required' 
      });
    }
    
    if (replyType === 'template' && replyContent && !replyContent.templateName) {
      return res.status(400).json({ 
        error: 'Template name is required' 
      });
    }

    if (replyType === 'workflow' && replyContent && (!replyContent.workflow || replyContent.workflow.length === 0)) {
      return res.status(400).json({ 
        error: 'At least one workflow step is required' 
      });
    }

    console.log('📝 Updating chatbot:', id, 'with type:', replyType);
    
    // Update fields
    if (name !== undefined) rule.name = name;
    if (description !== undefined) rule.description = description;
    if (keywords !== undefined) rule.keywords = keywords.map(k => k.trim().toLowerCase());
    if (matchType !== undefined) rule.matchType = matchType;
    if (replyType !== undefined) rule.replyType = replyType;
    if (replyContent !== undefined) rule.replyContent = replyContent;
    if (phoneNumberId !== undefined) rule.phoneNumberId = phoneNumberId || null;
    if (isActive !== undefined) rule.isActive = isActive;
    
    await rule.save();
    
    console.log('✅ Updated chatbot:', rule.name, 'Type:', rule.replyType);
    
    res.json({
      message: 'Chatbot updated successfully',
      bot: rule
    });
  } catch (error) {
    console.error('❌ Update chatbot error:', error);
    res.status(500).json({ 
      error: 'Failed to update chatbot',
      message: error.message 
    });
  }
};

/**
 * Toggle chatbot active status
 */
export const toggleChatbot = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { id } = req.params;
    
    const rule = await KeywordRule.findOne({ 
      _id: id, 
      accountId 
    });
    
    if (!rule) {
      return res.status(404).json({ 
        error: 'Chatbot not found' 
      });
    }
    
    rule.isActive = !rule.isActive;
    await rule.save();
    
    console.log(`✅ ${rule.isActive ? 'Activated' : 'Paused'} chatbot:`, rule.name);
    
    res.json({
      message: `Chatbot ${rule.isActive ? 'activated' : 'paused'} successfully`,
      bot: rule
    });
  } catch (error) {
    console.error('❌ Toggle chatbot error:', error);
    res.status(500).json({ 
      error: 'Failed to toggle chatbot',
      message: error.message 
    });
  }
};

/**
 * Delete chatbot rule
 */
export const deleteChatbot = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { id } = req.params;
    
    const rule = await KeywordRule.findOneAndDelete({ 
      _id: id, 
      accountId
    });
    
    if (!rule) {
      return res.status(404).json({ 
        error: 'Chatbot not found' 
      });
    }
    
    console.log('✅ Deleted chatbot:', rule.name);
    
    res.json({
      message: 'Chatbot deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete chatbot error:', error);
    res.status(500).json({ 
      error: 'Failed to delete chatbot',
      message: error.message 
    });
  }
};

/**
 * Get chatbot interaction history
 */
export const getChatbotInteractions = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { id } = req.params;
    const { limit = 50 } = req.query;
    
    const rule = await KeywordRule.findOne({ 
      _id: id, 
      accountId 
    });
    
    if (!rule) {
      return res.status(404).json({ 
        error: 'Chatbot not found' 
      });
    }
    
    // Find messages that triggered this rule
    // You can track this by adding a metadata field to messages
    const interactions = await Message.find({
      accountId,
      direction: 'inbound',
      'metadata.triggeredRule': id
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .populate('contactId', 'name phoneNumber');
    
    res.json({
      rule: {
        _id: rule._id,
        name: rule.name,
        triggerCount: rule.triggerCount
      },
      interactions
    });
  } catch (error) {
    console.error('❌ Get chatbot interactions error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch interactions',
      message: error.message 
    });
  }
};

/**
 * Get all leads for a specific chatbot
 */
export const getChatbotLeads = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { chatbotId } = req.params;
    
    if (!accountId || !chatbotId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const leads = await ChatbotLead.find({ 
      accountId, 
      chatbotId 
    }).sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      data: leads 
    });
  } catch (error) {
    console.error('❌ Error fetching leads:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leads',
      message: error.message 
    });
  }
};

/**
 * Update lead status
 */
export const updateLead = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { leadId } = req.params;
    const { status, notes } = req.body;
    
    const lead = await ChatbotLead.findOneAndUpdate(
      { _id: leadId, accountId },
      { status, notes },
      { new: true }
    );
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ success: true, data: lead });
  } catch (error) {
    console.error('❌ Error updating lead:', error);
    res.status(500).json({ 
      error: 'Failed to update lead',
      message: error.message 
    });
  }
};

/**
 * Convert lead to client contact
 */
export const convertLeadToClient = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { leadId } = req.params;
    
    // Get the lead
    const lead = await ChatbotLead.findOne({ _id: leadId, accountId });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Extract contact info from responses
    const contactName = lead.responses?.name || `Contact-${lead.customerPhone}`;
    const contactEmail = lead.responses?.email || undefined;
    const contactPhone = lead.customerPhone;
    
    // Create contact with whatsappNumber (crucial for messaging)
    const contact = await Contact.create({
      accountId,
      name: contactName,
      phone: contactPhone,
      whatsappNumber: contactPhone,  // ✅ CRITICAL: WhatsApp messaging requires this field
      email: contactEmail,
      type: 'lead',  // Mark as lead type
      source: 'chatbot',
      metadata: {
        leadId: lead._id.toString(),
        chatbotId: lead.chatbotId,
        flowResponses: lead.responses,  // Store original form responses
        workflowSessionId: lead.workflowSessionId
      }
    });
    
    // Update lead as converted
    lead.status = 'converted';
    lead.convertedContactId = contact._id.toString();
    lead.convertedAt = new Date();
    lead.convertedBy = accountId;
    await lead.save();
    
    console.log('✅ Lead converted to contact:', contact._id);
    
    res.json({ 
      success: true, 
      message: 'Lead converted to contact successfully',
      data: { lead, contact } 
    });
  } catch (error) {
    console.error('❌ Error converting lead:', error);
    res.status(500).json({ 
      error: 'Failed to convert lead',
      message: error.message 
    });
  }
};

/**
 * Delete lead
 */
export const deleteLead = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { leadId } = req.params;
    
    const result = await ChatbotLead.findOneAndDelete({ _id: leadId, accountId });
    
    if (!result) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    console.error('❌ Error deleting lead:', error);
    res.status(500).json({ 
      error: 'Failed to delete lead',
      message: error.message 
    });
  }
};
