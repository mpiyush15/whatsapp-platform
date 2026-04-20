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
