import Campaign from '../models/Campaign.js';
import Contact from '../models/Contact.js';
import whatsappService from './whatsappService.js';
import broadcastExecutionService from './broadcastExecutionService.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
export class CampaignService {
  /**
   * Create a new campaign
   */
  async createCampaign(accountId, phoneNumberId, data) {
    try {
      // Validate required fields
      if (!data.name) {
        throw new ValidationError('Campaign name is required');
      }

      // Estimate audience reach
      let estimatedReach = 0;
      if (data.audience) {
        estimatedReach = await this.estimateAudienceReach(accountId, data.audience);
      }

      const campaign = new Campaign({
        accountId,
        phoneNumberId,
        name: data.name,
        description: data.description || '',
        type: data.type || 'broadcast',
        status: 'draft',
        audience: {
          ...data.audience,
          estimatedReach
        },
        message: data.message || {},
        scheduling: data.scheduling || { sendNow: true },
        abTest: data.abTest || { enabled: false },
        automation: data.automation || { enabled: false },
        tags: data.tags || [],
        notes: data.notes || '',
        createdBy: data.createdBy
      });

      await campaign.save();
      return campaign;
    } catch (error) {
      throw new Error(`Failed to create campaign: ${error.message}`);
    }
  }

  /**
   * Get all campaigns for account
   */
  async getCampaigns(accountId, phoneNumberId = null, filters = {}) {
    try {
      const query = { accountId };
      if (phoneNumberId) {
        query.phoneNumberId = phoneNumberId;
      }

      // Apply status filter
      if (filters.status) {
        query.status = filters.status;
      }

      // Apply type filter
      if (filters.type) {
        query.type = filters.type;
      }

      // Apply date range filter
      if (filters.startDate && filters.endDate) {
        query.createdAt = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate)
        };
      }

      // Apply search
      if (filters.search) {
        query.name = { $regex: filters.search, $options: 'i' };
      }

      const campaigns = await Campaign.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);

      return campaigns;
    } catch (error) {
      throw new Error(`Failed to fetch campaigns: ${error.message}`);
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(accountId, campaignId) {
    try {
      const campaign = await Campaign.findOne({
        _id: campaignId,
        accountId
      });

      if (!campaign) {
        throw new NotFoundError('Campaign not found');
      }

      return campaign;
    } catch (error) {
      throw new Error(`Failed to fetch campaign: ${error.message}`);
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(accountId, campaignId, data) {
    try {
      const campaign = await this.getCampaignById(accountId, campaignId);

      // Only allow editing draft campaigns
      if (campaign.status !== 'draft') {
        throw createAppError('Can only edit draft campaigns');
      }

      // Update fields
      if (data.name) campaign.name = data.name;
      if (data.description) campaign.description = data.description;
      if (data.audience) {
        const estimatedReach = await this.estimateAudienceReach(accountId, data.audience);
        campaign.audience = {
          ...data.audience,
          estimatedReach
        };
      }
      if (data.message) campaign.message = data.message;
      if (data.scheduling) campaign.scheduling = data.scheduling;
      if (data.abTest !== undefined) campaign.abTest = data.abTest;
      if (data.automation !== undefined) campaign.automation = data.automation;
      if (data.tags) campaign.tags = data.tags;
      if (data.notes) campaign.notes = data.notes;

      await campaign.save();
      return campaign;
    } catch (error) {
      throw new Error(`Failed to update campaign: ${error.message}`);
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(accountId, campaignId) {
    try {
      const campaign = await this.getCampaignById(accountId, campaignId);

      // Only allow deleting draft campaigns
      if (campaign.status !== 'draft' && campaign.status !== 'failed') {
        throw createAppError('Can only delete draft or failed campaigns');
      }

      await Campaign.deleteOne({ _id: campaignId });
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete campaign: ${error.message}`);
    }
  }

  /**
   * Validate campaign before sending
   */
  async validateCampaign(accountId, campaignId) {
    try {
      const campaign = await this.getCampaignById(accountId, campaignId);

      const errors = [];

      // Check required fields
      if (!campaign.name) errors.push('Campaign name is required');
      if (!campaign.message.content && !campaign.message.templateId) {
        errors.push('Message content or template is required');
      }
      if (!campaign.audience) errors.push('Audience is required');

      // Check audience reach
      if (campaign.audience.estimatedReach === 0) {
        errors.push('No recipients in audience');
      }

      // Check scheduling
      if (!campaign.scheduling.sendNow && !campaign.scheduling.startDate) {
        errors.push('Scheduled campaigns need a start date');
      }

      if (errors.length > 0) {
        return { valid: false, errors };
      }

      return { valid: true, errors: [] };
    } catch (error) {
      throw new Error(`Validation failed: ${error.message}`);
    }
  }

  /**
   * Estimate audience reach
   */
  async estimateAudienceReach(accountId, audience) {
    try {
      if (audience.type === 'all') {
        // Count all active contacts
        const count = await Contact.countDocuments({
          accountId,
          isActive: true
        });
        return count;
      } else if (audience.type === 'segment') {
        // Count contacts in segments
        const count = await Contact.countDocuments({
          accountId,
          tags: { $in: audience.segmentIds }
        });
        return count;
      } else if (audience.type === 'custom') {
        // Count based on custom filters
        const query = { accountId };
        if (audience.customFilters?.tags) {
          query.tags = { $in: audience.customFilters.tags };
        }
        if (audience.customFilters?.excludeUnsubscribed) {
          query.isUnsubscribed = false;
        }

        const count = await Contact.countDocuments(query);
        return count;
      }

      return 0;
    } catch (error) {
      logger.error('Error estimating audience:', error);
      return 0;
    }
  }

  /**
   * Build recipient list for campaign
   */
  async buildRecipientList(accountId, audience) {
    try {
      let recipients = [];

      if (audience.type === 'all') {
        recipients = await Contact.find({
          accountId,
          isActive: true
        }).select('phoneNumber name');

      } else if (audience.type === 'segment') {
        recipients = await Contact.find({
          accountId,
          tags: { $in: audience.segmentIds }
        }).select('phoneNumber name');

      } else if (audience.type === 'custom') {
        const query = { accountId };
        if (audience.customFilters?.tags) {
          query.tags = { $in: audience.customFilters.tags };
        }
        if (audience.customFilters?.excludeUnsubscribed) {
          query.isUnsubscribed = false;
        }

        recipients = await Contact.find(query).select('phoneNumber name');
      }

      return recipients;
    } catch (error) {
      throw new Error(`Failed to build recipient list: ${error.message}`);
    }
  }

  /**
   * Start campaign (begin sending)
   */
  async startCampaign(accountId, phoneNumberId, campaignId) {
    try {
      const campaign = await this.getCampaignById(accountId, campaignId);

      // Validate campaign
      const validation = await this.validateCampaign(accountId, campaignId);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Build recipient list
      const recipients = await this.buildRecipientList(accountId, campaign.audience);
      
      campaign.recipients.total = recipients.length;
      campaign.recipients.pending = recipients.length;
      campaign.status = 'running';
      campaign.startedAt = new Date();

      await campaign.save();

      // Queue for execution
      // TODO: Add to job queue for actual sending
      logger.info(`Campaign ${campaignId} queued for execution with ${recipients.length} recipients`);

      return campaign;
    } catch (error) {
      throw new Error(`Failed to start campaign: ${error.message}`);
    }
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(accountId, campaignId) {
    try {
      const campaign = await this.getCampaignById(accountId, campaignId);

      if (campaign.status !== 'running' && campaign.status !== 'scheduled') {
        throw createAppError('Can only pause running or scheduled campaigns');
      }

      campaign.status = 'paused';
      campaign.pausedAt = new Date();

      await campaign.save();
      return campaign;
    } catch (error) {
      throw new Error(`Failed to pause campaign: ${error.message}`);
    }
  }

  /**
   * Resume campaign
   */
  async resumeCampaign(accountId, campaignId) {
    try {
      const campaign = await this.getCampaignById(accountId, campaignId);

      if (campaign.status !== 'paused') {
        throw createAppError('Can only resume paused campaigns');
      }

      campaign.status = 'running';
      campaign.resumedAt = new Date();

      await campaign.save();
      return campaign;
    } catch (error) {
      throw new Error(`Failed to resume campaign: ${error.message}`);
    }
  }

  /**
   * Cancel campaign
   */
  async cancelCampaign(accountId, campaignId) {
    try {
      const campaign = await this.getCampaignById(accountId, campaignId);

      if (campaign.status === 'completed' || campaign.status === 'failed') {
        throw createAppError('Cannot cancel completed or failed campaigns');
      }

      campaign.status = 'failed';
      campaign.completedAt = new Date();

      await campaign.save();
      return campaign;
    } catch (error) {
      throw new Error(`Failed to cancel campaign: ${error.message}`);
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(accountId, campaignId) {
    try {
      const campaign = await this.getCampaignById(accountId, campaignId);

      // Calculate rates
      const stats = {
        ...campaign.stats.toObject(),
        deliveryRate: campaign.recipients.total > 0 
          ? Math.round((campaign.stats.totalDelivered / campaign.recipients.total) * 100) 
          : 0,
        openRate: campaign.stats.totalDelivered > 0 
          ? Math.round((campaign.stats.totalOpened / campaign.stats.totalDelivered) * 100) 
          : 0,
        clickRate: campaign.stats.totalOpened > 0
          ? Math.round((campaign.stats.totalReplied / campaign.stats.totalOpened) * 100)
          : 0,
        conversionRate: campaign.stats.totalSent > 0
          ? Math.round((campaign.stats.totalConverted / campaign.stats.totalSent) * 100)
          : 0
      };

      return {
        campaign: {
          id: campaign._id,
          name: campaign.name,
          type: campaign.type,
          status: campaign.status,
          createdAt: campaign.createdAt,
          startedAt: campaign.startedAt,
          completedAt: campaign.completedAt
        },
        recipients: campaign.recipients,
        stats
      };
    } catch (error) {
      throw new Error(`Failed to fetch campaign stats: ${error.message}`);
    }
  }

  /**
   * Get all available segments/tags for audience selection
   */
  async getAvailableSegments(accountId) {
    try {
      // Get distinct tags from all contacts in this account
      const segments = await Contact.distinct('tags', { accountId });
      
      // Count contacts per segment
      const segmentsWithCount = await Promise.all(
        segments.map(async (segment) => {
          const count = await Contact.countDocuments({
            accountId,
            tags: segment,
            isActive: true
          });
          return {
            id: segment,
            name: segment,
            count: count
          };
        })
      );

      return segmentsWithCount.filter(s => s.count > 0).sort((a, b) => b.count - a.count);
    } catch (error) {
      logger.error('Error getting available segments:', error);
      return [];
    }
  }

  /**
   * Get campaign templates (saved campaign patterns)
   */
  async saveCampaignAsTemplate(accountId, campaignId, templateName) {
    try {
      const campaign = await this.getCampaignById(accountId, campaignId);

      const template = new Campaign({
        accountId,
        phoneNumberId: campaign.phoneNumberId,
        name: templateName,
        description: `Template based on: ${campaign.name}`,
        type: campaign.type,
        status: 'draft',
        message: campaign.message,
        abTest: campaign.abTest,
        automation: campaign.automation,
        tags: ['template', ...campaign.tags]
      });

      await template.save();
      return template;
    } catch (error) {
      throw new Error(`Failed to save template: ${error.message}`);
    }
  }

  /**
   * Duplicate campaign
   */
  async duplicateCampaign(accountId, phoneNumberId, campaignId, newName) {
    try {
      const campaign = await this.getCampaignById(accountId, campaignId);

      const duplicate = new Campaign({
        accountId,
        phoneNumberId,
        name: newName || `${campaign.name} (Copy)`,
        description: campaign.description,
        type: campaign.type,
        status: 'draft',
        audience: campaign.audience,
        message: campaign.message,
        scheduling: campaign.scheduling,
        abTest: campaign.abTest,
        automation: campaign.automation,
        tags: campaign.tags,
        notes: campaign.notes
      });

      await duplicate.save();
      return duplicate;
    } catch (error) {
      throw new Error(`Failed to duplicate campaign: ${error.message}`);
    }
  }

  /**
   * Update campaign stats (called by execution service)
   */
  async updateCampaignStats(accountId, campaignId, statsUpdate) {
    try {
      const campaign = await this.getCampaignById(accountId, campaignId);

      // Update stats
      Object.keys(statsUpdate).forEach(key => {
        if (campaign.stats[key] !== undefined) {
          campaign.stats[key] += statsUpdate[key];
        }
      });

      // Check if campaign is complete
      if (campaign.recipients.pending === 0 && campaign.status === 'running') {
        campaign.status = 'completed';
        campaign.completedAt = new Date();
      }

      await campaign.save();
      return campaign;
    } catch (error) {
      throw new Error(`Failed to update campaign stats: ${error.message}`);
    }
  }

  /**
   * Log error for campaign
   */
  async logCampaignError(accountId, campaignId, error, phoneNumber = null) {
    try {
      const campaign = await this.getCampaignById(accountId, campaignId);

      const errorEntry = {
        timestamp: new Date(),
        errorType: error.name || 'UnknownError',
        message: error.message,
        phoneNumber: phoneNumber || 'N/A',
        count: 1
      };

      campaign.errorLog.push(errorEntry);
      await campaign.save();

      return campaign;
    } catch (error) {
      logger.error('Failed to log campaign error:', error);
    }
  }
}

export default new CampaignService();
