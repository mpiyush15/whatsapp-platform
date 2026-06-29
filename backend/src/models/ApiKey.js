import mongoose from 'mongoose';
import crypto from 'crypto';

const apiKeySchema = new mongoose.Schema({
  accountId: {
    type: String,
    required: true,
    index: true
  },

  projectId: {
    type: String,
    default: null,
    index: true
  },
  
  name: {
    type: String,
    required: true
  },

  scopes: {
    type: [String],
    default: ['messages:read', 'messages:write', 'contacts:read', 'contacts:write', 'broadcasts:read', 'broadcasts:write', 'webhooks:write'],
  },

  rateLimitPerMinute: {
    type: Number,
    default: 300,
    min: 30,
    max: 5000,
  },

  platform: {
    type: String,
    required: true,
    enum: ['enromatics', 'zapier', 'make', 'integromat', 'custom', 'other'],
    default: 'custom'
  },

  keyHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
    select: false // Don't return in queries by default (security)
  },
  
  keyPrefix: {
    type: String, // Store first 12 chars for identification (e.g., "wpk_live_abc")
    required: true
  },
  
  lastUsedAt: Date,
  expiresAt: Date,
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

// Note: accountId and keyHash already have index: true in schema

// Hash function for API keys
apiKeySchema.statics.hashApiKey = function(apiKey) {
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
};

// Static method to generate API key
apiKeySchema.statics.generateApiKey = function() {
  // Generate cryptographically secure random API key
  // Format: wpk_live_<64_random_hex_chars>
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const apiKey = `wpk_live_${randomBytes}`;
  
  return {
    apiKey,
    keyHash: this.hashApiKey(apiKey),
    keyPrefix: apiKey.substring(0, 12) // "wpk_live_abc"
  };
};

// Static method to find account by API key
apiKeySchema.statics.findByApiKey = async function(apiKey) {
  const hash = this.hashApiKey(apiKey);
  return this.findOne({ keyHash: hash }).select('+keyHash');
};

apiKeySchema.methods.isActive = function isActive() {
  return !this.expiresAt || new Date(this.expiresAt) > new Date();
};

apiKeySchema.methods.hasScope = function hasScope(requiredScope) {
  const scopes = Array.isArray(this.scopes) ? this.scopes : [];
  if (scopes.includes('*') || scopes.includes('all')) return true;
  return scopes.includes(requiredScope);
};

export default mongoose.model('ApiKey', apiKeySchema);
