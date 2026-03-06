/**
 * Integrations Controller
 * Handles requests from third-party apps (Enromatics, etc.)
 * using integration tokens (wpk_live_)
 * 
 * Features: Chat, Conversations, Contacts, Chatbots, Broadcast, Settings
 */

import whatsappService from '../services/whatsappService.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Contact from '../models/Contact.js';
import PhoneNumber from '../models/PhoneNumber.js';
import Account from '../models/Account.js';
import Template from '../models/Template.js';

/**
 * POST /api/integrations/send-message
 * Send message via integration token (Enromatics, third-party apps)
 */
export const sendMessageViaIntegration = async (req, res) => {
  try {
    const accountId = req.accountId; // From integration auth middleware
    const { recipientPhone, message } = req.body;

    if (!recipientPhone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: recipientPhone, message'
      });
    }

    console.log(`📤 [INTEGRATION] Sending message via Enromatics:`, {
      accountId,
      recipientPhone,
      messageLength: message.length
    });

    // Get default/active phone number for this account
    const phoneNumber = await PhoneNumber.findOne({
      accountId: req.account.accountId,  // Use String for database query
      isActive: true
    }).sort({ createdAt: -1 });

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'No active WhatsApp phone number configured for this account'
      });
    }

    // Send message via WhatsApp service
    const result = await whatsappService.sendTextMessage(
      accountId,
      phoneNumber.phoneNumberId,
      recipientPhone,
      message,
      { campaign: 'enromatics' }
    );

    return res.json({
      success: true,
      message: 'Message sent successfully via Enromatics',
      data: {
        messageId: result.messageId,
        waMessageId: result.waMessageId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Send message error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send message',
      error: error.message
    });
  }
};

/**
 * GET /api/integrations/conversations
 * Get conversations for account (used by Enromatics to fetch chat list)
 */
export const getConversationsViaIntegration = async (req, res) => {
  try {
    const accountId = req.accountId; // From integration auth middleware
    const { limit = 50, offset = 0 } = req.query;

    console.log(`📭 [INTEGRATION] Fetching conversations for Enromatics:`, {
      accountId,
      limit,
      offset
    });

    // Fetch conversations
    const conversations = await Conversation.find({ accountId: req.account.accountId })
      .sort({ lastMessageAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const totalCount = await Conversation.countDocuments({ accountId: req.account.accountId });

    return res.json({
      success: true,
      data: {
        conversations,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < totalCount
        }
      }
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Get conversations error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message
    });
  }
};

/**
 * GET /api/integrations/conversations/:id
 * Get single conversation details
 */
export const getConversationDetailsViaIntegration = async (req, res) => {
  try {
    const accountId = req.accountId;
    const { id: conversationId } = req.params;

    console.log(`💬 [INTEGRATION] Fetching conversation details:`, { accountId, conversationId });

    const conversation = await Conversation.findOne({
      conversationId: conversationId,
      accountId
    }).lean();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    return res.json({
      success: true,
      data: conversation
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Get conversation details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation details',
      error: error.message
    });
  }
};

/**
 * GET /api/integrations/conversations/:id/messages
 * Get messages for a conversation
 */
export const getConversationMessagesViaIntegration = async (req, res) => {
  try {
    const accountId = req.accountId;
    const { id: conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    console.log(`📨 [INTEGRATION] Fetching conversation messages:`, { accountId, conversationId, limit, offset });

    // Verify conversation belongs to account
    const conversation = await Conversation.findOne({
      conversationId: conversationId,
      accountId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // CRITICAL FIX: Message model uses accountId + phoneNumberId + recipientPhone
    // NOT conversationId. Use conversation details to query messages.
    const messageQuery = {
      accountId: conversation.accountId,
      phoneNumberId: conversation.phoneNumberId,
      recipientPhone: conversation.userPhone
    };

    console.log(`📨 [INTEGRATION] Message query:`, messageQuery);

    // Fetch messages
    const messages = await Message.find(messageQuery)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    const totalCount = await Message.countDocuments(messageQuery);

    return res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < totalCount
        }
      }
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Get conversation messages error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};

/**
 * POST /api/integrations/conversations/:id/reply
 * Reply to a conversation
 */
export const replyToConversationViaIntegration = async (req, res) => {
  try {
    const accountId = req.accountId;
    const { id: conversationId } = req.params;
    const { message, mediaUrl, mediaType } = req.body;

    if (!message && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Message or mediaUrl is required'
      });
    }

    console.log(`💬 [INTEGRATION] Replying to conversation:`, { accountId, conversationId, messageLength: message?.length });

    // Get conversation
    const conversation = await Conversation.findOne({
      conversationId: conversationId,
      accountId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Get active phone number
    const phoneNumber = await PhoneNumber.findOne({
      accountId,
      isActive: true
    }).sort({ createdAt: -1 });

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'No active WhatsApp phone number configured'
      });
    }

    // Send message
    const result = await whatsappService.sendTextMessage(
      accountId,
      phoneNumber.phoneNumberId,
      conversation.userPhone,
      message,
      { campaign: 'enromatics', conversationId }
    );

    return res.json({
      success: true,
      message: 'Reply sent successfully',
      data: {
        messageId: result.messageId,
        waMessageId: result.waMessageId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Reply error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send reply',
      error: error.message
    });
  }
};

/**
 * GET /api/integrations/contacts
 * Get all contacts
 */
export const getContactsViaIntegration = async (req, res) => {
  try {
    const accountId = req.accountId;
    const { limit = 100, offset = 0, search } = req.query;

    console.log(`👥 [INTEGRATION] Fetching contacts:`, { accountId, limit, offset, search });

    let query = { accountId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    const totalCount = await Contact.countDocuments(query);

    return res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < totalCount
        }
      }
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Get contacts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts',
      error: error.message
    });
  }
};

/**
 * GET /api/integrations/contacts/:id
 * Get single contact
 */
export const getContactViaIntegration = async (req, res) => {
  try {
    const accountId = req.accountId;
    const { id: contactId } = req.params;

    const contact = await Contact.findOne({
      _id: contactId,
      accountId
    }).lean();

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    return res.json({
      success: true,
      data: contact
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Get contact error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch contact',
      error: error.message
    });
  }
};

/**
 * POST /api/integrations/contacts
 * Create new contact
 */
export const createContactViaIntegration = async (req, res) => {
  try {
    const accountId = req.accountId;
    const { name, phone, email, tags = [] } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    console.log(`➕ [INTEGRATION] Creating contact:`, { accountId, name, phone });

    const contact = new Contact({
      accountId,
      name,
      phone,
      email,
      tags,
      source: 'enromatics'
    });

    await contact.save();

    return res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: contact
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Create contact error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create contact',
      error: error.message
    });
  }
};

/**
 * PUT /api/integrations/contacts/:id
 * Update contact
 */
export const updateContactViaIntegration = async (req, res) => {
  try {
    const accountId = req.accountId;
    const { id: contactId } = req.params;
    const { name, phone, email, tags } = req.body;

    const contact = await Contact.findOneAndUpdate(
      { _id: contactId, accountId },
      {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(tags && { tags })
      },
      { new: true, lean: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    return res.json({
      success: true,
      message: 'Contact updated successfully',
      data: contact
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Update contact error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update contact',
      error: error.message
    });
  }
};

/**
 * DELETE /api/integrations/contacts/:id
 * Delete contact
 */
export const deleteContactViaIntegration = async (req, res) => {
  try {
    const accountId = req.accountId;
    const { id: contactId } = req.params;

    const contact = await Contact.findOneAndDelete({
      _id: contactId,
      accountId
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    return res.json({
      success: true,
      message: 'Contact deleted successfully'
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Delete contact error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete contact',
      error: error.message
    });
  }
};

/**
 * GET /api/integrations/account/config
 * Get account configuration
 */
export const getAccountConfigViaIntegration = async (req, res) => {
  try {
    const accountObjectId = req.account._id; // Use ObjectId for database queries

    console.log(`⚙️ [INTEGRATION] Fetching account config:`, { accountId: req.accountId });

    const account = await Account.findById(accountObjectId).select('accountId name email type plan status').lean();

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Get phone numbers
    const phoneNumbers = await PhoneNumber.find({ accountId: accountObjectId }).select('phoneNumberId displayName phone isActive').lean();

    return res.json({
      success: true,
      data: {
        account: {
          accountId: account.accountId,
          name: account.name,
          email: account.email,
          type: account.type,
          plan: account.plan,
          status: account.status
        },
        phoneNumbers,
        integrationToken: '***' // Don't expose token details
      }
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Get account config error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch account config',
      error: error.message
    });
  }
};

/**
 * GET /api/integrations/health
 * Health check endpoint
 */
export const healthCheckViaIntegration = async (req, res) => {
  try {
    const accountId = req.account.accountId;

    // Quick database check
    const account = await Account.findOne({ accountId }).select('_id').lean();

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    return res.json({
      success: true,
      message: 'Integration connection healthy',
      data: {
        accountId,
        timestamp: new Date().toISOString(),
        authenticated: true
      }
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Health check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
};

/**
 * POST /api/integrations/broadcast
 * Send broadcast message to multiple contacts
 */
export const sendBroadcastViaIntegration = async (req, res) => {
  try {
    const accountId = req.accountId;
    const { message, contactIds, tags } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    if (!contactIds?.length && !tags?.length) {
      return res.status(400).json({
        success: false,
        message: 'Either contactIds or tags is required'
      });
    }

    console.log(`📢 [INTEGRATION] Broadcasting message:`, { accountId, contactCount: contactIds?.length || 'filtered by tags' });

    // Build query for contacts
    let contactQuery = { accountId };
    if (contactIds?.length) {
      contactQuery._id = { $in: contactIds };
    } else if (tags?.length) {
      contactQuery.tags = { $in: tags };
    }

    const contacts = await Contact.find(contactQuery).select('_id phone').lean();

    if (contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No contacts found matching criteria'
      });
    }

    // Get active phone number
    const phoneNumber = await PhoneNumber.findOne({
      accountId,
      isActive: true
    }).sort({ createdAt: -1 });

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'No active WhatsApp phone number configured'
      });
    }

    // Send to all contacts (async, don't wait for completion)
    let successCount = 0;
    let failureCount = 0;

    for (const contact of contacts) {
      try {
        await whatsappService.sendTextMessage(
          accountId,
          phoneNumber.phoneNumberId,
          contact.phone,
          message,
          { campaign: 'enromatics_broadcast', source: 'broadcast' }
        );
        successCount++;
      } catch (err) {
        console.error(`Failed to send to ${contact.phone}:`, err);
        failureCount++;
      }
    }

    return res.json({
      success: true,
      message: 'Broadcast started',
      data: {
        totalContacts: contacts.length,
        successCount,
        failureCount,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Broadcast error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send broadcast',
      error: error.message
    });
  }
};

/**
 * GET /api/integrations/templates
 * Get all templates for account
 */
export const getTemplatesViaIntegration = async (req, res) => {
  try {
    const accountId = req.accountId;
    const { limit = 50, offset = 0, status, category } = req.query;

    console.log(`📋 [INTEGRATION] Fetching templates:`, { accountId, limit, offset, status, category });

    const query = { accountId: req.account.accountId, deleted: false };
    if (status) query.status = status;
    if (category) query.category = category;

    const templates = await Template.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    const totalCount = await Template.countDocuments(query);

    const stats = {
      approved: await Template.countDocuments({ accountId: req.account.accountId, status: 'approved', deleted: false }),
      pending: await Template.countDocuments({ accountId: req.account.accountId, status: 'pending', deleted: false }),
      rejected: await Template.countDocuments({ accountId: req.account.accountId, status: 'rejected', deleted: false }),
      draft: await Template.countDocuments({ accountId: req.account.accountId, status: 'draft', deleted: false }),
      total: await Template.countDocuments({ accountId: req.account.accountId, deleted: false })
    };

    return res.json({
      success: true,
      data: {
        templates,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < totalCount
        },
        stats
      }
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Get templates error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
};

/**
 * GET /api/integrations/templates/:id
 * Get single template details
 */
export const getTemplateDetailsViaIntegration = async (req, res) => {
  try {
    const accountId = req.accountId;
    const { id: templateId } = req.params;

    console.log(`📋 [INTEGRATION] Fetching template:`, { accountId, templateId });

    const template = await Template.findOne({
      _id: templateId,
      accountId,
      deleted: false
    }).lean();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    return res.json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Get template details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch template details',
      error: error.message
    });
  }
};

/**
 * POST /api/integrations/templates/send
 * Send template message to recipient
 */
export const sendTemplateMessageViaIntegration = async (req, res) => {
  try {
    const accountId = req.accountId;
    const { templateName, recipientPhone, variables, language = 'en' } = req.body;

    if (!templateName || !recipientPhone) {
      return res.status(400).json({
        success: false,
        message: 'templateName and recipientPhone are required'
      });
    }

    console.log(`📬 [INTEGRATION] Sending template message:`, { accountId, templateName, recipientPhone });

    const template = await Template.findOne({
      accountId,
      name: templateName,
      status: 'approved',
      deleted: false
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: `Template '${templateName}' not found or not approved`
      });
    }

    const phoneNumber = await PhoneNumber.findOne({
      accountId,
      isActive: true
    }).sort({ createdAt: -1 });

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'No active WhatsApp phone number configured'
      });
    }

    const result = await whatsappService.sendTemplateMessage(
      accountId,
      phoneNumber.phoneNumberId,
      recipientPhone,
      template.name,
      variables || [],
      language
    );

    await Template.updateOne(
      { _id: template._id },
      { 
        usageCount: template.usageCount + 1,
        lastUsedAt: new Date()
      }
    );

    return res.json({
      success: true,
      message: 'Template message sent successfully',
      data: {
        messageId: result.messageId,
        waMessageId: result.waMessageId,
        templateName: template.name,
        recipientPhone,
        status: 'sent',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Send template message error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send template message',
      error: error.message
    });
  }
};

/**
 * PUT /api/integrations/templates/:id
 * Update template
 */
export const updateTemplateViaIntegration = async (req, res) => {
  try {
    const accountId = req.accountId;
    const { id: templateId } = req.params;
    const { name, category, content } = req.body;

    const template = await Template.findOne({
      _id: templateId,
      accountId,
      deleted: false
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    if (name) template.name = name;
    if (category) template.category = category;
    if (content) template.content = content;
    template.status = 'draft';

    await template.save();

    return res.json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Update template error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update template',
      error: error.message
    });
  }
};

/**
 * DELETE /api/integrations/templates/:id
 * Soft delete a template
 */
export const deleteTemplateViaIntegration = async (req, res) => {
  try {
    const accountId = req.accountId;
    const { id: templateId } = req.params;

    const template = await Template.findOne({
      _id: templateId,
      accountId,
      deleted: false
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    template.deleted = true;
    await template.save();

    return res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('❌ [INTEGRATION] Delete template error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error.message
    });
  }
};
