/**
 * 🎯 CENTRALIZED ENUM DEFINITIONS
 * Single source of truth for ALL enums across backend + frontend
 * Import from here everywhere - NO duplicates!
 */

// ============================================
// ACCOUNT & AUTHENTICATION
// ============================================
export const AccountType = {
  INTERNAL: 'internal',
  CLIENT: 'client',
  AGENCY: 'agency',
};

export const UserRole = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  AGENT: 'agent',
  USER: 'user',
};

export const AccountStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
};

export const MetaSyncStatus = {
  OAUTH_PENDING: 'oauth_pending',
  OAUTH_COMPLETED_AWAITING_WEBHOOK: 'oauth_completed_awaiting_webhook',
  FULLY_SYNCED: 'fully_synced',
  ERROR: 'error',
};

export const PermissionLevel = {
  BASIC: 'basic',
  ADVANCED: 'advanced',
  FULL: 'full',
};

// ============================================
// PHONE NUMBERS
// ============================================
export const PhoneStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  RESTRICTED: 'restricted',
  DELETED: 'deleted',
};

export const PhoneQualityRating = {
  GREEN: 'green',
  YELLOW: 'yellow',
  RED: 'red',
  UNKNOWN: 'unknown',
};

// ============================================
// CONVERSATIONS & MESSAGES
// ============================================
export const ConversationStatus = {
  OPEN: 'open',
  CLOSED: 'closed',
};

export const MessageStatus = {
  QUEUED: 'queued',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
};

export const MessageDirection = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
};

export const MessageType = {
  TEXT: 'text',
  TEMPLATE: 'template',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  VOICE: 'voice',
  DOCUMENT: 'document',
  LOCATION: 'location',
  STICKER: 'sticker',
  INTERACTIVE: 'interactive',
  BUTTON: 'button',
  REACTION: 'reaction',
};

export const AssignmentStatus = {
  ACTIVE: 'active',
  RESOLVED: 'resolved',
  TRANSFERRED: 'transferred',
  ABANDONED: 'abandoned',
};

export const AssignmentMode = {
  COMPLETED: 'completed',
  TRANSFERRED: 'transferred',
  ABANDONED: 'abandoned',
  TIMEOUT: 'timeout',
  MANUAL: 'manual',
};

// ============================================
// TEMPLATES
// ============================================
export const TemplateStatus = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const TemplateCategory = {
  MARKETING: 'marketing',
  UTILITY: 'utility',
  AUTHENTICATION: 'authentication',
};

// ============================================
// CAMPAIGNS
// ============================================
export const CampaignType = {
  BROADCAST: 'broadcast',
  DRIP: 'drip',
  AUTOMATION: 'automation',
  AB_TEST: 'ab-test',
};

export const CampaignStatus = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export const CampaignTargetType = {
  ALL: 'all',
  SEGMENT: 'segment',
  CUSTOM: 'custom',
};

export const CampaignTriggerType = {
  USER_ACTION: 'user_action',
  TAG_ADDED: 'tag_added',
  DATE_BASED: 'date_based',
  CUSTOM: 'custom',
};

// ============================================
// LEADS
// ============================================
export const LeadStatus = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  NEGOTIATING: 'negotiating',
  CONVERTED: 'converted',
  LOST: 'lost',
  STALE: 'stale',
};

export const LeadSource = {
  WHATSAPP: 'whatsapp',
  WEBSITE: 'website',
  MANUAL: 'manual',
  IMPORT: 'import',
};

// ============================================
// CONTACTS
// ============================================
export const ContactType = {
  CUSTOMER: 'customer',
  LEAD: 'lead',
  OTHER: 'other',
};

// ============================================
// AGENTS
// ============================================
export const AgentRole = {
  AGENT: 'agent',
  TEAM_LEAD: 'team-lead',
  SUPERVISOR: 'supervisor',
  MANAGER: 'manager',
};

export const AgentStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ON_LEAVE: 'on-leave',
  SUSPENDED: 'suspended',
};

export const AgentAvailability = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  AWAY: 'away',
  OFFLINE: 'offline',
};

// ============================================
// PAYMENTS & INVOICES
// ============================================
export const PaymentStatus = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  PARTIAL: 'partial',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
};

export const PaymentMethod = {
  CARD: 'card',
  BANK_TRANSFER: 'bank_transfer',
  UPI: 'upi',
  WALLET: 'wallet',
  CRYPTO: 'crypto',
};

export const PaymentType = {
  SUBSCRIPTION: 'subscription',
  ONE_TIME: 'one_time',
  ADDON: 'addon',
};

export const SubscriptionStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

// ============================================
// INTEGRATIONS
// ============================================
export const IntegrationType = {
  ENROMATICS: 'enromatics',
  ZAPIER: 'zapier',
  MAKE: 'make',
  INTEGROMAT: 'integromat',
  CUSTOM: 'custom',
  OTHER: 'other',
};

export const WebhookStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  FAILED: 'failed',
  PENDING: 'pending',
};

// ============================================
// TAGS & RULES
// ============================================
export const TagType = {
  CUSTOM: 'custom',
  AUTO: 'auto',
  SYSTEM: 'system',
};

export const KeywordRuleAction = {
  TAG: 'tag',
  ASSIGN: 'assign',
  RESPOND: 'respond',
  FORWARD: 'forward',
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert enum to array of values
 * @param {Object} enumObj - Enum object
 * @returns {Array} Array of enum values
 */
export const enumToArray = (enumObj) => Object.values(enumObj);

/**
 * Check if value exists in enum
 * @param {Object} enumObj - Enum object
 * @param {string} value - Value to check
 * @returns {boolean} True if value exists in enum
 */
export const isValidEnum = (enumObj, value) => Object.values(enumObj).includes(value);

/**
 * Get all enum keys as array
 * @param {Object} enumObj - Enum object
 * @returns {Array} Array of enum keys
 */
export const enumKeys = (enumObj) => Object.keys(enumObj);

// ============================================
// EXPORT ALL AS OBJECT (for easy access)
// ============================================
export default {
  // Account & Auth
  AccountType,
  UserRole,
  AccountStatus,
  MetaSyncStatus,
  PermissionLevel,
  // Phone
  PhoneStatus,
  PhoneQualityRating,
  // Conversations & Messages
  ConversationStatus,
  MessageStatus,
  MessageDirection,
  AssignmentStatus,
  AssignmentMode,
  // Templates
  TemplateStatus,
  TemplateCategory,
  // Campaigns
  CampaignType,
  CampaignStatus,
  CampaignTargetType,
  CampaignTriggerType,
  // Leads
  LeadStatus,
  LeadSource,
  // Contacts
  ContactType,
  // Agents
  AgentRole,
  AgentStatus,
  AgentAvailability,
  // Payments
  PaymentStatus,
  PaymentMethod,
  PaymentType,
  SubscriptionStatus,
  // Integrations
  IntegrationType,
  WebhookStatus,
  // Tags & Rules
  TagType,
  KeywordRuleAction,
  // Utilities
  enumToArray,
  isValidEnum,
  enumKeys,
};
