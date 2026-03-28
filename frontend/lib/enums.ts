/**
 * Centralized Enum Definitions
 * ⚠️ IMPORTANT: These enums are SYNCED with backend/src/constants/enums.js
 * Single source of truth: Backend API @ /api/enums/all
 * 
 * For runtime access, use:
 *   - useEnums() hook in React components
 *   - fetchEnumsFromBackend() in services
 * 
 * For TypeScript types, use these exports
 */

// Re-export enum service for frontend integration
export { fetchEnumsFromBackend, fetchEnumByName, validateEnumValue, getCachedEnums, clearEnumsCache } from '@/lib/enumsService';

/**
 * User Roles
 * Maps to backend Account.role enum
 * Used for RBAC and feature access control
 * Source: backend/src/constants/enums.js → UserRole
 */
export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  AGENT = 'agent',
  USER = 'user'
}

/**
 * Account Type
 * Maps to backend Account.type enum
 * Differentiates account ownership and usage
 */
export enum AccountType {
  INTERNAL = 'internal',      // ReplySystem internal account
  CLIENT = 'client',          // Customer account
  AGENCY = 'agency'           // Agency/partner account
}

/**
 * Conversation Status
 * Maps to backend Conversation.status enum
 * Tracks conversation lifecycle
 */
export enum ConversationStatus {
  OPEN = 'open',
  CLOSED = 'closed'
}

/**
 * Message Status
 * Maps to backend Message.status enum
 * Tracks message delivery status
 */
export enum MessageStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

/**
 * Message Direction
 * Maps to backend Message.direction enum
 * Indicates if message is inbound or outbound
 */
export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

/**
 * Message Type
 * Maps to backend Message.messageType enum
 * Defines all supported WhatsApp message types (12 types total)
 */
export enum MessageType {
  TEXT = 'text',
  TEMPLATE = 'template',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  VOICE = 'voice',
  DOCUMENT = 'document',
  LOCATION = 'location',
  STICKER = 'sticker',
  INTERACTIVE = 'interactive',
  BUTTON = 'button',
  REACTION = 'reaction'
}

/**
 * Template Category
 * Maps to backend Template.category enum
 * Aligns with Meta API template categories
 */
export enum TemplateCategory {
  MARKETING = 'marketing',
  UTILITY = 'utility',
  AUTHENTICATION = 'authentication'
}

/**
 * Template Status
 * Maps to backend Template.status enum
 * Tracks template approval workflow
 */
export enum TemplateStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

/**
 * Template Media Type
 * Maps to backend Template.mediaType enum
 */
export enum TemplateMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document'
}

/**
 * Campaign Type
 * Maps to backend Campaign.type enum
 */
export enum CampaignType {
  BROADCAST = 'broadcast',
  DRIP = 'drip',
  AUTOMATION = 'automation',
  AB_TEST = 'ab-test'
}

/**
 * Campaign Status
 * Maps to backend Campaign.status enum
 */
export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Campaign Target Type
 * Maps to backend Campaign.targetType enum
 */
export enum CampaignTargetType {
  ALL = 'all',
  SEGMENT = 'segment',
  CUSTOM = 'custom'
}

/**
 * Campaign Trigger Type
 * Maps to backend Campaign.triggerType enum
 */
export enum CampaignTriggerType {
  USER_ACTION = 'user_action',
  TAG_ADDED = 'tag_added',
  DATE_BASED = 'date_based',
  CUSTOM = 'custom'
}

/**
 * Agent Role
 * Maps to backend Agent.role enum
 */
export enum AgentRole {
  AGENT = 'agent',
  TEAM_LEAD = 'team-lead',
  SUPERVISOR = 'supervisor',
  MANAGER = 'manager'
}

/**
 * Agent Status
 * Maps to backend Agent.status enum
 */
export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on-leave',
  SUSPENDED = 'suspended'
}

/**
 * Agent Availability
 * Maps to backend Agent.availability enum
 */
export enum AgentAvailability {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline',
  AWAY = 'away'
}

/**
 * Conversation Assignment Mode
 * Maps to backend ConversationAssignment.assignmentMode enum
 */
export enum AssignmentMode {
  COMPLETED = 'completed',
  TRANSFERRED = 'transferred',
  ABANDONED = 'abandoned',
  TIMEOUT = 'timeout',
  MANUAL = 'manual'
}

/**
 * Conversation Assignment Status
 * Maps to backend ConversationAssignment.assignmentStatus enum
 */
export enum AssignmentStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  TRANSFERRED = 'transferred',
  ABANDONED = 'abandoned'
}

/**
 * Phone Quality Rating
 * Maps to backend PhoneNumber.qualityRating enum
 */
export enum PhoneQualityRating {
  GREEN = 'green',
  YELLOW = 'yellow',
  RED = 'red',
  UNKNOWN = 'unknown'
}

/**
 * Meta Sync Status
 * Maps to backend Account.metaSync.status enum
 */
export enum MetaSyncStatus {
  OAUTH_PENDING = 'oauth_pending',
  OAUTH_COMPLETED_AWAITING_WEBHOOK = 'oauth_completed_awaiting_webhook',
  FULLY_SYNCED = 'fully_synced',
  ERROR = 'error'
}

/**
 * Payment Status
 * Maps to backend Payment.status enum
 */
export enum PaymentStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  PARTIAL = 'partial',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

/**
 * Payment Method
 * Maps to backend Payment.method enum
 */
export enum PaymentMethod {
  STRIPE = 'stripe',
  RAZORPAY = 'razorpay',
  PAYPAL = 'paypal',
  CASHFREE = 'cashfree',
  MANUAL_TRANSFER = 'manual_transfer'
}

/**
 * Payment Type
 * Maps to backend Payment.type enum
 */
export enum PaymentType {
  CARD = 'card',
  UPI = 'upi',
  BANK_TRANSFER = 'bank_transfer',
  WALLET = 'wallet',
  MANUAL = 'manual'
}

/**
 * Contact Type
 * Maps to backend Contact.type enum
 */
export enum ContactType {
  CUSTOMER = 'customer',
  LEAD = 'lead',
  OTHER = 'other'
}

/**
 * Lead Status
 * Maps to backend Lead.status enum
 */
export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  NEGOTIATING = 'negotiating',
  CONVERTED = 'converted',
  LOST = 'lost',
  STALE = 'stale'
}

/**
 * Integration Type
 * Maps to backend ApiKey.integrationType enum
 */
export enum IntegrationType {
  ENROMATICS = 'enromatics',
  ZAPIER = 'zapier',
  MAKE = 'make',
  INTEGROMAT = 'integromat',
  CUSTOM = 'custom',
  OTHER = 'other'
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get all values of an enum
 * @param enumObject - The enum to get values from
 * @returns Array of enum values
 */
export const getEnumValues = (enumObject: Record<string, any>): string[] => {
  return Object.values(enumObject).filter((value) => typeof value === 'string');
};

/**
 * Get enum value by key
 * @param enumObject - The enum object
 * @param key - The key to look up
 * @returns The enum value or undefined
 */
export const getEnumByKey = (enumObject: Record<string, any>, key: string): string | undefined => {
  return enumObject[key];
};

/**
 * Check if value exists in enum
 * @param enumObject - The enum object
 * @param value - The value to check
 * @returns True if value exists in enum
 */
export const isValidEnumValue = (enumObject: Record<string, any>, value: string): boolean => {
  return Object.values(enumObject).includes(value);
};
