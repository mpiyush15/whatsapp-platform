/**
 * SINGLE SOURCE OF TRUTH
 * All constants, enums, and API endpoints in one place
 */

// WhatsApp Flow
export const WHATSAPP_FLOW = {
  TYPE: 'EMBEDDED_SIGNUP', // Not OAuth code exchange
  EVENT: 'FINISH',
  API_VERSION: 'v18.0'
};

// Account Fields
export const ACCOUNT_FIELDS = {
  accountId: 'accountId',
  email: 'email',
  plan: 'plan', // free, starter, pro, enterprise
  status: 'status', // active, inactive, suspended
  wabaId: 'wabaId', // WhatsApp Business Account ID
  whatsappAccessToken: 'whatsappAccessToken', // Will be META_SYSTEM_TOKEN for all accounts
  whatsappConfig: 'whatsappConfig' // Metadata
};

// Phone Number Fields
export const PHONE_FIELDS = {
  accountId: 'accountId',
  phoneNumberId: 'phoneNumberId', // From Meta Graph API
  displayPhone: 'displayPhone', // E.g. +91976650856
  displayName: 'displayName', // E.g. Replysys
  qualityRating: 'qualityRating', // UNKNOWN, GREEN, YELLOW, RED
  verificationStatus: 'verificationStatus', // VERIFIED, NOT_VERIFIED
  isActive: 'isActive',
  connectedAt: 'connectedAt'
};

// Subscription Fields
export const SUBSCRIPTION_FIELDS = {
  accountId: 'accountId',
  planName: 'planName',
  billingCycle: 'billingCycle', // monthly, yearly
  status: 'status', // active, inactive, cancelled
  startDate: 'startDate',
  endDate: 'endDate'
};

// Payment Status Enum
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed'
};

// API Endpoints
export const API_ENDPOINTS = {
  WHATSAPP_CONNECT: '/integrations/whatsapp/connect',
  WHATSAPP_DISCONNECT: '/integrations/whatsapp/disconnect',
  WHATSAPP_PHONES: '/integrations/whatsapp/phones'
};

// Meta Graph API
export const META_API = {
  BASE_URL: 'https://graph.facebook.com',
  VERSION: 'v18.0',
  ENDPOINTS: {
    PHONE_NUMBERS: (wabaId) => `/v18.0/${wabaId}/phone_numbers`,
    PHONE_DETAILS: (phoneNumberId) => `/v18.0/${phoneNumberId}`,
    MESSAGE_TEMPLATES: (phoneNumberId) => `/v18.0/${phoneNumberId}/message_templates`
  }
};

// Frontend Messages
export const MESSAGES = {
  PHONE_CONNECTED: 'WhatsApp number connected successfully!',
  PHONE_DISCONNECTED: 'WhatsApp number disconnected',
  CONNECTION_FAILED: 'Failed to connect WhatsApp number',
  NO_PHONE: 'No WhatsApp number connected',
  CONNECTING: 'Connecting...'
};

// Error Messages
export const ERRORS = {
  NO_WABA_ID: 'WABA ID required',
  NO_PHONE_ID: 'Phone Number ID required',
  NO_ACCOUNT: 'Account not found',
  PHONE_FETCH_FAILED: 'Failed to fetch phone details from Meta',
  PHONE_SAVE_FAILED: 'Failed to save phone number to database'
};

// ============================================
// LIVE CHAT CONSTANTS
// ============================================

// Conversation Status
export const CONVERSATION_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed'
};

// Message Type
export const MESSAGE_TYPE = {
  TEXT: 'text',
  MEDIA: 'media',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  TEMPLATE: 'template',
  INTERACTIVE: 'interactive'
};

// Message Status
export const MESSAGE_STATUS = {
  QUEUED: 'queued',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

// Message Direction
export const MESSAGE_DIRECTION = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound'
};

// Agent Status
export const AGENT_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BUSY: 'busy',
  AWAY: 'away',
  ON_BREAK: 'on_break'
};

// Agent Role
export const AGENT_ROLE = {
  AGENT: 'agent',
  SUPERVISOR: 'supervisor',
  MANAGER: 'manager'
};

// Conversation Priority
export const CONVERSATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Conversation Type
export const CONVERSATION_TYPE = {
  CUSTOMER: 'customer',
  SUPPORT: 'support',
  SALES: 'sales',
  FEEDBACK: 'feedback'
};

// Media Type
export const MEDIA_TYPE = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document'
};

// Live Chat API Endpoints
export const LIVE_CHAT_ENDPOINTS = {
  GET_CONVERSATIONS: '/integrations/whatsapp/conversations',
  GET_CONVERSATION: '/integrations/whatsapp/conversations/:conversationId',
  GET_MESSAGES: '/integrations/whatsapp/conversations/:conversationId/messages',
  SEND_MESSAGE: '/integrations/whatsapp/conversations/:conversationId/send',
  ASSIGN_CONVERSATION: '/integrations/whatsapp/conversations/:conversationId/assign',
  RESOLVE_CONVERSATION: '/integrations/whatsapp/conversations/:conversationId/resolve',
  TAG_CONVERSATION: '/integrations/whatsapp/conversations/:conversationId/tag',
  GET_AGENTS: '/integrations/whatsapp/agents',
  GET_AGENT_STATUS: '/integrations/whatsapp/agents/:agentId/status'
};

// Socket.io Events
export const SOCKET_EVENTS = {
  // Agent -> Server
  SEND_MESSAGE: 'send_message',
  MARK_READ: 'mark_read',
  START_TYPING: 'start_typing',
  STOP_TYPING: 'stop_typing',
  ASSIGN_CONVERSATION: 'assign_conversation',
  RESOLVE_CONVERSATION: 'resolve_conversation',
  UPDATE_AGENT_STATUS: 'update_agent_status',
  
  // Server -> Agent
  NEW_MESSAGE: 'new_message',
  MESSAGE_DELIVERED: 'message_delivered',
  MESSAGE_READ: 'message_read',
  CONVERSATION_UPDATED: 'conversation_updated',
  CUSTOMER_TYPING: 'customer_typing',
  AGENT_ASSIGNED: 'agent_assigned',
  CONVERSATION_RESOLVED: 'conversation_resolved',
  AGENT_STATUS_CHANGED: 'agent_status_changed'
};

export default {
  WHATSAPP_FLOW,
  ACCOUNT_FIELDS,
  PHONE_FIELDS,
  SUBSCRIPTION_FIELDS,
  PAYMENT_STATUS,
  API_ENDPOINTS,
  META_API,
  MESSAGES,
  ERRORS,
  CONVERSATION_STATUS,
  MESSAGE_TYPE,
  MESSAGE_STATUS,
  MESSAGE_DIRECTION,
  AGENT_STATUS,
  AGENT_ROLE,
  CONVERSATION_PRIORITY,
  CONVERSATION_TYPE,
  MEDIA_TYPE,
  LIVE_CHAT_ENDPOINTS,
  SOCKET_EVENTS
};
