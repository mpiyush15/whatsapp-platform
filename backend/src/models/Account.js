import mongoose from 'mongoose';
import crypto from 'crypto';

const accountSchema = new mongoose.Schema({
  // Account Identity (Universal Identifier)
  // Format Rules:
  // 1. SUPERADMIN ACCOUNTS: 2600001 to 2600099 (reserved range)
  //    - 26 = 2026 (year)
  //    - 00 = 00 (reserved)
  //    - 001-099 = superadmin ID
  //
  // 2. PAYING CLIENT ACCOUNTS: YYMMDD + Sequential #
  //    - YY = last 2 digits of year (26 for 2026)
  //    - MM = month (01-12)
  //    - DD = day (01-31)
  //    - XX = client number (01-99)
  //    Example: 26041601 = April 16, 2026, Client #1
  //             26041602 = April 16, 2026, Client #2
  accountId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^\d{7,8}$/  // 7-8 digits validation
  },
  
  // Account Type (CRITICAL for multi-use case)
  // Values match frontend AccountType enum: 'internal', 'client', 'agency'
  // - 'internal': ReplySystem internal account (superadmin accounts)
  // - 'client': Customer account (end users)
  // - 'agency': Agency/partner account (resellers)
  type: {
    type: String,
    enum: {
      values: ['internal', 'client', 'agency'],
      message: '{VALUE} is not a valid account type. Use: internal, client, or agency'
    },
    required: true,
    default: 'client'
  },
  
  // Role (for permission management)
  role: {
    type: String,
    enum: {
      values: ['superadmin', 'admin', 'manager', 'agent', 'user'],
      message: '{VALUE} is not a valid role. Use: superadmin, admin, manager, agent, or user'
    },
    required: true,
    default: 'user'
  },

  // Account Info
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
    // NOT unique - agencies may have multiple accounts
    // Uniqueness enforced at auth layer later
  },
  company: {
    type: String
  },
  phone: {
    type: String
  },
  timezone: {
    type: String,
    default: 'America/New_York'
  },
  
  // Multi-Tenancy: Subdomain for workspace identification
  // Format: client-a, client-b, my-company (lowercase, hyphens only)
  subdomain: {
    type: String,
    unique: true,
    sparse: true,  // Allow null for old accounts
    lowercase: true,
    trim: true,
    match: /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/,  // Valid subdomain format
    index: true
  },
  
  // WhatsApp WABA ID (Meta Business Account ID for webhook routing)
  // ⚠️ CRITICAL: Must be unique to prevent cross-account contamination
  // Note: sparse: true allows multiple null values, but unique: true enforces uniqueness for actual values
  // This prevents multiple accounts from sharing the same WABA ID (multi-tenancy violation)
  wabaId: {
    type: String,
    index: true,
    sparse: true,  // Allow null for accounts without WABA (migration case)
    unique: true   // 🔥 ENFORCE: Only ONE account per WABA ID (critical for webhook isolation)
  },
  
  // Business ID (Meta Business Account ID owner of WABA - for API calls)
  businessId: {
    type: String,
    index: true,
    sparse: true  // Optional - only for accounts with Business ID
  },
  
  // Business Advanced Permissions Management (for app review & feature access)
  businessPermissions: {
    // Permission level granted by Meta (tracked for compliance & feature access)
    permissionLevel: {
      type: String,
      enum: ['basic', 'advanced', 'full'],
      default: 'basic',
      index: true
    },
    
    // Is advanced management currently enabled for this account
    advancedManagementEnabled: {
      type: Boolean,
      default: false,
      index: true
    },
    
    // Approved scopes/features from Meta
    // Examples: 'templates', 'campaigns', 'contacts', 'broadcasts'
    approvedScopes: {
      type: [String],
      default: [],
      enum: ['templates', 'campaigns', 'contacts', 'broadcasts', 'analytics', 'team_management', 'integrations'],
      index: true
    },
    
    // Permission request tracking
    requestedAt: {
      type: Date,
      sparse: true,
      index: true
    },
    requestedBy: {
      type: String,  // Email or userId of who requested
      sparse: true
    },
    
    // Permission approval tracking (from Meta)
    approvedAt: {
      type: Date,
      sparse: true,
      index: true
    },
    approvedBy: {
      type: String,  // Meta team/system
      sparse: true
    },
    
    // Permission rejection tracking (if rejected by Meta)
    rejectedAt: {
      type: Date,
      sparse: true,
      index: true
    },
    rejectionReason: {
      type: String,
      sparse: true
    },
    
    // Permission expiration (for time-limited grants)
    expiresAt: {
      type: Date,
      sparse: true,
      index: true
    },
    
    // Raw approval metadata from Meta
    metaApprovalData: mongoose.Schema.Types.Mixed
  },
  
  // Meta Sync Details (from webhook account_update and OAuth flow)
  metaSync: {
    // OAuth flow tracking
    status: {
      type: String,
      enum: ['oauth_pending', 'oauth_completed_awaiting_webhook', 'fully_synced', 'error'],
      default: null,
      index: true, // Index for faster webhook lookups
      sparse: true
    },
    oauth_timestamp: {
      type: Date,
      index: true,
      sparse: true
    },
    oauthAccessToken: {
      type: String,
      // ⚠️ IMPORTANT: NOT select: false here!
      // Webhook handler MUST access this token to fetch phone numbers after OAuth
      // Access token is ONLY used internally for Meta API calls (never exposed to frontend)
      // This is safe because:
      //   1. Only backend can query with select('+metaSync.oauthAccessToken')
      //   2. JwtAuth middleware strips all internal fields before sending to frontend
      //   3. Used only for Meta API calls, not exposed in any API response
      select: false  // Explicitly hide by default, but accessible via +metaSync.oauthAccessToken query
    },
    accountId: {
      type: String,
      index: true,
      sparse: true
    },
    note: String,
    
    // Raw webhook data from Meta account_update event
    webhookData: mongoose.Schema.Types.Mixed,
    // Last time Meta sent account_update webhook
    lastWebhookAt: Date,
    // Track if account is synced with Meta
    isSynced: { type: Boolean, default: false },
    // Status from webhook (e.g., active, pending, suspended)
    metaStatus: String
  },
  
  // Password (hashed with bcrypt)
  password: {
    type: String,
    select: false // Don't return in queries by default (security)
  },
  
  // API Authentication (Phase 2B - Hashed)
  apiKeyHash: {
    type: String,
    unique: true,
    sparse: true, // Allow null values, but enforce uniqueness when present
    index: true,
    select: false // Don't return in queries by default (security)
  },
  apiKeyPrefix: {
    type: String, // Store first 12 chars for identification (e.g., "wpk_live_abc")
    select: true
  },
  apiKeyCreatedAt: Date,
  apiKeyLastUsedAt: Date,
  
  // Integration Token (for external apps like Enromatics)
  integrationTokenHash: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
    select: false // Don't return in queries by default (security)
  },
  integrationTokenPrefix: {
    type: String, // Store first 12 chars for identification (e.g., "wpk_live_ab")
    select: true
  },
  integrationTokenCreatedAt: Date,
  integrationTokenLastUsedAt: Date,

  // Connected Platforms (track which external platforms are connected)
  connectedPlatforms: [{
    name: String, // e.g., "Enromatics", "Zapier", "Custom CRM"
    isConnected: {
      type: Boolean,
      default: false
    },
    connectedAt: Date,
    lastTestedAt: Date,
    testStatus: String, // 'success', 'failed', 'pending'
    apiKeyPrefix: String // Reference to which API key is used for this platform
  }],
  
  // Subscription (Phase 2)
  plan: {
    type: String,
    enum: ['free', 'starter', 'pro', 'enterprise', 'custom'], // Lowercase versions of PricingPlan names
    default: 'free'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'annual'],
    default: 'monthly'
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'active', 'suspended', 'cancelled'],
      message: '{VALUE} is not a valid account status. Use: pending, active, suspended, or cancelled'
    },
    default: 'active',
    index: true
  },
  
  // Limits (based on plan)
  limits: {
    phoneNumbers: { type: Number, default: 1 },
    messagesPerDay: { type: Number, default: 1000 },
    templates: { type: Number, default: 10 },
    contacts: { type: Number, default: 500 }
  },
  
  // ✅ CLIENT ONBOARDING: Payment Tracking Fields
  totalPayments: {
    type: Number,
    default: 0,
    index: true
  },
  
  lastPaymentDate: {
    type: Date,
    default: null
  },
  
  nextBillingDate: {
    type: Date,
    default: null
  },
  
  paymentHistory: [{
    invoiceId: mongoose.Schema.Types.ObjectId,
    orderId: String,
    amount: Number,
    paidDate: Date,
    paymentMethod: String,
    _id: false
  }],
  
  // Demo Account Settings (for testing & email app review)
  isDemoAccount: {
    type: Boolean,
    default: false,
    index: true
  },
  demoLabel: {
    type: String,
    enum: ['demo', 'test', 'staging', null],
    default: null,
    sparse: true
  },
  demoNote: {
    type: String,
    default: 'Demo account for testing WhatsApp integration features and email app review'
  },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  lastActiveAt: Date,
  lastLogin: Date,
  loginCount: { type: Number, default: 0 }
}, { 
  timestamps: true 
});

// ✅ INDEX SUMMARY FOR QUERY PERFORMANCE:
// Primary lookups:
//   - accountId: UNIQUE INDEX (primary identifier)
//   - subdomain: UNIQUE INDEX (workspace identification)
//   - wabaId: UNIQUE INDEX (webhook routing, prevents cross-account contamination)
//
// Secondary lookups:
//   - metaSync.status: INDEX (webhook account matching)
//   - metaSync.oauth_timestamp: INDEX (OAuth flow tracking)
//   - metaSync.accountId: INDEX (OAuth account linking)
//   - apiKeyHash: UNIQUE INDEX (API authentication)
//   - integrationTokenHash: UNIQUE INDEX (External integration auth)
//   - totalPayments: INDEX (billing queries)
//
// 🔒 MULTI-TENANCY SAFETY CRITICAL FIELDS:
//   1. wabaId (unique) - Only ONE account per WABA ID
//   2. subdomain (unique) - Only ONE workspace per subdomain
//   3. apiKeyHash (unique) - Only ONE account per API key
//   4. integrationTokenHash (unique) - Only ONE account per token
//
// ⚠️ SECURITY NOTES:
//   - password: select: false (never returned in queries)
//   - apiKeyHash: select: false (only accessible with explicit select)
//   - integrationTokenHash: select: false (only accessible with explicit select)
//   - metaSync.oauthAccessToken: select: false (only accessible with explicit select)
//
// These prevent accidental exposure of sensitive data in API responses

// Hash function for API keys
accountSchema.statics.hashApiKey = function(apiKey) {
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
};

// Method to generate and hash API key
accountSchema.methods.generateApiKey = function() {
  // Generate cryptographically secure random API key
  // Format: wpk_live_<64_random_hex_chars> (whatsapp-platform-key)
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const apiKey = `wpk_live_${randomBytes}`;
  
  // Store hash (for validation) and prefix (for display)
  this.apiKeyHash = this.constructor.hashApiKey(apiKey);
  this.apiKeyPrefix = apiKey.substring(0, 12); // "wpk_live_abc"
  this.apiKeyCreatedAt = new Date();
  
  // Return plaintext key (ONLY TIME IT'S VISIBLE)
  return apiKey;
};

// Static method to find account by API key
accountSchema.statics.findByApiKey = async function(apiKey) {
  const hash = this.hashApiKey(apiKey);
  return this.findOne({ apiKeyHash: hash, status: 'active' }).select('+apiKeyHash');
};

// Method to validate API key
accountSchema.methods.validateApiKey = function(apiKey) {
  const hash = this.constructor.hashApiKey(apiKey);
  return this.apiKeyHash === hash;
};

// Integration Token Methods (for external app integrations like Enromatics)
accountSchema.methods.generateIntegrationToken = function() {
  // Generate cryptographically secure random integration token
  // Format: wpk_live_<64_random_hex_chars> (whatsapp-platform-key-live for external integrations)
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const integrationToken = `wpk_live_${randomBytes}`;
  
  // Store hash (for validation) and prefix (for display)
  this.integrationTokenHash = this.constructor.hashApiKey(integrationToken);
  this.integrationTokenPrefix = integrationToken.substring(0, 12); // "wpk_live_ab"
  this.integrationTokenCreatedAt = new Date();
  
  // Return plaintext token (ONLY TIME IT'S VISIBLE)
  return integrationToken;
};

// Static method to find account by integration token
accountSchema.statics.findByIntegrationToken = async function(integrationToken) {
  const hash = this.hashApiKey(integrationToken);
  return this.findOne({ integrationTokenHash: hash, status: 'active' }).select('+integrationTokenHash');
};

// Method to validate integration token
accountSchema.methods.validateIntegrationToken = function(integrationToken) {
  const hash = this.constructor.hashApiKey(integrationToken);
  return this.integrationTokenHash === hash;
};

export default mongoose.model('Account', accountSchema);
