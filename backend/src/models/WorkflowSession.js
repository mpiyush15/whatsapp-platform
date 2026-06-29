import mongoose from 'mongoose';

/**
 * WorkflowSession Schema
 * Tracks active conversational workflows with users
 */
const workflowSessionSchema = new mongoose.Schema({
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
  contactPhone: {
    type: String,
    required: true,
    index: true
  },
  customerName: {
    type: String,
  },
  ruleId: {
    type: String,
    required: true
  },
  workflowSteps: [{
    id: String,
    type: { 
      type: String, 
      enum: ['text', 'buttons', 'list', 'question', 'condition', 'calendar', 'form', 'vertical_action'] 
    },
    text: String,
    buttons: [{
      id: String,
      title: String,
      url: String,
      nextStepId: String // For conditional branching
    }],
    listItems: [{
      id: String,
      title: String,
      description: String,
      nextStepId: String // For conditional branching
    }],
    dynamicList: String,
    delay: { type: Number, default: 0 },
    saveAs: String, // Variable name to save response as
    waitForResponse: { type: Boolean, default: false },
    // Conditional branching
    condition: {
      variable: String, // Which response to check
      branches: [{
        value: String, // If response equals this
        nextStepId: String // Go to this step
      }],
      defaultNextStepId: String // Default if no match
    },
    // Calendar booking
    calendarConfig: {
      enabled: Boolean,
      availableDays: [String], // ['monday', 'tuesday', etc.]
      timeSlots: [String], // ['09:00', '10:00', '14:00', etc.]
      duration: Number // minutes
    },
    // Vertical action execution
    vertical: String,
    action: String,
    actionConfig: {
      type: Map,
      of: String,
      default: {}
    }
  }],
  currentStepIndex: {
    type: Number,
    default: 0
  },
  responses: {
    type: Map,
    of: String,
    default: {}
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'expired', 'cancelled'],
    default: 'active',
    index: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  awaitingResponseSince: {
    type: Date
  },
  /** When set, cron job expires session if user has not replied (multi-instance safe) */
  responseDeadlineAt: {
    type: Date,
    default: null,
    index: true
  },
  timeoutMinutes: {
    type: Number,
    default: 1 // 1 minute timeout for user response
  },
  hasTimedOut: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for finding active sessions
workflowSessionSchema.index({ 
  contactPhone: 1, 
  status: 1, 
  accountId: 1 
});

// Index for cleanup of expired sessions
workflowSessionSchema.index({ expiresAt: 1 });
workflowSessionSchema.index({ status: 1, responseDeadlineAt: 1 });

// Method to get current step
workflowSessionSchema.methods.getCurrentStep = function() {
  return this.workflowSteps[this.currentStepIndex];
};

// Method to advance to next step
workflowSessionSchema.methods.advanceStep = function() {
  this.currentStepIndex++;
  this.lastActivityAt = new Date();
  return this.currentStepIndex < this.workflowSteps.length;
};

// Method to save response
workflowSessionSchema.methods.saveResponse = function(variableName, value) {
  this.responses.set(variableName, value);
  this.lastActivityAt = new Date();
};

// Method to check if workflow is complete
workflowSessionSchema.methods.isComplete = function() {
  return this.currentStepIndex >= this.workflowSteps.length;
};

// Method to check if session has timed out (user not responding)
workflowSessionSchema.methods.checkTimeout = function() {
  if (!this.awaitingResponseSince) return false;
  
  const timeoutMs = this.timeoutMinutes * 60 * 1000;
  const elapsedMs = Date.now() - this.awaitingResponseSince.getTime();
  
  return elapsedMs >= timeoutMs;
};

const WorkflowSession = mongoose.model('WorkflowSession', workflowSessionSchema);

export default WorkflowSession;
