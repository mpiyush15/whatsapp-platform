import mongoose from 'mongoose';
import { BusinessCategory } from '../constants/enums.js';

const ProjectSchema = new mongoose.Schema({
  // Project Identity
  projectId: {
    type: String,
    required: true,
    unique: true
  },

  // Ownership - Uses String (matches system standard, not ObjectId)
  accountId: {
    type: String,
    required: true,
    index: true
  },

  // Optional Workspace Scoping
  workspaceId: {
    type: String,
    default: null,
    index: true
  },

  // Project Info
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,

  // Business Category - References centralized enum from constants/enums.js
  businessCategory: {
    type: String,
    enum: Object.values(BusinessCategory),
    default: BusinessCategory.OTHER,
    index: true
  },

  // WhatsApp Integration
  whatsappPhoneNumberId: String,
  whatsappBusinessAccountId: String,
  whatsappAccessToken: {
    type: String,
    select: false // hidden by default
  },
  whatsappPhoneNumber: String,

  // Project Settings
  settings: {
    timezone: { type: String, default: 'UTC' },
    autoReplyEnabled: Boolean,
    autoReplyMessage: String,
    notificationsEnabled: Boolean,
    webhookUrl: String,
    webhookSecret: String
  },

  // Vertical — determines which feature set is active for this project
  vertical: {
    type: String,
    enum: ['whatsapp', 'healthcare', 'ecommerce', 'pathology', 'education'],
    default: 'whatsapp',
    index: true
  },

  // Status & Metadata
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    index: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure only one default project per account
ProjectSchema.index({ accountId: 1, isDefault: 1 }, { 
  unique: true, 
  partialFilterExpression: { isDefault: true } 
});

export default mongoose.model('Project', ProjectSchema);
