import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  // Multi-tenant isolation - Use String accountId (matches source of truth: YYXXXXX format)
  // ✅ CRITICAL FIX: accountId is ALWAYS a String (e.g., "2600001"), never ObjectId
  accountId: {
    type: String,
    required: true,
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
  
  // Meta template data
  category: {
    type: String,
    enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
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
  
  // Media/Header support
  hasMedia: {
    type: Boolean,
    default: false
  },
  mediaType: {
    type: String,
    enum: ['IMAGE', 'VIDEO', 'DOCUMENT'],
    default: 'IMAGE'
  },
  mediaUrl: String,              // For URL-based media
  mediaFilePath: String,         // For uploaded files (stored path)
  mediaFileName: String,         // Original filename
  headerText: String,            // For video/document headers
  footerText: String,
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected'],
    default: 'draft'
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
  deleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
templateSchema.index({ accountId: 1, name: 1 });
templateSchema.index({ accountId: 1, status: 1 });
templateSchema.index({ accountId: 1, deleted: 1 });

export default mongoose.model('Template', templateSchema);
