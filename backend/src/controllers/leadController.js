import Lead from '../models/Lead.js';
import leadService from '../services/leadService.js';

/**
 * Lead Controller - Manage lead capture, retrieval, and updates
 */

/**
 * GET /api/leads - Get all leads with stats
 */
export const getLeads = async (req, res) => {
  try {
    const accountId = req.account.accountId; // String accountId (consistent with system)
    
    // Get filters from query params
    const filters = {
      status: req.query.status,
      intent: req.query.intent,
      minScore: req.query.minScore,
      search: req.query.search
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => !filters[key] && delete filters[key]);

    // Get leads
    const leads = await leadService.getLeads(accountId, filters);

    // Get statistics
    const stats = await leadService.getLeadStats(accountId);

    res.json({
      success: true,
      leads,
      stats
    });
  } catch (error) {
    console.error('❌ Get leads error:', error.message);
    res.status(500).json({
      success: false,
      code: 'LEADS_FETCH_ERROR',
      message: 'Failed to fetch leads',
      error: error.message
    });
  }
};

/**
 * GET /api/leads/:id - Get single lead
 */
export const getLead = async (req, res) => {
  try {
    const accountId = req.account.accountId; // String accountId (consistent with system)
    const { id } = req.params;

    const lead = await Lead.findOne({
      _id: id,
      accountId
    })
      .populate('contactId', 'name email whatsappNumber phoneNumber company')
      .populate('conversationId', 'status messageCount')
      .populate('assignedTo', 'name email');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      lead
    });
  } catch (error) {
    console.error('❌ Get lead error:', error.message);
    res.status(500).json({
      success: false,
      code: 'LEAD_FETCH_ERROR',
      message: 'Failed to fetch lead',
      error: error.message
    });
  }
};

/**
 * POST /api/leads - Create lead manually
 */
export const createLead = async (req, res) => {
  try {
    const accountId = req.account.accountId; // String accountId (consistent with system)
    const { conversationId, contactId, phoneNumberId, intent, name, email, phone, company } = req.body;

    if (!conversationId || !contactId || !phoneNumberId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: conversationId, contactId, phoneNumberId'
      });
    }

    // Check if lead already exists
    const existing = await Lead.findOne({
      accountId,
      conversationId,
      contactId
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Lead already exists for this conversation'
      });
    }

    // Create new lead
    const lead = new Lead({
      accountId,
      conversationId,
      contactId,
      phoneNumberId,
      name: name || 'Unknown',
      email: email || '',
      phone: phone || '',
      company: company || '',
      intent: intent || 'inquiry',
      messageCount: 1,
      firstMessage: new Date(),
      lastMessage: new Date()
    });

    // Calculate score
    const scoreData = leadService.calculateLeadScore(lead);
    lead.score = scoreData.score;
    lead.scoreBreakdown = scoreData.breakdown;

    await lead.save();

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      lead
    });
  } catch (error) {
    console.error('❌ Create lead error:', error.message);
    res.status(500).json({
      success: false,
      code: 'LEAD_CREATE_ERROR',
      message: 'Failed to create lead',
      error: error.message
    });
  }
};

/**
 * PATCH /api/leads/:id - Update lead status, notes, assignment
 */
export const updateLead = async (req, res) => {
  try {
    const accountId = req.account.accountId; // String accountId (consistent with system)
    const { id } = req.params;
    const { status, notes, tags, assignedTo, nextFollowUp } = req.body;

    const lead = await Lead.findOne({
      _id: id,
      accountId
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Update fields if provided
    if (status) {
      lead.status = status;
      if (status === 'converted') {
        lead.convertedAt = new Date();
      }
    }
    if (notes !== undefined) lead.notes = notes;
    if (tags) lead.tags = tags;
    if (assignedTo !== undefined) lead.assignedTo = assignedTo || null;
    if (nextFollowUp) lead.nextFollowUp = new Date(nextFollowUp);

    // Track follow-up
    if (status === 'contacted') {
      lead.followUpCount = (lead.followUpCount || 0) + 1;
      lead.lastFollowUp = new Date();
    }

    // Recalculate score
    const scoreData = leadService.calculateLeadScore(lead);
    lead.score = scoreData.score;
    lead.scoreBreakdown = scoreData.breakdown;

    lead.updatedAt = new Date();
    await lead.save();

    res.json({
      success: true,
      message: 'Lead updated successfully',
      lead
    });
  } catch (error) {
    console.error('❌ Update lead error:', error.message);
    res.status(500).json({
      success: false,
      code: 'LEAD_UPDATE_ERROR',
      message: 'Failed to update lead',
      error: error.message
    });
  }
};

/**
 * DELETE /api/leads/:id - Delete lead
 */
export const deleteLead = async (req, res) => {
  try {
    const accountId = req.account.accountId; // String accountId (consistent with system)
    const { id } = req.params;

    const result = await Lead.deleteOne({
      _id: id,
      accountId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete lead error:', error.message);
    res.status(500).json({
      success: false,
      code: 'LEAD_DELETE_ERROR',
      message: 'Failed to delete lead',
      error: error.message
    });
  }
};

/**
 * POST /api/leads/auto-capture/:conversationId - Auto-capture lead from conversation
 */
export const autoCaptureLead = async (req, res) => {
  try {
    const accountId = req.account.accountId; // String accountId (consistent with system)
    const { conversationId } = req.params;

    const lead = await leadService.captureLeadFromConversation(accountId, conversationId);

    if (!lead) {
      return res.json({
        success: true,
        message: 'No inbound messages in conversation',
        lead: null
      });
    }

    res.json({
      success: true,
      message: 'Lead captured successfully',
      lead
    });
  } catch (error) {
    console.error('❌ Auto-capture lead error:', error.message);
    res.status(500).json({
      success: false,
      code: 'LEAD_CAPTURE_ERROR',
      message: 'Failed to capture lead',
      error: error.message
    });
  }
};

/**
 * GET /api/leads/stats/summary - Get lead statistics
 */
export const getLeadStats = async (req, res) => {
  try {
    const accountId = req.account.accountId; // String accountId (consistent with system)

    const stats = await leadService.getLeadStats(accountId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Get lead stats error:', error.message);
    res.status(500).json({
      success: false,
      code: 'LEAD_STATS_ERROR',
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

/**
 * POST /api/leads/mark-stale - Mark stale leads (no activity in 30 days)
 */
export const markStaleLeads = async (req, res) => {
  try {
    const accountId = req.account.accountId; // String accountId (consistent with system)

    const count = await leadService.markStaleLeads(accountId);

    res.json({
      success: true,
      message: `Marked ${count} leads as stale`,
      markedCount: count
    });
  } catch (error) {
    console.error('❌ Mark stale leads error:', error.message);
    res.status(500).json({
      success: false,
      code: 'LEAD_STALE_ERROR',
      message: 'Failed to mark stale leads',
      error: error.message
    });
  }
};

/**
 * POST /api/leads/bulk-export - Export leads as CSV
 */
export const exportLeads = async (req, res) => {
  try {
    const accountId = req.account.accountId; // String accountId (consistent with system)
    const { status, intent } = req.query;

    const query = { accountId };
    if (status) query.status = status;
    if (intent) query.intent = intent;

    const leads = await Lead.find(query)
      .populate('contactId', 'name email whatsappNumber')
      .lean();

    // Generate CSV
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Intent', 'Score', 'Status', 'Messages', 'Created'];
    const rows = leads.map(lead => [
      lead.name,
      lead.email,
      lead.phone,
      lead.company,
      lead.intent,
      lead.score,
      lead.status,
      lead.messageCount,
      lead.createdAt.toLocaleDateString()
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    res.send(csv);
  } catch (error) {
    console.error('❌ Export leads error:', error.message);
    res.status(500).json({
      success: false,
      code: 'LEAD_EXPORT_ERROR',
      message: 'Failed to export leads',
      error: error.message
    });
  }
};

export default {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  autoCaptureLead,
  getLeadStats,
  markStaleLeads,
  exportLeads
};
