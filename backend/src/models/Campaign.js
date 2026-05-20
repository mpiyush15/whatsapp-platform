import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    accountId: {
      type: String,
      required: true,
      index: true
    },

    // Project isolation (NEW - Phase 1)
    projectId: {
      type: String,
      default: null,
      index: true
    },

    phoneNumberId: {
      type: String,
      required: true,
      index: true
    },

    // Basic info
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      enum: ['broadcast', 'drip', 'automation', 'ab-test'],
      default: 'broadcast'
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'failed'],
      default: 'draft'
    },

    // Audience
    audience: {
      type: {
        type: String,
        enum: ['all', 'segment', 'custom'],
        default: 'all'
      },
      segmentIds: [String],
      customFilters: {
        tags: [String],
        attributes: mongoose.Schema.Types.Mixed,
        excludeUnsubscribed: { type: Boolean, default: true }
      },
      estimatedReach: {
        type: Number,
        default: 0
      }
    },

    // Message
    message: {
      type: {
        type: String,
        enum: ['text', 'template', 'media', 'interactive'],
        default: 'text'
      },
      content: String,
      templateId: String,
      templateName: String,
      variables: [String],
      mediaUrls: [String],
      mediaType: String,
      buttons: [
        {
          text: String,
          type: {
            type: String,
            enum: ['call', 'url', 'quickreply']
          },
          value: String
        }
      ]
    },

    // Scheduling
    scheduling: {
      sendNow: {
        type: Boolean,
        default: true
      },
      startDate: Date,
      endDate: Date,
      timezone: {
        type: String,
        default: 'Asia/Kolkata'
      },
      frequency: {
        type: String,
        enum: ['once', 'daily', 'weekly', 'monthly'],
        default: 'once'
      },
      deliveryTime: String, // HH:MM format
      daysOfWeek: [Number] // 0-6 for weekly
    },

    // A/B Testing
    abTest: {
      enabled: {
        type: Boolean,
        default: false
      },
      variants: [
        {
          id: String,
          name: String,
          message: mongoose.Schema.Types.Mixed,
          splitPercentage: Number,
          winner: { type: Boolean, default: false },
          stats: {
            sent: { type: Number, default: 0 },
            delivered: { type: Number, default: 0 },
            opened: { type: Number, default: 0 },
            clicked: { type: Number, default: 0 }
          }
        }
      ],
      winnerCriteria: {
        type: String,
        enum: ['clicks', 'conversions', 'engagement', 'opens']
      },
      testDurationDays: Number
    },

    // Automation
    automation: {
      enabled: {
        type: Boolean,
        default: false
      },
      triggers: [
        {
          type: {
            type: String,
            enum: ['user_action', 'tag_added', 'date_based', 'custom']
          },
          condition: mongoose.Schema.Types.Mixed
        }
      ],
      workflow: [
        {
          stepId: String,
          delayHours: Number,
          message: mongoose.Schema.Types.Mixed,
          conditions: [mongoose.Schema.Types.Mixed]
        }
      ]
    },

    // Recipients
    recipients: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      inProgress: { type: Number, default: 0 }
    },

    // Stats
    stats: {
      totalSent: { type: Number, default: 0 },
      totalDelivered: { type: Number, default: 0 },
      totalFailed: { type: Number, default: 0 },
      totalOpened: { type: Number, default: 0 },
      totalReplied: { type: Number, default: 0 },
      totalReplyMessages: { type: Number, default: 0 },
      totalClicked: { type: Number, default: 0 },
      totalConverted: { type: Number, default: 0 },
      
      // Rates
      deliveryRate: { type: Number, default: 0 },
      openRate: { type: Number, default: 0 },
      clickRate: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
      
      // Revenue
      estimatedRevenue: { type: Number, default: 0 }
    },

    // Tracking
    trackingUrl: String,
    webhookUrl: String,
    trackingPixel: String,

    // Throttling
    throttleRate: {
      type: Number,
      default: 50, // messages per second
      description: 'Messages per second'
    },

    // Metadata
    createdBy: String,
    startedAt: Date,
    completedAt: Date,
    pausedAt: Date,
    resumedAt: Date,

    // Error handling
    errorLog: [
      {
        timestamp: { type: Date, default: Date.now },
        errorType: String,
        message: String,
        phoneNumber: String,
        count: { type: Number, default: 1 }
      }
    ],

    // Tags for organization
    tags: [String],

    // Notes
    notes: String
  },
  {
    timestamps: true,
    collection: 'campaigns'
  }
);

// Indexes for performance
campaignSchema.index({ accountId: 1, phoneNumberId: 1 });
campaignSchema.index({ accountId: 1, status: 1 });
campaignSchema.index({ accountId: 1, createdAt: -1 });
campaignSchema.index({ status: 1, scheduling: 1 });

const Campaign = mongoose.model('Campaign', campaignSchema);

export default Campaign;
