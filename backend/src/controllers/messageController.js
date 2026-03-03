import whatsappService from '../services/whatsappService.js';
import Message from '../models/Message.js';
import { uploadMediaToS3 } from '../services/s3Service.js';
import { broadcastNewMessage, broadcastConversationUpdate, broadcastMessageStatus, broadcastSentMessage } from '../services/socketService.js';

/**
 * Message Controller
 * Handles message sending and retrieval
 */

// Socket.io instance (passed from app.js)
let io = null;

export const setSocketIO = (socketIOInstance) => {
  io = socketIOInstance;
};

/**
 * POST /api/messages/send - Send text message
 * 
 * SIMPLE MODE (Enromatics):
 *   Body: { recipientPhone, message }
 * 
 * ADVANCED MODE (Shopify/Multi-phone):
 *   Body: { phoneNumberId, recipientPhone, message }
 */
export const sendTextMessage = async (req, res) => {
  try {
    // Use String for database queries - all models use String accountId
    // req.account.accountId is the String (from jwtAuth middleware)
    // Message model stores accountId as String
    const accountId = req.account.accountId;
    const phoneNumberId = req.phoneNumberId; // From phoneNumberHelper (auto-detected or validated)
    const { recipientPhone, message, campaign } = req.body;
    
    // Validate required fields
    if (!accountId) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
        error: 'INVALID_SESSION'
      });
    }
    
    if (!phoneNumberId) {
      return res.status(400).json({
        success: false,
        message: 'No WhatsApp phone number configured. Add your phone number in Settings before sending messages.',
        error: 'MISSING_PHONE',
        nextStep: 'Go to Settings → WhatsApp Integration → Add Phone Number'
      });
    }
    
    if (!recipientPhone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: recipientPhone and message cannot be empty',
        error: 'MISSING_FIELDS',
        required: ['recipientPhone', 'message']
      });
    }
    
    // Validate phone number format (should be digits only, no + or spaces)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(recipientPhone)) {
      console.error('❌ Invalid phone format:', recipientPhone);
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Use only digits (e.g., 918087131777) without spaces or +.',
        error: 'INVALID_PHONE_FORMAT',
        examples: ['918087131777', '14155552671', '447911123456'],
        received: recipientPhone,
        receivedLength: recipientPhone.length,
        expectedRange: '10-15 digits'
      });
    }
    
    console.log(`📤 Sending text message [${req.phoneNumberMode}]:`, {
      accountId: accountId ? accountId.toString() : 'UNDEFINED',
      phoneNumberId,
      recipientPhone,
      recipientPhoneLength: recipientPhone.length,
      message: message.substring(0, 50) + '...'
    });
    
    const result = await whatsappService.sendTextMessage(
      accountId,
      phoneNumberId,
      recipientPhone,
      message,
      { campaign: campaign || 'manual' }
    );
    
    // 📡 Broadcast sent message in realtime
    if (result.message && io) {
      broadcastSentMessage(io, result.message, accountId);
    }
    
    res.json({
      success: true,
      message: 'Message sent successfully',
      data: result,
      phoneNumberUsed: phoneNumberId,
      mode: req.phoneNumberMode // 'auto' or 'explicit'
    });
    
  } catch (error) {
    console.error('❌ Send text message error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    // Provide user-friendly error messages
    let userMessage = 'Failed to send message. Please try again.';
    let errorCode = 'MESSAGE_SEND_ERROR';
    let nextStep = 'Please try again or contact support.';
    
    if (error.message?.includes('phone')) {
      userMessage = 'WhatsApp phone number is not available. Please check your phone configuration.';
      errorCode = 'PHONE_NOT_AVAILABLE';
      nextStep = 'Go to Settings → WhatsApp Integration to verify your phone number.';
    } else if (error.message?.includes('recipient') || error.message?.includes('invalid')) {
      userMessage = 'Invalid recipient phone number or message content.';
      errorCode = 'INVALID_RECIPIENT';
      nextStep = 'Check the phone number format and try again.';
    } else if (error.message?.includes('rate')) {
      userMessage = 'Too many messages sent. Please try again in a moment.';
      errorCode = 'RATE_LIMITED';
      nextStep = 'Wait a moment and try again.';
    } else if (error.message?.includes('account') || error.message?.includes('permission')) {
      userMessage = 'Account permission error. Please reconnect your WhatsApp account.';
      errorCode = 'PERMISSION_ERROR';
      nextStep = 'Go to Settings → WhatsApp Integration → Reconnect.';
    }
    
    res.status(500).json({
      success: false,
      message: userMessage,
      error: errorCode,
      details: error.message,
      nextStep
    });
  }
};

/**
 * POST /api/messages/send-template - Send template message
 */
export const sendTemplateMessage = async (req, res) => {
  try {
    const accountId = req.account.accountId; // Use String for database queries
    const phoneNumberId = req.phoneNumberId; // From phoneNumberHelper middleware
    const { recipientPhone, templateName, params, campaign } = req.body;
    
    if (!recipientPhone || !templateName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: recipientPhone, templateName'
      });
    }
    
    console.log('📋 Sending template message:', {
      accountId,
      phoneNumberId,
      recipientPhone,
      templateName,
      params
    });
    
    const result = await whatsappService.sendTemplateMessage(
      accountId,
      phoneNumberId,
      recipientPhone,
      templateName,
      params || [],
      { campaign: campaign || 'manual' }
    );
    
    res.json({
      success: true,
      message: 'Template message sent successfully',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Send template message error:', error);
    res.status(500).json({
      success: false,
      code: 'TEMPLATE_MESSAGE_ERROR',
      message: error.message || 'Failed to send template message'
    });
  }
};

/**
 * GET /api/messages - Get message history
 * Query params:
 *   - phoneNumberId: filter by phone number
 *   - status: filter by message status
 *   - tag: filter by contact tag (messages from contacts with this tag)
 *   - limit: pagination limit (default 50)
 *   - skip: pagination skip (default 0)
 */
export const getMessages = async (req, res) => {
  try {
    const accountId = req.account.accountId; // Use String for database queries
    const { phoneNumberId, status, tag, limit = 50, skip = 0 } = req.query;
    
    const query = { accountId };
    if (phoneNumberId) query.phoneNumberId = phoneNumberId;
    if (status) query.status = status;
    
    // If tag filter is specified, find contacts with that tag and filter messages
    if (tag) {
      const Contact = require('../models/Contact.js').default;
      const Conversation = require('../models/Conversation.js').default;
      
      try {
        // Find contacts with the specified tag
        const contacts = await Contact.find({
          accountId,
          tags: tag
        }).lean();
        
        if (contacts.length === 0) {
          // No contacts with this tag, return empty results
          return res.json({
            success: true,
            messages: [],
            pagination: {
              total: 0,
              limit: parseInt(limit),
              skip: parseInt(skip),
              hasMore: false
            }
          });
        }
        
        // Get phone numbers of these contacts
        const contactPhones = contacts.map(c => c.whatsappNumber);
        
        // Find conversations for these contacts
        const conversations = await Conversation.find({
          accountId,
          userPhone: { $in: contactPhones }
        }).lean();
        
        if (conversations.length === 0) {
          // No conversations for these contacts, return empty results
          return res.json({
            success: true,
            messages: [],
            pagination: {
              total: 0,
              limit: parseInt(limit),
              skip: parseInt(skip),
              hasMore: false
            }
          });
        }
        
        // Get conversation IDs
        const conversationIds = conversations.map(c => c._id);
        
        // Add conversation filter to query
        query.conversationId = { $in: conversationIds };
      } catch (tagError) {
        console.error('❌ Tag filter error:', tagError);
        // Continue without tag filter on error
      }
    }
    
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();
    
    const total = await Message.countDocuments(query);
    
    res.json({
      success: true,
      messages,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > (parseInt(skip) + parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({
      success: false,
      code: 'MESSAGES_FETCH_ERROR',
      message: error.message
    });
  }
};

/**
 * GET /api/messages/:id - Get single message
 */
export const getMessage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const message = await Message.findById(id).lean();
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    res.json({
      success: true,
      message
    });
    
  } catch (error) {
    console.error('❌ Get message error:', error);
    res.status(500).json({
      success: false,
      code: 'MESSAGE_FETCH_ERROR',
      message: error.message
    });
  }
};

/**
 * POST /api/messages/send-media - Send media message with file upload
 */
export const sendMediaMessage = async (req, res) => {
  try {
    const accountId = req.account.accountId; // Use String accountId
    const phoneNumberId = req.phoneNumberId; // From phoneNumberHelper middleware
    const { recipientPhone, caption, campaign } = req.body;
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    if (!recipientPhone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: recipientPhone'
      });
    }
    
    const file = req.file;
    
    // Determine media type from MIME type
    let mediaType = 'document';
    if (file.mimetype.startsWith('image/')) {
      mediaType = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      mediaType = 'video';
    }
    
    console.log('📤 Sending media message:', {
      accountId,
      phoneNumberId,
      recipientPhone,
      mediaType,
      filename: file.originalname,
      size: file.size
    });
    
    // Upload file to S3
    console.log('⬆️ Uploading to S3...');
    const s3Result = await uploadMediaToS3(
      file.buffer,
      accountId,
      mediaType,
      file.mimetype,
      file.originalname
    );
    
    console.log('✅ S3 upload complete:', s3Result.url);
    
    // Send via WhatsApp - pass file buffer for WhatsApp upload
    const result = await whatsappService.sendMediaMessage(
      accountId,
      phoneNumberId,
      recipientPhone,
      s3Result.url,
      mediaType,
      caption || '',
      { 
        campaign: campaign || 'manual',
        filename: file.originalname,
        fileBuffer: file.buffer,  // Pass buffer for WhatsApp upload
        mimeType: file.mimetype
      }
    );
    
    res.json({
      success: true,
      message: 'Media message sent successfully',
      data: {
        ...result,
        mediaUrl: s3Result.url,
        mediaType,
        filename: file.originalname
      }
    });
    
  } catch (error) {
    console.error('❌ Send media message error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export default {
  sendTextMessage,
  sendTemplateMessage,
  getMessages,
  getMessage,
  sendMediaMessage
};
