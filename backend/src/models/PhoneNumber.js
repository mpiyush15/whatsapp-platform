import mongoose from 'mongoose';
import crypto from 'crypto';

const phoneNumberSchema = new mongoose.Schema({
  // Multi-tenant isolation - Use String accountId (matches KeywordRule, Contact, etc.)
  accountId: {
    type: String,
    required: true,
    index: true
  },

  // CRITICAL: Workspace/Team isolation within account
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    default: null,
    index: true
  },
  
  // WABA Credentials
  phoneNumberId: {
    type: String,
    required: true
    // ⚠️ IMPORTANT: NOT globally unique - each account can have same phone
    // Uniqueness enforced via compound index below (accountId + phoneNumberId)
  },
  wabaId: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    required: true,
    select: false, // CRITICAL: Prevents accidental token leaks
    set: function(token) {
      // Encrypt token before storing
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(process.env.JWT_SECRET || 'fallback-key', 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    },
    get: function(encrypted) {
      if (!encrypted) return encrypted;
      try {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(process.env.JWT_SECRET || 'fallback-key', 'salt', 32);
        const parts = encrypted.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch (err) {
        return encrypted;
      }
    }
  },
  tokenUpdatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Display info
  displayName: String,
  displayPhone: String, // +1234567890
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  verifiedAt: Date,
  lastTestedAt: Date,
  
  // Usage stats
  messageCount: {
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    read: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
  },
  
  // Quality rating from Meta
  qualityRating: {
    type: String,
    enum: ['green', 'yellow', 'red', 'unknown'],
    default: 'unknown'
  },
  
  // Phone-level Permission Restrictions (enforced per phone)
  phonePermissions: {
    // Maps to account's permission level (inherits if not overridden)
    permissionLevel: {
      type: String,
      enum: ['basic', 'advanced', 'full'],
      default: null,  // null = inherit from account level
      sparse: true
    },
    
    // Are advanced features enabled for this specific phone number
    advancedFeaturesEnabled: {
      type: Boolean,
      default: false
    },
    
    // Enabled features at phone level
    // Can be more restrictive than account level
    enabledFeatures: {
      type: [String],
      default: [],
      enum: ['templates', 'campaigns', 'contacts', 'broadcasts', 'analytics', 'team_management', 'integrations'],
      index: true
    },
    
    // When phone permissions were last updated
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Compound index for account + phoneNumberId
phoneNumberSchema.index({ accountId: 1, phoneNumberId: 1 });
phoneNumberSchema.index({ accountId: 1, isActive: 1 });
phoneNumberSchema.index({ wabaId: 1 });  // For webhook routing

export default mongoose.model('PhoneNumber', phoneNumberSchema);
