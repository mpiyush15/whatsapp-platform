import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  // Multi-tenant isolation - Use String accountId (matches source of truth: YYXXXXX format)
  // ✅ CRITICAL FIX: accountId is ALWAYS a String (e.g., "2600001"), never ObjectId
  accountId: {
    type: String,
    required: true,
    index: true
  },

  // Vertical scoping
  vertical: {
    type: String,
    enum: ['whatsapp', 'healthcare', 'ecommerce', 'pathology', 'education'],
    index: true
  },

  // Preset template fields
  isPreset: {
    type: Boolean,
    default: false
  },
  presetKey: {
    type: String,
    unique: true,
    sparse: true
  },
  isClientApproved: {
    type: Boolean,
    default: false
  },

  // Project isolation (NEW - Phase 1)
  projectId: {
    type: String,
    default: null,
    index: true
  },
  
  // Template identity
  name: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: 'en'
  },
  templateType: {
    type: String,
    enum: ['default', 'catalogue', 'calling_permissions_request'],
    default: 'default'
  },
  
  // Meta template data
  category: {
    type: String,
    enum: {
      values: ['marketing', 'utility', 'authentication', 'MARKETING', 'UTILITY', 'AUTHENTICATION'],
      message: '{VALUE} is not a valid template category'
    },
    default: 'UTILITY'
  },
  content: {
    type: String,
    required: true
  },
  variables: {
    type: [String], // ["1", "2"]
    default: []
  },
  // Variable to field mappings
  variableMappings: {
    type: Map,
    of: new mongoose.Schema({
      variableNumber: String,  // "1", "2", "3"
      fieldName: String,       // "name", "email", "phone", "order_id", etc.
      fieldLabel: String,      // "Customer Name", "Email Address", etc.
      description: String      // Optional description
    }, { _id: false }),
    default: {}
  },
  components: {
    type: Array, // Full Meta components
    default: []
  },
  variableConfig: {
    type: Array,
    default: []
  },
  
  // Media/Header support
  hasMedia: {
    type: Boolean,
    default: false
  },
  mediaType: {
    type: String,
    enum: {
      values: ['image', 'video', 'document'],
      message: '{VALUE} is not a valid media type'
    },
  },
  mediaUrl: String,              // For URL-based media
  mediaFilePath: String,         // For uploaded files (stored path)
  mediaFileName: String,         // Original filename
  headerText: String,            // For video/document headers
  footerText: String,
  
  // Status
  status: {
    type: String,
    enum: {
      values: ['draft', 'pending', 'approved', 'rejected'],
      message: '{VALUE} is not a valid template status'
    },
    default: 'draft',
    index: true
  },
  metaTemplateId: String,
  
  // Usage tracking (monetizable)
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: Date,
  lastSyncedAt: Date,
  
  // Approval info
  approvedAt: Date,
  rejectedAt: Date,
  rejectedReason: String,
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
templateSchema.index({ accountId: 1, name: 1 });
templateSchema.index({ accountId: 1, status: 1 });
templateSchema.index({ accountId: 1, isDeleted: 1 });

export default mongoose.model('Template', templateSchema);
