import mongoose from 'mongoose';

/**
 * ChatbotLead Schema
 * Stores responses collected from completed chatbot workflows
 * Dynamic fields based on chatbot's "saveAs" configuration
 */
const chatbotLeadSchema = new mongoose.Schema({
  chatbotId: {
    type: String,
    required: true,
    index: true
  },
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
    required: true
  },
  customerPhone: {
    type: String,
    required: true,
    index: true
  },
  customerName: {
    type: String,
    sparse: true
  },
  
  // Dynamic responses object - stores all fields collected by chatbot
  // Example: { name: "John", email: "john@example.com", issue: "Billing" }
  responses: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Reference to the workflow session that created this lead
  workflowSessionId: {
    type: String,
    sparse: true
  },
  
  // Lead status
  status: {
    type: String,
    enum: ['new', 'contacted', 'converted', 'rejected'],
    default: 'new',
    index: true
  },
  
  // Notes about the lead
  notes: {
    type: String,
    default: ''
  },
  
  // Contact created from this lead (if converted)
  convertedContactId: {
    type: String,
    sparse: true
  },
  
  convertedAt: {
    type: Date,
    sparse: true
  },
  
  convertedBy: {
    type: String,
    sparse: true // User ID who converted
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
  }
});

// Auto-update updatedAt
chatbotLeadSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Note: chatbotId and accountId already have index: true in schema

const ChatbotLead = mongoose.model('ChatbotLead', chatbotLeadSchema);

export default ChatbotLead;
