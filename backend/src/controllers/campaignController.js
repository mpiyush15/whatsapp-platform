import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import Campaign from '../models/Campaign.js';
import {
  refreshCampaignStatsFromMessages,
  buildCampaignRecipientInsights,
} from '../services/campaignStatsService.js';
import PhoneNumber from '../models/PhoneNumber.js';
import Template from '../models/Template.js';
import Contact from '../models/Contact.js';
import whatsappService from '../services/whatsappService.js';

const getProjectId = (req) => req.query?.projectId || req.body?.projectId || null;

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizePhone = (phone) => String(phone || '').replace(/[^0-9]/g, '');

const getCampaignRecipients = async ({ accountId, projectId, campaign }) => {
  const attrs = campaign?.audience?.customFilters?.attributes || {};
  const selectedContactIds = Array.isArray(attrs.selectedContactIds) ? attrs.selectedContactIds : [];
  const selectedPhones = Array.isArray(attrs.selectedPhones) ? attrs.selectedPhones : [];

  const recipients = new Set();

  for (const phone of selectedPhones) {
    const normalized = normalizePhone(phone);
    if (normalized) recipients.add(normalized);
  }

  if (selectedContactIds.length > 0) {
    const contacts = await Contact.find({
      _id: { $in: selectedContactIds },
      accountId,
      ...(projectId ? { projectId } : {})
    }).select('phone whatsappNumber');

    for (const c of contacts) {
      const normalized = normalizePhone(c.whatsappNumber || c.phone);
      if (normalized) recipients.add(normalized);
    }
  }

  return Array.from(recipients);
};

const resolvePhoneNumberId = async (accountId, projectId = null) => {
  const projectScoped = projectId
    ? await PhoneNumber.findOne({ accountId, projectId, isActive: true }).sort({ createdAt: -1 })
    : null;

  if (projectScoped?.phoneNumberId) return projectScoped.phoneNumberId;

  const fallback = await PhoneNumber.findOne({ accountId, isActive: true }).sort({ createdAt: -1 });
  return fallback?.phoneNumberId || null;
};

export const createCampaign = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const projectId = getProjectId(req);
    const { name, templateId, recipientFilters = {}, scheduling = {}, description = '' } = req.body;

    if (!name || !templateId) {
      return sendValidationError(res, 'Campaign name and template required');
    }

    const phoneNumberId = await resolvePhoneNumberId(accountId, projectId);
    if (!phoneNumberId) {
      return sendValidationError(res, 'No active WhatsApp phone number found. Please connect phone number in settings.');
    }

    let templateName = '';
    const templateQuery = { _id: templateId, accountId, ...(projectId ? { projectId } : {}) };
    let template = await Template.findOne(templateQuery).select('name');

    if (!template && projectId) {
      template = await Template.findOne({ _id: templateId, accountId }).select('name');
    }

    if (template) templateName = template.name;

    const selectedContactIds = Array.isArray(recipientFilters.selectedContactIds)
      ? recipientFilters.selectedContactIds
      : [];

    const selectedPhones = Array.isArray(recipientFilters.selectedPhones)
      ? recipientFilters.selectedPhones.filter(Boolean)
      : [];

    const recipientTotal = selectedContactIds.length || selectedPhones.length || 0;

    const sendNow = scheduling.sendNow !== false;
    const scheduledAt = scheduling.scheduledAt ? new Date(scheduling.scheduledAt) : null;

    const campaign = await Campaign.create({
      accountId,
      projectId,
      phoneNumberId,
      name: String(name).trim(),
      description,
      type: 'broadcast',
      status: sendNow ? 'draft' : 'scheduled',
      audience: {
        type: 'custom',
        segmentIds: [],
        customFilters: {
          tags: [],
          attributes: {
            selectedContactIds,
            selectedPhones
          },
          excludeUnsubscribed: true
        },
        estimatedReach: recipientTotal
      },
      message: {
        type: 'template',
        content: '',
        templateId,
        templateName,
        variables: [],
        mediaUrls: [],
        buttons: []
      },
      scheduling: {
        sendNow,
        startDate: sendNow ? undefined : scheduledAt,
        timezone: 'Asia/Kolkata',
        frequency: 'once'
      },
      recipients: {
        total: recipientTotal,
        sent: 0,
        failed: 0,
        pending: recipientTotal,
        inProgress: 0
      },
      createdBy: req.user?.email || req.user?.name || 'system'
    });

    return sendSuccess(res, {
      campaign,
      campaignId: campaign._id
    }, 'Campaign created', 201);
  } catch (error) {
    return handleControllerError(res, error, 'createCampaign');
  }
};

export const getCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    return sendSuccess(res, { campaignId }, 'Campaign retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getCampaign');
  }
};

export const listCampaigns = async (req, res) => {
  return getCampaigns(req, res);
};

export const launchCampaign = async (req, res) => {
  try {
    return startCampaign(req, res);
  } catch (error) {
    return handleControllerError(res, error, 'launchCampaign');
  }
};

export const getAvailableSegments = async (req, res) => {
  try {
    return sendSuccess(res, { segments: [] }, 'Segments retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getAvailableSegments');
  }
};

export const getCampaigns = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const projectId = getProjectId(req);
    const { status, type, search } = req.query;
    const limit = toPositiveInt(req.query.limit, 50);
    const skip = toPositiveInt(req.query.skip, 0);

    const query = { accountId };
    if (projectId) query.projectId = projectId;
    if (status) query.status = status;
    if (type) query.type = type;
    if (search) query.name = { $regex: String(search), $options: 'i' };

    const campaigns = await Campaign.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    return sendSuccess(res, { campaigns }, 'Campaigns retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getCampaigns');
  }
};

export const estimateAudienceReach = async (req, res) => {
  try {
    return sendSuccess(res, { estimatedReach: 0 }, 'Audience estimate calculated');
  } catch (error) {
    return handleControllerError(res, error, 'estimateAudienceReach');
  }
};

export const getCampaignRecipientReport = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const accountId = req.user?.accountId;
    const projectId = getProjectId(req);

    const query = { _id: campaignId, accountId };
    if (projectId) query.projectId = projectId;

    const exists = await Campaign.findOne(query).select('_id');
    if (!exists) {
      return sendNotFound(res, 'Campaign');
    }

    const refreshStats = req.query.refresh !== '0' && req.query.refresh !== 'false';
    const report = await buildCampaignRecipientInsights(campaignId, accountId, { refreshStats });
    if (!report) {
      return sendNotFound(res, 'Campaign');
    }

    return sendSuccess(res, report, 'Campaign recipients');
  } catch (error) {
    return handleControllerError(res, error, 'getCampaignRecipientReport');
  }
};

export const getCampaignById = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const accountId = req.user?.accountId;
    const projectId = getProjectId(req);

    const query = { _id: campaignId, accountId };
    if (projectId) query.projectId = projectId;

    let campaign = await Campaign.findOne(query);
    if (!campaign) {
      return sendNotFound(res, 'Campaign');
    }

    const refreshed = await refreshCampaignStatsFromMessages(campaignId, accountId).catch(() => null);
    if (refreshed) campaign = refreshed;

    return sendSuccess(res, { campaign }, 'Campaign retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getCampaignById');
  }
};

export const updateCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const accountId = req.user?.accountId;
    const projectId = getProjectId(req);

    const query = { _id: campaignId, accountId };
    if (projectId) query.projectId = projectId;

    const campaign = await Campaign.findOne(query);
    if (!campaign) {
      return sendNotFound(res, 'Campaign');
    }

    const { name, description, scheduling } = req.body;
    if (name !== undefined) campaign.name = String(name).trim();
    if (description !== undefined) campaign.description = description;
    if (scheduling !== undefined) campaign.scheduling = { ...campaign.scheduling?.toObject?.(), ...scheduling };

    await campaign.save();

    return sendSuccess(res, { campaign }, 'Campaign updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateCampaign');
  }
};

export const deleteCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const accountId = req.user?.accountId;
    const projectId = getProjectId(req);

    const query = { _id: campaignId, accountId };
    if (projectId) query.projectId = projectId;

    const deleted = await Campaign.findOneAndDelete(query);
    if (!deleted) {
      return sendNotFound(res, 'Campaign');
    }

    return sendSuccess(res, { campaignId, deleted: true }, 'Campaign deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteCampaign');
  }
};

export const validateCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const accountId = req.user?.accountId;
    const projectId = getProjectId(req);
    const query = { _id: campaignId, accountId };
    if (projectId) query.projectId = projectId;

    const campaign = await Campaign.findOne(query);
    if (!campaign) return sendNotFound(res, 'Campaign');

    const errors = [];
    if (!campaign.name) errors.push('Campaign name is required');
    if (!campaign.message?.templateId && !campaign.message?.content) errors.push('Template or content is required');
    if ((campaign.recipients?.total || 0) <= 0) errors.push('No audience selected');
    if (campaign.scheduling?.sendNow === false && !campaign.scheduling?.startDate) errors.push('Start date is required for scheduled campaign');

    return sendSuccess(res, { valid: errors.length === 0, errors }, 'Campaign validation complete');
  } catch (error) {
    return handleControllerError(res, error, 'validateCampaign');
  }
};

export const pauseCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const accountId = req.user?.accountId;
    const projectId = getProjectId(req);
    const query = { _id: campaignId, accountId };
    if (projectId) query.projectId = projectId;

    const campaign = await Campaign.findOneAndUpdate(query, { status: 'paused', pausedAt: new Date() }, { new: true });
    if (!campaign) return sendNotFound(res, 'Campaign');

    return sendSuccess(res, { campaign }, 'Campaign paused');
  } catch (error) {
    return handleControllerError(res, error, 'pauseCampaign');
  }
};

export const startCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const accountId = req.user?.accountId;
    const projectId = getProjectId(req);
    const query = { _id: campaignId, accountId };
    if (projectId) query.projectId = projectId;

    const campaign = await Campaign.findOne(query);
    if (!campaign) return sendNotFound(res, 'Campaign');

    if (campaign.status === 'running') {
      return sendSuccess(res, { campaign }, 'Campaign already running');
    }

    const recipients = await getCampaignRecipients({ accountId, projectId, campaign });
    if (recipients.length === 0) {
      return sendValidationError(res, 'No valid recipient phone numbers found for this campaign');
    }

    let templateName = campaign.message?.templateName;
    if (!templateName && campaign.message?.templateId) {
      const templateQuery = { _id: campaign.message.templateId, accountId, ...(projectId ? { projectId } : {}) };
      let template = await Template.findOne(templateQuery).select('name');
      if (!template && projectId) {
        template = await Template.findOne({ _id: campaign.message.templateId, accountId }).select('name');
      }
      if (template?.name) {
        templateName = template.name;
        campaign.message.templateName = template.name;
      }
    }

    if (!templateName) {
      return sendValidationError(res, 'Template name not found for campaign');
    }

    campaign.status = 'running';
    campaign.startedAt = campaign.startedAt || new Date();
    campaign.completedAt = undefined;
    campaign.recipients = {
      ...(campaign.recipients?.toObject?.() || campaign.recipients || {}),
      total: recipients.length,
      sent: 0,
      failed: 0,
      pending: recipients.length,
      inProgress: recipients.length
    };
    campaign.stats = {
      ...(campaign.stats?.toObject?.() || campaign.stats || {}),
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalOpened: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      conversionRate: 0
    };
    await campaign.save();

    logger.info(`[Campaign:${campaign._id}] Starting bulk send for ${recipients.length} recipients`);

    let sent = 0;
    let failed = 0;
    const failedLogs = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipientPhone = recipients[i];
      try {
        await whatsappService.sendTemplateMessage(
          accountId,
          campaign.phoneNumberId,
          recipientPhone,
          templateName,
          campaign.message?.variables || [],
          {
            campaign: String(campaign._id),
            projectId: campaign.projectId || null
          }
        );

        sent += 1;
      } catch (err) {
        failed += 1;
        failedLogs.push({
          timestamp: new Date(),
          errorType: err?.name || 'SendError',
          message: err?.message || 'Failed to send',
          phoneNumber: recipientPhone,
          count: 1
        });

        logger.error(`[Campaign:${campaign._id}] Failed to send template to ${recipientPhone}: ${err?.message}`);
      }

      if ((i + 1) % 10 === 0 || i === recipients.length - 1) {
        campaign.recipients.sent = sent;
        campaign.recipients.failed = failed;
        campaign.recipients.pending = Math.max(recipients.length - (sent + failed), 0);
        campaign.recipients.inProgress = campaign.recipients.pending;
        campaign.stats.totalSent = sent;
        campaign.stats.totalFailed = failed;
        await campaign.save();
      }

      if (i < recipients.length - 1) {
        await sleep(60);
      }
    }

    if (failedLogs.length > 0) {
      campaign.errorLog.push(...failedLogs.slice(-500));
    }

    campaign.recipients.sent = sent;
    campaign.recipients.failed = failed;
    campaign.recipients.pending = 0;
    campaign.recipients.inProgress = 0;
    campaign.stats.totalSent = sent;
    campaign.stats.totalFailed = failed;

    if (sent === 0) {
      campaign.status = 'failed';
      campaign.completedAt = new Date();
    } else {
      campaign.status = 'running';
    }

    await campaign.save();

    await refreshCampaignStatsFromMessages(campaign._id, accountId).catch(() => {});

    logger.info(`[Campaign:${campaign._id}] Bulk send finished. sent=${sent}, failed=${failed}. Waiting for webhooks for delivered/read statuses.`);

    return sendSuccess(res, {
      campaign,
      summary: {
        attempted: recipients.length,
        sent,
        failed,
        status: campaign.status
      }
    }, sent === 0 ? 'Campaign failed to send' : 'Campaign send started');
  } catch (error) {
    return handleControllerError(res, error, 'startCampaign');
  }
};

export const resumeCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const accountId = req.user?.accountId;
    const projectId = getProjectId(req);
    const query = { _id: campaignId, accountId };
    if (projectId) query.projectId = projectId;

    const campaign = await Campaign.findOneAndUpdate(
      query,
      { status: 'running', resumedAt: new Date() },
      { new: true }
    );

    if (!campaign) return sendNotFound(res, 'Campaign');

    return sendSuccess(res, { campaign }, 'Campaign resumed');
  } catch (error) {
    return handleControllerError(res, error, 'resumeCampaign');
  }
};

export const cancelCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const accountId = req.user?.accountId;
    const projectId = getProjectId(req);
    const query = { _id: campaignId, accountId };
    if (projectId) query.projectId = projectId;

    // Model enum does not include "cancelled", use "failed" as terminal state.
    const campaign = await Campaign.findOneAndUpdate(query, { status: 'failed' }, { new: true });
    if (!campaign) return sendNotFound(res, 'Campaign');

    return sendSuccess(res, { campaign }, 'Campaign cancelled');
  } catch (error) {
    return handleControllerError(res, error, 'cancelCampaign');
  }
};

export const duplicateCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const accountId = req.user?.accountId;
    const projectId = getProjectId(req);
    const query = { _id: campaignId, accountId };
    if (projectId) query.projectId = projectId;

    const campaign = await Campaign.findOne(query);
    if (!campaign) return sendNotFound(res, 'Campaign');

    const payload = campaign.toObject();
    delete payload._id;
    delete payload.createdAt;
    delete payload.updatedAt;
    payload.name = `${campaign.name} (Copy)`;
    payload.status = 'draft';
    payload.startedAt = undefined;
    payload.completedAt = undefined;
    payload.pausedAt = undefined;
    payload.resumedAt = undefined;

    const duplicated = await Campaign.create(payload);
    return sendSuccess(res, { campaign: duplicated, newCampaignId: duplicated._id }, 'Campaign duplicated');
  } catch (error) {
    return handleControllerError(res, error, 'duplicateCampaign');
  }
};

export const getCampaignStats = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const accountId = req.user?.accountId;
    const projectId = getProjectId(req);
    const query = { _id: campaignId, accountId };
    if (projectId) query.projectId = projectId;

    const campaign = await Campaign.findOne(query).select('stats recipients status name createdAt startedAt completedAt');
    if (!campaign) return sendNotFound(res, 'Campaign');

    return sendSuccess(res, { campaignId, stats: campaign.stats, recipients: campaign.recipients, campaign }, 'Campaign stats retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getCampaignStats');
  }
};

export const saveCampaignAsTemplate = async (req, res) => {
  try {
    const { campaignId } = req.params;
    return sendSuccess(res, { templateId: `tmpl_${Date.now()}` }, 'Campaign saved as template');
  } catch (error) {
    return handleControllerError(res, error, 'saveCampaignAsTemplate');
  }
};

export default { 
  createCampaign, 
  getCampaign, 
  listCampaigns, 
  launchCampaign,
  getAvailableSegments,
  getCampaigns,
  estimateAudienceReach,
  getCampaignRecipientReport,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  validateCampaign,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  duplicateCampaign,
  getCampaignStats,
  saveCampaignAsTemplate
};
