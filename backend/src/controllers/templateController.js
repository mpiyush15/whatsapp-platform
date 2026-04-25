import axios from 'axios';
import fs from 'fs';
import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import Template from '../models/Template.js';
import PhoneNumber from '../models/PhoneNumber.js';
import { uploadToS3, getMediaTypeFromMime } from '../services/s3Service.js';

const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';

/**
 * Helper: get the first active phone number config (wabaId + accessToken) for an account
 */
async function getPhoneConfig(accountId, projectId) {
  // 1) Prefer project-scoped active phone when projectId is provided
  // 2) Fallback to any active account-level phone (handles legacy/null projectId records)
  let phone = null;
  if (projectId) {
    phone = await PhoneNumber.findOne({ accountId, projectId, isActive: true }).select('+accessToken');
  }
  if (!phone) {
    phone = await PhoneNumber.findOne({ accountId, isActive: true }).sort({ updatedAt: -1 }).select('+accessToken');
  }

  if (!phone) {
    throw new Error(
      'No active WhatsApp phone number found. Please connect one in Settings first.'
    );
  }
  if (!phone.accessToken) {
    const fallback = process.env.META_SYSTEM_TOKEN;
    if (!fallback) throw new Error('Access token missing and META_SYSTEM_TOKEN not configured.');
    phone.accessToken = fallback;
  }
  return phone;
}

/**
 * Helper: extract variable numbers from body text like {{1}}, {{2}}
 */
function extractVariables(content) {
  const matches = (content || '').match(/\{\{(\d+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}

/**
 * Helper: build Meta-format components array from template fields
 */
function buildMetaComponents({ hasMedia, mediaType, mediaUrl, headerText, content, footerText, buttons = [] }) {
  const components = [];

  // HEADER
  if (hasMedia && mediaType && mediaType !== 'none') {
    const comp = { type: 'HEADER', format: mediaType.toUpperCase() };
    if (mediaUrl) comp.example = { header_handle: [mediaUrl] };
    components.push(comp);
  } else if (headerText) {
    const hasVars = /\{\{\d+\}\}/.test(headerText);
    const comp = { type: 'HEADER', format: 'TEXT', text: headerText };
    if (hasVars) comp.example = { header_text: ['sample_value'] };
    components.push(comp);
  }

  // BODY (required)
  const bodyVars = (content.match(/\{\{(\d+)\}\}/g) || []).map(() => ['sample_value']);
  const bodyComp = { type: 'BODY', text: content };
  if (bodyVars.length > 0) bodyComp.example = { body_text: bodyVars };
  components.push(bodyComp);

  // FOOTER
  if (footerText) {
    components.push({ type: 'FOOTER', text: footerText });
  }

  // BUTTONS
  if (buttons && buttons.length > 0) {
    const metaButtons = buttons.map(btn => {
      const type = (btn.type || 'QUICK_REPLY').toUpperCase();
      if (type === 'URL') return { type: 'URL', text: btn.text, url: btn.url || btn.value || 'https://example.com' };
      if (type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: btn.text, phone_number: btn.phone_number || btn.value || '+1234567890' };
      return { type: 'QUICK_REPLY', text: btn.text };
    });
    components.push({ type: 'BUTTONS', buttons: metaButtons });
  }

  return components;
}

/**
 * Meta is strict about media HEADER sample values.
 * If we have an S3 signed URL, prefer a clean object URL (without query params)
 * as sample to reduce invalid-parameter issues.
 */
function normalizeHeaderSample(value) {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  // If it's already a non-URL handle/token, pass as-is
  if (!/^https?:\/\//i.test(trimmed)) return trimmed;

  // For S3 signed URLs, strip querystring so Meta gets a stable URL
  try {
    const u = new URL(trimmed);
    if (u.hostname.includes('amazonaws.com')) {
      return `${u.origin}${u.pathname}`;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

/**
 * Upload template media sample using Meta resumable uploads API and return
 * the upload handle (`h`) required by template HEADER example.header_handle.
 */
async function uploadTemplateSampleToMeta(phoneConfig, mediaUrl, fallbackMediaType = 'image') {
  try {
    if (!phoneConfig?.accessToken || !mediaUrl) return '';

    const appId = process.env.META_APP_ID;
    if (!appId) {
      logger.warn('⚠️ META_APP_ID missing, cannot create upload handle for template media sample');
      return '';
    }

    const mediaResp = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
    const fileBuffer = Buffer.from(mediaResp.data);
    const contentType = mediaResp.headers['content-type'] ||
      (fallbackMediaType === 'video' ? 'video/mp4' : fallbackMediaType === 'document' ? 'application/pdf' : 'image/jpeg');

    const extension = fallbackMediaType === 'video' ? 'mp4' : fallbackMediaType === 'document' ? 'pdf' : 'jpg';
    const fileName = `template-sample.${extension}`;

    // Step 1: create upload session
    const sessionResp = await axios.post(
      `${GRAPH_API_URL}/${appId}/uploads`,
      null,
      {
        params: {
          file_name: fileName,
          file_length: fileBuffer.length,
          file_type: contentType,
        },
        headers: {
          Authorization: `Bearer ${phoneConfig.accessToken}`,
        },
      }
    );

    const uploadSessionId = sessionResp.data?.id;
    if (!uploadSessionId) {
      logger.warn('⚠️ Upload session creation did not return an id');
      return '';
    }

    // Step 2: upload binary to session and receive handle `h`
    const handleResp = await axios.post(
      `${GRAPH_API_URL}/${uploadSessionId}`,
      fileBuffer,
      {
        headers: {
          Authorization: `Bearer ${phoneConfig.accessToken}`,
          'file_offset': '0',
          'Content-Type': 'application/octet-stream',
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    return String(handleResp.data?.h || '');
  } catch (e) {
    logger.warn('⚠️ Failed creating Meta upload handle for template media sample:', e.response?.data || e.message);
    return '';
  }
}

// ─────────────────────────────────────────────
// GET /api/templates?projectId=xxx
// ─────────────────────────────────────────────
export const getTemplates = async (req, res) => {
  try {
    const accountId = req.user?.accountId || req.accountId;
    const projectId = req.query.projectId || req.projectId || null;

    const query = { accountId, isDeleted: { $ne: true } };
    if (projectId) query.projectId = projectId;

    const templates = await Template.find(query).sort({ createdAt: -1 });

    const stats = {
      approved: templates.filter(t => t.status === 'approved').length,
      pending:  templates.filter(t => t.status === 'pending').length,
      rejected: templates.filter(t => t.status === 'rejected').length,
      draft:    templates.filter(t => t.status === 'draft').length,
      total:    templates.length,
    };

    return sendSuccess(res, { templates, stats }, 'Templates retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getTemplates');
  }
};

// ─────────────────────────────────────────────
// GET /api/templates/:id
// ─────────────────────────────────────────────
export const getTemplate = async (req, res) => {
  try {
    const accountId = req.user?.accountId || req.accountId;
    const { id } = req.params;

    const template = await Template.findOne({ _id: id, accountId, isDeleted: { $ne: true } });
    if (!template) return sendNotFound(res, 'Template not found');

    return sendSuccess(res, { template }, 'Template retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getTemplate');
  }
};

// ─────────────────────────────────────────────
// POST /api/templates
// Saves template to DB as draft. Media file (if any) is uploaded to S3.
// ─────────────────────────────────────────────
export const createTemplate = async (req, res) => {
  try {
    const accountId = req.user?.accountId || req.accountId;
    const projectId = req.body.projectId || req.query.projectId || req.projectId || null;

    const {
      name, language, category, content,
      hasMedia, mediaType, mediaUrl,
      headerText, footerText,
      variableType, mediaSample,
    } = req.body;

    // Parse buttons (may come as JSON string from FormData)
    const buttons = req.body.buttons
      ? (typeof req.body.buttons === 'string' ? JSON.parse(req.body.buttons) : req.body.buttons)
      : [];

    if (!name || !content) return sendValidationError(res, 'Name and content are required');
    if (!category) return sendValidationError(res, 'Category is required');

    // Determine effective media type from mediaSample or mediaType field — always lowercase to match schema enum
    const effectiveMediaType = ((mediaSample && mediaSample !== 'none') ? mediaSample : (mediaType || 'image')).toLowerCase();
    const effectiveHasMedia = (hasMedia === 'true' || hasMedia === true);

    // Handle file upload → S3
    let finalMediaUrl = mediaUrl || '';
    let mediaFilePath = null;
    let mediaFileName = null;

    if (req.file) {
      try {
        logger.info('📎 Uploading template media to S3:', req.file.originalname);
        const fileBuffer = fs.readFileSync(req.file.path);
        const mimeType = req.file.mimetype;
        const s3MediaType = getMediaTypeFromMime(mimeType) || effectiveMediaType;
        const { s3Url, s3Key } = await uploadToS3(
          fileBuffer, accountId,
          `templates/${s3MediaType}`, mimeType, req.file.originalname
        );
        finalMediaUrl = s3Url;
        mediaFilePath = s3Key;
        mediaFileName = req.file.originalname;
        fs.unlinkSync(req.file.path); // clean up temp
        logger.info('✅ Template media uploaded to S3:', s3Key);
      } catch (s3Err) {
        logger.error('❌ S3 upload failed, saving local path:', s3Err.message);
        finalMediaUrl = '';
        mediaFilePath = req.file.path;
        mediaFileName = req.file.originalname;
      }
    }

    const variables = extractVariables(content);

    const components = buildMetaComponents({
      hasMedia: effectiveHasMedia && !!finalMediaUrl,
      mediaType: effectiveMediaType,
      mediaUrl: finalMediaUrl,
      headerText: headerText || '',
      content,
      footerText: footerText || '',
      buttons,
    });

    // Meta requires snake_case name, lowercase
    const safeName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    const template = new Template({
      accountId,
      projectId,
      name: safeName,
      language: language || 'en',
      category,
      content,
      variables,
      components,
      hasMedia: effectiveHasMedia && !!finalMediaUrl,
      mediaType: effectiveMediaType,
      mediaUrl: finalMediaUrl,
      mediaFilePath,
      mediaFileName,
      headerText: headerText || '',
      footerText: footerText || '',
      status: 'draft',
    });

    await template.save();
    logger.info('✅ Template saved to DB:', template._id, '| name:', safeName);

    return sendSuccess(
      res,
      { template, message: 'Template saved as draft. Click "Submit to Meta" to send for approval.' },
      'Template created',
      201
    );
  } catch (error) {
    return handleControllerError(res, error, 'createTemplate');
  }
};

// ─────────────────────────────────────────────
// PUT /api/templates/:id
// ─────────────────────────────────────────────
export const updateTemplate = async (req, res) => {
  try {
    const accountId = req.user?.accountId || req.accountId;
    const { id } = req.params;

    const template = await Template.findOne({ _id: id, accountId, isDeleted: { $ne: true } });
    if (!template) return sendNotFound(res, 'Template not found');

    if (!['draft', 'rejected'].includes(template.status)) {
      return sendValidationError(res, `Cannot edit a template with status "${template.status}". Only draft or rejected templates can be edited.`);
    }

    const editable = ['name', 'language', 'category', 'content', 'hasMedia', 'mediaType', 'mediaUrl', 'headerText', 'footerText'];
    editable.forEach(f => { if (req.body[f] !== undefined) template[f] = req.body[f]; });

    if (req.body.buttons) {
      // Rebuild components on update
      const buttons = typeof req.body.buttons === 'string' ? JSON.parse(req.body.buttons) : req.body.buttons;
      template.components = buildMetaComponents({
        hasMedia: template.hasMedia,
        mediaType: template.mediaType,
        mediaUrl: template.mediaUrl,
        headerText: template.headerText,
        content: template.content,
        footerText: template.footerText,
        buttons,
      });
    }

    if (req.body.content) template.variables = extractVariables(req.body.content);
    template.status = 'draft';
    await template.save();

    return sendSuccess(res, { template }, 'Template updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateTemplate');
  }
};

// ─────────────────────────────────────────────
// DELETE /api/templates/:id  (soft delete)
// ─────────────────────────────────────────────
export const deleteTemplate = async (req, res) => {
  try {
    const accountId = req.user?.accountId || req.accountId;
    const { id } = req.params;

    const template = await Template.findOne({ _id: id, accountId, isDeleted: { $ne: true } });
    if (!template) return sendNotFound(res, 'Template not found');

    template.isDeleted = true;
    await template.save();

    return sendSuccess(res, { templateId: id, deleted: true }, 'Template deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteTemplate');
  }
};

// ─────────────────────────────────────────────
// POST /api/templates/:id/submit  → submit to Meta Graph API for approval
// ─────────────────────────────────────────────
export const submitTemplateToMeta = async (req, res) => {
  try {
    const accountId = req.user?.accountId || req.accountId;
    const { id } = req.params;
    const projectId = req.query.projectId || req.projectId || null;

    const template = await Template.findOne({ _id: id, accountId, isDeleted: { $ne: true } });
    if (!template) return sendNotFound(res, 'Template not found');

    if (template.status === 'approved') return sendValidationError(res, 'Template is already approved.');
    if (template.status === 'pending') return sendValidationError(res, 'Template is already pending Meta review.');

    // Get WABA credentials
    const phone = await getPhoneConfig(accountId, projectId);
    const { wabaId, accessToken } = phone;

    if (!wabaId) {
      return sendValidationError(res, 'WhatsApp Business Account ID (wabaId) not configured. Check Settings > Phone Numbers.');
    }

    // Retrieve buttons from stored components
    const storedButtonsComp = template.components?.find(c => c.type === 'BUTTONS');
    const storedButtons = storedButtonsComp?.buttons || [];

    // Prefer existing stored header sample, then mediaUrl
    const storedHeaderComp = template.components?.find(c => c.type === 'HEADER');
    const storedSample = storedHeaderComp?.example?.header_handle?.[0] || '';
    let headerSample = normalizeHeaderSample(storedSample || template.mediaUrl || '');

    // For media headers, prefer a WhatsApp media-id sample (more reliable for Meta validation)
    if (template.hasMedia && ['image', 'video', 'document'].includes(String(template.mediaType || '').toLowerCase())) {
      const needsMetaSample = !headerSample || /^https?:\/\//i.test(headerSample);
      if (needsMetaSample) {
        const mediaIdSample = await uploadTemplateSampleToMeta(phone, template.mediaUrl, String(template.mediaType || 'image').toLowerCase());
        if (mediaIdSample) headerSample = mediaIdSample;
      }
    }

    const components = buildMetaComponents({
      hasMedia: template.hasMedia,
      mediaType: template.mediaType,
      mediaUrl: headerSample || template.mediaUrl,
      headerText: template.headerText,
      content: template.content,
      footerText: template.footerText,
      buttons: storedButtons,
    });

    // Enforce sample for media header to avoid Meta subcode 2388273
    const headerIdx = components.findIndex(c => c.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(c.format));
    if (headerIdx >= 0) {
      const currentSample = components[headerIdx]?.example?.header_handle?.[0];
      const finalSample = normalizeHeaderSample(currentSample || headerSample || template.mediaUrl || '');
      if (finalSample) {
        components[headerIdx].example = { header_handle: [finalSample] };
      }
    }

    const payload = {
      name: template.name,
      language: template.language || 'en',
      category: template.category.toUpperCase(), // Meta: MARKETING | UTILITY | AUTHENTICATION
      components,
    };

    logger.info(`📤 Submitting template "${template.name}" to Meta WABA: ${wabaId}`);
    logger.info('Payload:', JSON.stringify(payload, null, 2));

    const metaResponse = await axios.post(
      `${GRAPH_API_URL}/${wabaId}/message_templates`,
      payload,
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    const metaData = metaResponse.data;
    logger.info('✅ Meta accepted template:', metaData);

    template.metaTemplateId = String(metaData.id);
    template.status = 'pending';
    template.lastSyncedAt = new Date();
    await template.save();

    return sendSuccess(res, {
      template,
      metaTemplateId: metaData.id,
      metaStatus: metaData.status,
    }, 'Template submitted to Meta for approval. You will see status update after review.');
  } catch (error) {
    if (error.response?.data) {
      const metaErr = error.response.data.error;
      logger.error('❌ Meta API error on submit:', metaErr);
      return res.status(400).json({
        success: false,
        message: `Meta API Error: ${metaErr?.message || 'Unknown Meta error'}`,
        metaError: metaErr,
      });
    }
    return handleControllerError(res, error, 'submitTemplateToMeta');
  }
};

// ─────────────────────────────────────────────
// POST /api/settings/templates/sync  → pull templates FROM Meta into DB
// ─────────────────────────────────────────────
export const syncTemplates = async (req, res) => {
  try {
    const accountId = req.user?.accountId || req.accountId;
    const projectId = req.query.projectId || req.projectId || null;

    logger.info('🔄 Syncing templates from Meta for account:', accountId);

    const phone = await getPhoneConfig(accountId, projectId);
    const { wabaId, accessToken } = phone;

    if (!wabaId) return sendValidationError(res, 'WhatsApp Business Account ID (wabaId) not configured.');

    const metaResponse = await axios.get(
      `${GRAPH_API_URL}/${wabaId}/message_templates?fields=id,name,language,category,status,components,rejected_reason&limit=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const metaTemplates = metaResponse.data?.data || [];
    logger.info(`📋 Meta returned ${metaTemplates.length} templates`);

    let created = 0;
    let updated = 0;

    for (const mt of metaTemplates) {
      const bodyComp   = mt.components?.find(c => c.type === 'BODY');
      const headerComp = mt.components?.find(c => c.type === 'HEADER');
      const footerComp = mt.components?.find(c => c.type === 'FOOTER');

      const content     = bodyComp?.text || ' ';
      const headerText  = headerComp?.format === 'TEXT' ? (headerComp.text || '') : '';
      const footerText  = footerComp?.text || '';
      const hasMedia    = ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp?.format);
      const mediaType   = hasMedia ? headerComp.format.toLowerCase() : 'image';
      const rawCategory = (mt.category || 'utility').toLowerCase();
      const dbCategory  = ['marketing', 'utility', 'authentication'].includes(rawCategory) ? rawCategory : 'utility';
      const metaStatus  = (mt.status || '').toLowerCase();
      const dbStatus    = ['approved', 'pending', 'rejected', 'draft'].includes(metaStatus) ? metaStatus : 'pending';

      const existing = await Template.findOne({ accountId, metaTemplateId: String(mt.id) });

      if (existing) {
        existing.status        = dbStatus;
        existing.content       = content || existing.content;
        existing.components    = mt.components || existing.components;
        existing.rejectedReason = mt.rejected_reason || '';
        if (dbStatus === 'approved') existing.approvedAt = new Date();
        if (dbStatus === 'rejected') existing.rejectedAt = new Date();
        existing.lastSyncedAt = new Date();
        await existing.save();
        updated++;
      } else {
        await Template.create({
          accountId,
          projectId,
          metaTemplateId: String(mt.id),
          name: mt.name,
          language: mt.language || 'en',
          category: dbCategory,
          content,
          headerText,
          footerText,
          hasMedia,
          mediaType,
          components: mt.components || [],
          variables: extractVariables(content),
          status: dbStatus,
          rejectedReason: mt.rejected_reason || '',
          approvedAt:  dbStatus === 'approved' ? new Date() : undefined,
          rejectedAt:  dbStatus === 'rejected' ? new Date() : undefined,
          lastSyncedAt: new Date(),
        });
        created++;
      }
    }

    logger.info(`✅ Sync done: ${created} created, ${updated} updated`);
    return sendSuccess(res, {
      synced: metaTemplates.length,
      created,
      updated,
      message: `Synced ${metaTemplates.length} templates from Meta (${created} new, ${updated} updated)`,
    }, 'Templates synced from Meta');
  } catch (error) {
    if (error.response?.data) {
      const metaErr = error.response.data.error;
      logger.error('❌ Meta API sync error:', metaErr);
      return res.status(400).json({
        success: false,
        message: `Meta API Error during sync: ${metaErr?.message || 'Unknown error'}`,
        metaError: metaErr,
      });
    }
    return handleControllerError(res, error, 'syncTemplates');
  }
};

export const listTemplates = getTemplates; // alias for backward compat

export default {
  createTemplate,
  getTemplate,
  listTemplates,
  getTemplates,
  syncTemplates,
  submitTemplateToMeta,
  updateTemplate,
  deleteTemplate,
};
