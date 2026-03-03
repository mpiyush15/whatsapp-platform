import mongoose from 'mongoose';

const agentSchema = new mongoose.Schema({
  // Agent Identity
  agentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Account & Workspace Association
  accountId: {
    type: String,
    required: true,
    index: true
  },
  workspaceId: {
    type: String,
    // Can be either:
    // 1. Account's _id.toString() for new subdomain-based workspaces
    // 2. Account's accountId for legacy accounts
    index: true
  },
  
  // Basic Info
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  phone: String,
  
  // Role & Permissions
  role: {
    type: String,
    enum: ['agent', 'team-lead', 'supervisor', 'manager'],
    default: 'agent'
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'on-leave', 'suspended'],
    default: 'active'
  },
  
  // Assignment & Load Management
  assignedConversations: [{
    conversationId: mongoose.Schema.Types.ObjectId,
    assignedAt: Date,
    unassignedAt: Date,
    status: {
      type: String,
      enum: ['active', 'resolved', 'pending'],
      default: 'active'
    }
  }],
  
  // Capacity & Performance
  maxConcurrentConversations: {
    type: Number,
    default: 10
  },
  currentActiveConversations: {
    type: Number,
    default: 0,
    index: true
  },
  
  // Performance Metrics
  metrics: {
    totalConversationsHandled: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    },
    averageResolutionTime: {
      type: Number,
      default: 0
    },
    customerSatisfactionRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalMessagesHandled: {
      type: Number,
      default: 0
    },
    lastUpdated: Date
  },
  
  // Availability
  availability: {
    status: {
      type: String,
      enum: ['available', 'busy', 'offline', 'away'],
      default: 'offline'
    },
    lastStatusChange: Date,
    lastActive: Date
  },
  
  // Account Creation & Invitation
  invitationToken: {
    type: String,
    index: true,
    sparse: true
  },
  invitationSentAt: Date,
  invitationExpiresAt: Date,
  accountCreated: {
    type: Boolean,
    default: false
  },
  
  // Auth Info (created when agent accepts invitation)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  
  // Manager/Team Assignment
  reportingTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    sparse: true  // Only for non-manager agents
  },
  
  // Team Management (for team leads/supervisors)
  teamMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
  }],
  
  // Department/Division (optional)
  department: String,
  
  // Custom Fields
  metadata: {
    type: Map,
    of: String,
    default: new Map()
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  invitationAcceptedAt: Date,
  deletedAt: {
    type: Date,
    sparse: true,
    index: true
  }
}, { timestamps: true });

// Virtual for checking if invitation is still valid
agentSchema.virtual('invitationValid').get(function() {
  if (!this.invitationToken || !this.invitationExpiresAt) return false;
  return this.invitationExpiresAt > new Date() && !this.accountCreated;
});

// Index for workspace-based queries
agentSchema.index({ workspaceId: 1, status: 1 });
agentSchema.index({ workspaceId: 1, role: 1 });
agentSchema.index({ workspaceId: 1, reportingTo: 1 });

const Agent = mongoose.model('Agent', agentSchema);

export default Agent;
