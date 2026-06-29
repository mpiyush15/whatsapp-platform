import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import mongoose from 'mongoose';
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
import contactRepository from '../repositories/contactRepository.js';
import whatsappService from '../services/whatsappService.js';

const getProjectId = (req) => req.projectId || req.query?.projectId || req.body?.projectId || null;

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ''));

const buildCampaignQuery = (campaignId, accountId, projectId = null) => {
  if (!isValidObjectId(campaignId)) return null;
  return {
    _id: campaignId,
    accountId,
    ...(projectId ? { projectId } : {})
  };
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizePhone = (phone) => String(phone || '').replace(/[^0-9]/g, '');
const activeCampaignSends = new Set();
const AUTO_EDUCATION_CONTACT_SOURCES = [
  'Education Enquiry',
  'Chatbot Workflow',
  'chatbot_workflow',
  'chatbot_workflow_action',
  'live_chat_auto_capture',
];

const buildRawCampaignContactQuery = async (accountId, projectId = null) => {
  const query = {
    accountId,
    ...(projectId ? { projectId } : {}),
    isOptedIn: { $ne: false },
  };

  await contactRepository.applyRawContactExclusions(query, accountId, {
    projectId,
    rawOnly: true,
  });

  query.source = {
    $in: ['Manual', 'Import', 'CSV Import'],
    $nin: AUTO_EDUCATION_CONTACT_SOURCES,
  };

  return query;
};

const getCampaignRecipients = async ({ accountId, projectId, campaign }) => {
  if (campaign?.audience?.type === 'all') {
    const contacts = await Contact.find(
      await buildRawCampaignContactQuery(accountId, projectId)
    ).select('phone whatsappNumber').lean();

    return Array.from(new Set(
      contacts
        .map((c) => normalizePhone(c.whatsappNumber || c.phone))
        .filter(Boolean)
    ));
  }

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
    }).select('phone whatsappNumber').lean();

    for (const c of contacts) {
      const normalized = normalizePhone(c.whatsappNumber || c.phone);
      if (normalized) recipients.add(normalized);
    }
  }

  return Array.from(recipients);
};

const saveCampaignProgress = async (campaignId, total, sent, failed, extra = {}) => {
  const pending = Math.max(total - sent - failed, 0);
  await Campaign.updateOne(
    { _id: campaignId },
    {
      $set: {
        'recipients.sent': sent,
        'recipients.failed': failed,
        'recipients.pending': pending,
        'recipients.inProgress': pending,
        'stats.totalSent': sent,
        'stats.totalFailed': failed,
        ...extra
      }
    }
  );
};

const runCampaignSendInBackground = async ({ campaignId, accountId, projectId, recipients, templateName }) => {
  const key = String(campaignId);
  if (activeCampaignSends.has(key)) return;
  activeCampaignSends.add(key);

  try {
    const initial = await Campaign.findOne({
      _id: campaignId,
      accountId,
      ...(projectId ? { projectId } : {})
    }).select('phoneNumberId message variables throttleRate sentPhones recipients stats status projectId').lean();

    if (!initial || initial.status !== 'running') return;

    const alreadySent = new Set(initial.sentPhones || []);
    let sent = Math.max(Number(initial.recipients?.sent || 0), alreadySent.size);
    let failed = Number(initial.recipients?.failed || 0);
    const total = recipients.length;
    const failedLogs = [];
    const throttleRate = Math.min(Math.max(Number(initial.throttleRate || 10), 1), 25);
    const delayMs = Math.ceil(1000 / throttleRate);

    logger.info(`[Campaign:${campaignId}] Background send started. recipients=${total}, alreadySent=${alreadySent.size}, throttle=${throttleRate}/s`);

    for (let i = 0; i < recipients.length; i += 1) {
      const recipientPhone = recipients[i];
      if (alreadySent.has(recipientPhone)) continue;

      if (i > 0 && i % 50 === 0) {
        const current = await Campaign.findById(campaignId).select('status').lean();
        if (!current || current.status !== 'running') {
          logger.info(`[Campaign:${campaignId}] Background send stopped because status is ${current?.status || 'missing'}`);
          return;
        }
      }

      try {
        let processedVariables = initial.message?.variables || [];
        let headerMediaUrl = initial.message?.headerMediaUrl || '';
        let buttonUrlParam = initial.message?.buttonUrlParam || '';
        
        const hasDynamicVariables = processedVariables.some(v => typeof v === 'string' && v.includes('{{')) || 
                                    (typeof headerMediaUrl === 'string' && headerMediaUrl.includes('{{')) ||
                                    (typeof buttonUrlParam === 'string' && buttonUrlParam.includes('{{'));

        if (hasDynamicVariables) {
          try {
            const { phoneLookupVariants } = await import('../utils/normalizePhone.js');
            const variants = phoneLookupVariants(recipientPhone);
            const contactForVars = await Contact.findOne({ accountId, phone: { $in: variants } }).lean();

            if (contactForVars) {
              const replaceVars = (val) => {
                if (typeof val !== 'string') return val;
                return val
                  .replace(/{{name}}/gi, contactForVars.name || '')
                  .replace(/{{email}}/gi, contactForVars.email || '')
                  .replace(/{{phone}}/gi, contactForVars.phone || '')
                  .replace(/{{area}}/gi, contactForVars.area || '')
                  .replace(/{{course}}/gi, contactForVars.course || '');
              };

              processedVariables = processedVariables.map(replaceVars);
              if (headerMediaUrl) {
                headerMediaUrl = replaceVars(headerMediaUrl);
              }
              if (buttonUrlParam) {
                buttonUrlParam = replaceVars(buttonUrlParam);
              }
            }
          } catch (varErr) {
            logger.error(`[Campaign:${campaignId}] Failed to process dynamic variables for ${recipientPhone}: ${varErr.message}`);
          }
        }

        await whatsappService.sendTemplateMessage(
          accountId,
          initial.phoneNumberId,
          recipientPhone,
          templateName,
          processedVariables,
          {
            campaign: String(campaignId),
            projectId: initial.projectId || null,
            headerMediaUrl: headerMediaUrl || undefined,
            buttonUrlParam: buttonUrlParam || undefined
          }
        );

        sent += 1;
        alreadySent.add(recipientPhone);
        await Campaign.updateOne(
          { _id: campaignId },
          { $addToSet: { sentPhones: recipientPhone } }
        );

        // Auto-update 'new' contacts to 'contacted' after a campaign blast
        try {
          const { phoneLookupVariants } = await import('../utils/normalizePhone.js');
          const variants = phoneLookupVariants(recipientPhone);
          const Contact = mongoose.model('Contact');
          const contact = await Contact.findOne({ accountId, phone: { $in: variants }, leadStatus: 'new' });
          if (contact) {
            const contactService = (await import('../services/contactService.js')).default;
            await contactService.updateContact(accountId, contact._id, { leadStatus: 'contacted' });
            logger.info(`Auto-updated status to 'contacted' for campaign recipient: ${recipientPhone}`);
          }
        } catch (err) {
          logger.error(`Failed to auto-update contact status to contacted for ${recipientPhone}: ${err.message}`);
        }
      } catch (err) {
        failed += 1;
        failedLogs.push({
          timestamp: new Date(),
          errorType: err?.name || 'SendError',
          message: err?.message || 'Failed to send',
          phoneNumber: recipientPhone,
          count: 1
        });

        logger.error(`[Campaign:${campaignId}] Failed to send template to ${recipientPhone}: ${err?.message}`);
      }

      if ((i + 1) % 25 === 0 || i === recipients.length - 1) {
        await saveCampaignProgress(campaignId, total, sent, failed);
        if (failedLogs.length > 0) {
          await Campaign.updateOne(
            { _id: campaignId },
            { $push: { errorLog: { $each: failedLogs.splice(0), $slice: -500 } } }
          );
        }
      }

      if (i < recipients.length - 1) {
        await sleep(delayMs);
      }
    }

    const status = sent === 0 ? 'failed' : 'completed';
    await saveCampaignProgress(campaignId, total, sent, failed, {
      status,
      completedAt: new Date(),
      'recipients.pending': 0,
      'recipients.inProgress': 0
    });

    if (failedLogs.length > 0) {
      await Campaign.updateOne(
        { _id: campaignId },
        { $push: { errorLog: { $each: failedLogs.slice(-500), $slice: -500 } } }
      );
    }

    await refreshCampaignStatsFromMessages(campaignId, accountId).catch(() => {});
    logger.info(`[Campaign:${campaignId}] Background send finished. sent=${sent}, failed=${failed}, status=${status}`);
  } catch (error) {
    logger.error(`[Campaign:${campaignId}] Background send crashed: ${error?.message}`, error);
    await Campaign.updateOne(
      { _id: campaignId, accountId },
      {
        $set: {
          status: 'failed',
          completedAt: new Date()
        },
        $push: {
          errorLog: {
            $each: [{
              timestamp: new Date(),
              errorType: error?.name || 'BackgroundSendError',
              message: error?.message || 'Campaign sender crashed',
              phoneNumber: 'N/A',
              count: 1
            }],
            $slice: -500
          }
        }
      }
    ).catch(() => {});
  } finally {
    activeCampaignSends.delete(key);
  }
};

const resolvePhoneNumberId = async (accountId, projectId = null) => {
  const projectScoped = projectId
    ? await PhoneNumber.findOne({ accountId, projectId, isActive: true }).sort({ createdAt: -1 })
    : null;

  if (projectScoped?.phoneNumberId) return projectScoped.phoneNumberId;

  const fallback = await PhoneNumber.findOne({ accountId, isActive: true }).sort({ createdAt: -1 });
  return fallback?.phoneNumberId || null;
};


export const uploadCampaignAttachment = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    const { uploadToS3 } = await import('../services/s3Service.js');
    const { s3Url, s3Key } = await uploadToS3(
      req.file.buffer,
      accountId,
      'campaign',
      req.file.mimetype,
      req.file.originalname
    );
    return res.status(200).json({ url: s3Url, key: s3Key });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const createCampaign = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const projectId = getProjectId(req);
    const { name, templateId, recipientFilters = {}, scheduling = {}, description = '' } = req.body;

    if (!name || !templateId) {
      return sendValidationError(res, 'Campaign name and template required');
    }

    if (!isValidObjectId(templateId)) {
      return sendValidationError(res, 'Invalid template ID');
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

    const audienceType = ['all', 'all_contacts'].includes(String(recipientFilters.type || ''))
      ? 'all'
      : 'custom';

    const selectedContactIds = Array.isArray(recipientFilters.selectedContactIds)
      ? recipientFilters.selectedContactIds
      : [];

    const selectedPhones = Array.isArray(recipientFilters.selectedPhones)
      ? recipientFilters.selectedPhones.filter(Boolean)
      : [];
    const filters = recipientFilters.filters && typeof recipientFilters.filters === 'object'
      ? recipientFilters.filters
      : {};

    const recipientTotal = audienceType === 'all'
      ? await Contact.countDocuments(await buildRawCampaignContactQuery(accountId, projectId))
      : selectedContactIds.length || selectedPhones.length || 0;

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
        type: audienceType,
        segmentIds: [],
        customFilters: {
          tags: [],
          attributes: {
            selectedContactIds,
            selectedPhones,
            filters
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
        variables: Array.isArray(req.body.variables) ? req.body.variables : [],
        headerMediaUrl: typeof req.body.headerMediaUrl === 'string' ? req.body.headerMediaUrl.trim() : '',
        buttonUrlParam: typeof req.body.buttonUrlParam === 'string' ? req.body.buttonUrlParam.trim() : '',
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

    const query = buildCampaignQuery(campaignId, accountId, projectId);
    if (!query) return sendValidationError(res, 'Invalid campaign ID');

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

    const query = buildCampaignQuery(campaignId, accountId, projectId);
    if (!query) return sendValidationError(res, 'Invalid campaign ID');

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

    const query = buildCampaignQuery(campaignId, accountId, projectId);
    if (!query) return sendValidationError(res, 'Invalid campaign ID');

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

    const query = buildCampaignQuery(campaignId, accountId, projectId);
    if (!query) return sendValidationError(res, 'Invalid campaign ID');

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
    const query = buildCampaignQuery(campaignId, accountId, projectId);
    if (!query) return sendValidationError(res, 'Invalid campaign ID');

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
    const query = buildCampaignQuery(campaignId, accountId, projectId);
    if (!query) return sendValidationError(res, 'Invalid campaign ID');

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
    const query = buildCampaignQuery(campaignId, accountId, projectId);
    if (!query) return sendValidationError(res, 'Invalid campaign ID');

    const campaign = await Campaign.findOne(query);
    if (!campaign) return sendNotFound(res, 'Campaign');

    const recipients = await getCampaignRecipients({ accountId, projectId, campaign });
    if (recipients.length === 0) {
      return sendValidationError(res, 'No valid recipient phone numbers found for this campaign');
    }

    let templateName = campaign.message?.templateName;
    if (!templateName && campaign.message?.templateId) {
      if (!isValidObjectId(campaign.message.templateId)) {
        return sendValidationError(res, 'Invalid template ID');
      }

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

    if (campaign.status === 'running') {
      if (activeCampaignSends.has(String(campaign._id))) {
        return sendSuccess(res, { campaign }, 'Campaign already running');
      }

      logger.info(`[Campaign:${campaign._id}] Resuming running campaign with ${campaign.recipients?.pending || 0} pending recipients`);
      setImmediate(() => {
        runCampaignSendInBackground({
          campaignId: campaign._id,
          accountId,
          projectId,
          recipients,
          templateName: campaign.message?.templateName
        });
      });

      return sendSuccess(res, {
        campaign,
        summary: {
          attempted: recipients.length,
          sent: campaign.recipients?.sent || 0,
          failed: campaign.recipients?.failed || 0,
          status: campaign.status
        }
      }, 'Campaign send resumed', 202);
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

    logger.info(`[Campaign:${campaign._id}] Queuing background bulk send for ${recipients.length} recipients`);
    setImmediate(() => {
      runCampaignSendInBackground({
        campaignId: campaign._id,
        accountId,
        projectId,
        recipients,
        templateName
      });
    });

    return sendSuccess(res, {
      campaign,
      summary: {
        attempted: recipients.length,
        sent: 0,
        failed: 0,
        status: campaign.status
      }
    }, 'Campaign send queued', 202);
  } catch (error) {
    return handleControllerError(res, error, 'startCampaign');
  }
};

export const resumeCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const accountId = req.user?.accountId;
    const projectId = getProjectId(req);
    const query = buildCampaignQuery(campaignId, accountId, projectId);
    if (!query) return sendValidationError(res, 'Invalid campaign ID');

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
    const query = buildCampaignQuery(campaignId, accountId, projectId);
    if (!query) return sendValidationError(res, 'Invalid campaign ID');

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
    const query = buildCampaignQuery(campaignId, accountId, projectId);
    if (!query) return sendValidationError(res, 'Invalid campaign ID');

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
    const query = buildCampaignQuery(campaignId, accountId, projectId);
    if (!query) return sendValidationError(res, 'Invalid campaign ID');

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
