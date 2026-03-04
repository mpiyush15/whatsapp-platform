import Template from '../models/Template.js';
import PhoneNumber from '../models/PhoneNumber.js';
import axios from 'axios';

const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';

/**
 * Template Controller
 * Manages WhatsApp message templates
 */

/**
 * GET /api/templates - Get all templates
 */
export const getTemplates = async (req, res) => {
  try {
    const accountId = req.account.accountId; // Use String accountId (matches source of truth)
    const { status, category } = req.query;
    
    const query = { accountId, deleted: false };
    if (status) query.status = status;
    if (category) query.category = category;
    
    const templates = await Template.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    // Calculate stats
    const stats = {
      approved: await Template.countDocuments({ accountId, status: 'approved', deleted: false }),
      pending: await Template.countDocuments({ accountId, status: 'pending', deleted: false }),
      rejected: await Template.countDocuments({ accountId, status: 'rejected', deleted: false }),
      draft: await Template.countDocuments({ accountId, status: 'draft', deleted: false }),
      total: await Template.countDocuments({ accountId, deleted: false })
    };
    
    res.json({
      success: true,
      templates,
      stats
    });
    
  } catch (error) {
    console.error('❌ Get templates error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /api/templates/:id - Get single template
 */
export const getTemplate = async (req, res) => {
  try {
    const accountId = req.account.accountId; // Use String accountId (matches source of truth)
    const { id } = req.params;
    
    const template = await Template.findOne({ 
      _id: id, 
      accountId,
      deleted: false 
    }).lean();
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      template
    });
    
  } catch (error) {
    console.error('❌ Get template error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /api/templates - Create template
 */
export const createTemplate = async (req, res) => {
  try {
    const accountId = req.account.accountId; // Use String accountId (matches source of truth)
    const { name, language, category, content, variables, components, hasMedia, mediaType, mediaUrl, headerText, footerText } = req.body;
    
    // Handle file upload
    let finalMediaUrl = mediaUrl;
    let mediaFilePath = null;
    let mediaFileName = null;
    
    if (req.file) {
      // File was uploaded
      mediaFileName = req.file.originalname;
      mediaFilePath = `/uploads/templates/${req.file.filename}`;
      finalMediaUrl = `${process.env.BACKEND_URL || 'https://whatsapp-platform-production-e48b.up.railway.app'}/api${mediaFilePath}`;
    }
    
    if (!name || !content) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, content'
      });
    }
    
    // Check if template name already exists
    const existing = await Template.findOne({ 
      accountId, 
      name: name.toLowerCase().replace(/\s+/g, '_'),
      deleted: false 
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Template with this name already exists'
      });
    }

    // Build components array
    let templateComponents = components || [];
    
    // Add HEADER component if media is included
    if (hasMedia && (finalMediaUrl || req.file)) {
      const headerComponent = {
        type: 'HEADER',
        format: mediaType || 'IMAGE',
      };
      
      if (mediaType === 'IMAGE') {
        headerComponent.example = {
          header_handle: [finalMediaUrl || mediaUrl]
        };
      } else if (mediaType === 'VIDEO') {
        headerComponent.example = {
          header_handle: [finalMediaUrl || mediaUrl]
        };
      } else if (mediaType === 'DOCUMENT') {
        headerComponent.example = {
          header_handle: [finalMediaUrl || mediaUrl]
        };
        if (headerText) {
          headerComponent.text = headerText;
        }
      }
      
      templateComponents.unshift(headerComponent);
    }
    
    // Add BODY component (main content)
    const bodyVariables = [];
    const variableMatches = content.match(/\{\{(\d+)\}\}/g) || [];
    variableMatches.forEach((match, index) => {
      bodyVariables.push({
        type: 'text',
        text: `sample_${index + 1}`
      });
    });
    
    const bodyComponent = {
      type: 'BODY',
      text: content
    };
    
    if (bodyVariables.length > 0) {
      bodyComponent.example = {
        body_text: [bodyVariables.map(v => v.text)]
      };
    }
    
    templateComponents.push(bodyComponent);
    
    // Add FOOTER component if provided
    if (footerText) {
      templateComponents.push({
        type: 'FOOTER',
        text: footerText
      });
    }
    
    const template = await Template.create({
      accountId,
      name: name.toLowerCase().replace(/\s+/g, '_'),
      language: language || 'en',
      category: category || 'UTILITY',
      content,
      variables: variables || [...new Set(variableMatches.map(v => v.replace(/[{}]/g, '')))],
      components: templateComponents,
      status: 'draft',
      hasMedia: hasMedia || false,
      mediaType: mediaType || 'IMAGE',
      mediaUrl: finalMediaUrl || mediaUrl,
      mediaFilePath: mediaFilePath,
      mediaFileName: mediaFileName,
      headerText: headerText || '',
      footerText: footerText || ''
    });
    
    res.json({
      success: true,
      message: 'Template created successfully. Submit for Meta approval to use it.',
      template
    });
    
  } catch (error) {
    console.error('❌ Create template error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * PUT /api/templates/:id - Update template
 */
export const updateTemplate = async (req, res) => {
  try {
    const accountId = req.account.accountId; // Use String accountId (matches source of truth)
    const { id } = req.params;
    const { name, language, category, content, variables, components } = req.body;
    
    const template = await Template.findOne({ 
      _id: id, 
      accountId,
      deleted: false 
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    // Only allow editing draft templates
    if (template.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only edit draft templates. Create a new version for approved templates.'
      });
    }
    
    if (name) template.name = name.toLowerCase().replace(/\s+/g, '_');
    if (language) template.language = language;
    if (category) template.category = category;
    if (content) template.content = content;
    if (variables) template.variables = variables;
    if (components) template.components = components;
    
    await template.save();
    
    res.json({
      success: true,
      message: 'Template updated successfully',
      template
    });
    
  } catch (error) {
    console.error('❌ Update template error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * DELETE /api/templates/:id - Soft delete template
 */
export const deleteTemplate = async (req, res) => {
  try {
    const accountId = req.account.accountId; // Use String accountId (matches source of truth)
    const { id } = req.params;
    
    const template = await Template.findOne({ 
      _id: id, 
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
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Delete template error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /api/templates/:id/submit - Submit template to Meta for approval
 * 
 * CRITICAL: This submits the template to Meta Cloud API
 * Only approved templates can be used for sending messages
 */
export const submitTemplateToMeta = async (req, res) => {
  try {
    const accountId = req.account.accountId; // Use String accountId (matches source of truth)
    const { id } = req.params;

    // Get template
    const template = await Template.findOne({ 
      _id: id, 
      accountId,
      deleted: false 
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
        error: 'TEMPLATE_NOT_FOUND'
      });
    }

    if (template.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Template is already ${template.status}. Only draft templates can be submitted.`,
        error: 'INVALID_TEMPLATE_STATUS',
        currentStatus: template.status
      });
    }

    // ✅ CRITICAL FIX: Validate template has all required components
    if (!template.components || template.components.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Template has no components. Add at least a BODY component before submitting.',
        error: 'MISSING_TEMPLATE_COMPONENTS'
      });
    }

    // ✅ CRITICAL FIX: Validate template name is valid for Meta
    // Meta requires lowercase, alphanumeric, underscore only
    const validNameRegex = /^[a-z0-9_]+$/;
    if (!validNameRegex.test(template.name)) {
      return res.status(400).json({
        success: false,
        message: 'Template name contains invalid characters. Meta allows only lowercase letters, numbers, and underscores.',
        error: 'INVALID_TEMPLATE_NAME',
        providedName: template.name,
        example: 'order_confirmation_template'
      });
    }

    // Get phone number config to get WABA ID and access token
    // ✅ FIX: Use ObjectId for PhoneNumber query
    const phoneConfig = await PhoneNumber.findOne({ 
      accountId: req.account.accountId,  // Account reference using String format
      isActive: true 
    }).select('+accessToken');

    if (!phoneConfig || !phoneConfig.wabaId) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp Business Account not configured. Please add your phone number first.',
        error: 'MISSING_WABA_CONFIG'
      });
    }

    const wabaId = phoneConfig.wabaId;
    const accessToken = phoneConfig.accessToken;

    // ✅ CRITICAL FIX: Validate access token is available
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Access token not available. Phone number may not be properly configured.',
        error: 'MISSING_ACCESS_TOKEN'
      });
    }

    // Build Meta template request
    const metaTemplate = {
      name: template.name,
      language: template.language || 'en',
      category: template.category || 'UTILITY',
      components: template.components
    };

    console.log('📤 Submitting template to Meta:', {
      wabaId,
      templateName: template.name,
      components: template.components.length
    });

    // Submit to Meta
    const response = await axios.post(
      `${GRAPH_API_URL}/${wabaId}/message_templates`,
      metaTemplate,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    const metaId = response.data?.id;

    if (!metaId) {
      return res.status(500).json({
        success: false,
        message: 'Meta API returned no template ID. Submission may have failed.',
        error: 'INVALID_META_RESPONSE',
        rawResponse: response.data
      });
    }

    // Update template status and store Meta ID
    template.status = 'pending';
    template.metaTemplateId = metaId;
    template.submittedAt = new Date();
    await template.save();

    console.log(`✅ Template submitted to Meta: ${template.name} (ID: ${metaId})`);

    res.json({
      success: true,
      message: 'Template submitted to Meta for approval. This usually takes 1-2 hours.',
      template: {
        _id: template._id,
        name: template.name,
        status: template.status,
        metaTemplateId: metaId,
        submittedAt: template.submittedAt
      }
    });

  } catch (error) {
    console.error('❌ Submit template error:', error.response?.data || error.message);
    
    // ✅ CRITICAL FIX: Return proper error response with details
    const metaError = error.response?.data?.error;
    const errorMessage = metaError?.message || error.message;
    const errorCode = metaError?.code || error.response?.status;
    
    // Provide actionable error messages
    let userMessage = errorMessage;
    let action = '';
    
    if (errorCode === 'INVALID_TEMPLATE_NAME') {
      userMessage = 'Template name contains invalid characters. Use only lowercase letters, numbers, and underscores.';
      action = 'Rename your template and try again.';
    } else if (errorCode === 100 || errorMessage?.includes('duplicate')) {
      userMessage = 'A template with this name already exists on your Meta account.';
      action = 'Rename your template or delete the old one from Meta first.';
    } else if (errorCode === 400 || errorMessage?.includes('invalid')) {
      userMessage = 'Template structure is invalid. Check your components and variables.';
      action = 'Review your template components and try again.';
    } else if (errorCode === 403) {
      userMessage = 'Permission denied. Access token may be expired or invalid.';
      action = 'Reconnect your WhatsApp account in Settings.';
    }
    
    res.status(500).json({
      success: false,
      message: userMessage,
      error: 'TEMPLATE_SUBMISSION_FAILED',
      metaErrorCode: errorCode,
      suggestedAction: action,
      rawError: errorMessage
    });
  }
};

/**
 * POST /api/templates/sync - Sync templates from WhatsApp Manager
 */
export const syncTemplates = async (req, res) => {
  try {
    // ✅ CRITICAL FIX: Use String accountId - PhoneNumber stores accountId as String
    const accountId = req.account.accountId;  // Use String (matches PhoneNumber schema)
    
    // Get phone number config to get WABA ID and access token
    const phoneConfig = await PhoneNumber.findOne({ 
      accountId, 
      isActive: true 
    }).select('+accessToken');
    
    if (!phoneConfig) {
      return res.status(400).json({
        success: false,
        message: 'No active WhatsApp phone number found. Please configure your WhatsApp account first.',
        error: 'NO_ACTIVE_PHONE',
        nextStep: 'Go to Settings → WhatsApp Integration to add your phone number'
      });
    }

    if (!phoneConfig.wabaId) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp Business Account ID not found. Your phone number may not be properly configured.',
        error: 'MISSING_WABA_ID',
        nextStep: 'Try disconnecting and reconnecting your WhatsApp account in Settings'
      });
    }

    if (!phoneConfig.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Access token expired. Please reconnect your WhatsApp account.',
        error: 'MISSING_ACCESS_TOKEN',
        nextStep: 'Go to Settings → WhatsApp Integration → Reconnect'
      });
    }

    const wabaId = phoneConfig.wabaId;
    const accessToken = phoneConfig.accessToken;

    // Fetch templates from WhatsApp API
    let response;
    try {
      response = await axios.get(
        `${GRAPH_API_URL}/${wabaId}/message_templates`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          params: { limit: 100 }
        }
      );
    } catch (apiError) {
      if (apiError.response?.status === 401) {
        return res.status(401).json({
          success: false,
          message: 'WhatsApp access token has expired. Please reconnect your account.',
          error: 'TOKEN_EXPIRED',
          nextStep: 'Go to Settings → WhatsApp Integration → Reconnect'
        });
      } else if (apiError.response?.status === 403) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied. Your WhatsApp account may not have template management permissions.',
          error: 'INSUFFICIENT_PERMISSIONS',
          nextStep: 'Verify your WhatsApp account has the correct permissions'
        });
      }
      throw apiError;
    }

    const metaTemplates = response.data.data || [];
    
    if (metaTemplates.length === 0) {
      return res.json({
        success: true,
        message: 'No templates found in your WhatsApp Manager. Create templates from your WhatsApp Business Account Dashboard and sync again.',
        synced: 0,
        created: 0,
        updated: 0
      });
    }

    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    for (const metaTemplate of metaTemplates) {
      try {
        // Extract template details
        const name = metaTemplate.name;
        const language = metaTemplate.language;
        const category = metaTemplate.category;
        const status = metaTemplate.status; // APPROVED, PENDING, REJECTED
        const metaTemplateId = metaTemplate.id;
        const components = metaTemplate.components || [];

        // Extract content from BODY component
        let content = '';
        let variables = [];
        
        const bodyComponent = components.find(c => c.type === 'BODY');
        if (bodyComponent && bodyComponent.text) {
          content = bodyComponent.text;
          
          // Extract variables ({{1}}, {{2}}, etc.)
          const variableMatches = content.match(/\{\{(\d+)\}\}/g) || [];
          variables = [...new Set(variableMatches.map(v => v.replace(/[{}]/g, '')))];
        }

        // Check if template already exists
        const existingTemplate = await Template.findOne({
          accountId: accountId,
          metaTemplateId: metaTemplateId
        });

        if (existingTemplate) {
          // Update existing template
          existingTemplate.name = name;
          existingTemplate.language = language;
          existingTemplate.category = category;
          existingTemplate.content = content;
          existingTemplate.variables = variables;
          existingTemplate.components = components;
          existingTemplate.status = status.toLowerCase();
          
          if (status === 'REJECTED' && metaTemplate.rejected_reason) {
            existingTemplate.rejectedReason = metaTemplate.rejected_reason;
          }
          
          await existingTemplate.save();
          updatedCount++;
        } else {
          // Create new template
          await Template.create({
            accountId: accountId,
            name: name,
            language: language,
            category: category,
            content: content,
            variables: variables,
            components: components,
            status: status.toLowerCase(),
            metaTemplateId: metaTemplateId,
            usageCount: 0,
            rejectedReason: status === 'REJECTED' ? metaTemplate.rejected_reason : null
          });
          createdCount++;
        }

        syncedCount++;
      } catch (err) {
        console.error(`❌ Error processing template ${metaTemplate.name}:`, err.message);
      }
    }

    // Get updated stats
    const stats = {
      approved: await Template.countDocuments({ accountId, status: 'approved', deleted: false }),
      pending: await Template.countDocuments({ accountId, status: 'pending', deleted: false }),
      rejected: await Template.countDocuments({ accountId, status: 'rejected', deleted: false }),
      draft: await Template.countDocuments({ accountId, status: 'draft', deleted: false }),
      total: await Template.countDocuments({ accountId, deleted: false })
    };

    res.json({
      success: true,
      message: `Successfully synced ${syncedCount} templates from WhatsApp Manager`,
      synced: syncedCount,
      created: createdCount,
      updated: updatedCount,
      stats
    });
    
  } catch (error) {
    console.error('❌ Sync templates error:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'WhatsApp access token has expired. Please reconnect your account.',
        error: 'TOKEN_EXPIRED',
        nextStep: 'Go to Settings → WhatsApp Integration → Reconnect'
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again in a few moments.',
        error: 'RATE_LIMITED'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to sync templates from WhatsApp. Please check your connection and try again.',
      error: 'SYNC_FAILED',
      details: error.response?.data?.error?.message || error.message,
      nextStep: 'Try reconnecting your WhatsApp account or contact support if the issue persists'
    });
  }
};

export default {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  submitTemplateToMeta,
  syncTemplates
};
