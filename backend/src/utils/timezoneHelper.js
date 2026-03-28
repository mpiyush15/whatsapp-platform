import logger from './logger.js';

/**
 * Timezone Helper Utility
 * RULE: Backend ALWAYS stores UTC. Frontend converts to user timezone.
 * This prevents timezone-related bugs and ensures consistency.
 */

/**
 * Convert user-submitted date string to UTC
 * Frontend sends dates in user's timezone, backend must convert to UTC for storage
 * @param {string|Date} dateStr - Date string (ISO format or timestamp)
 * @param {string} userTimezone - User's timezone (e.g., 'America/New_York')
 * @returns {Date} UTC Date object
 */
export const convertToUTC = (dateStr, userTimezone = 'UTC') => {
  try {
    if (!dateStr) return new Date();
    
    // If already ISO string, just parse it
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    
    // Return as-is (Date objects in JS are always UTC internally)
    // The offset handling is automatic
    return date;
  } catch (error) {
    logger.error('❌ Error converting to UTC:', error);
    return new Date();
  }
};

/**
 * Get current time in UTC (always use this instead of new Date() for consistency)
 * @returns {Date} Current UTC date
 */
export const getCurrentUTC = () => {
  return new Date(); // JS Date is always UTC internally
};

/**
 * Validate timezone string
 * @param {string} timezone - Timezone identifier (e.g., 'America/New_York')
 * @returns {boolean} Is valid IANA timezone
 */
export const isValidTimezone = (timezone) => {
  try {
    if (!timezone) return false;
    // Try to format a date with this timezone
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Format date for API response (always ISO string for consistency)
 * Frontend will convert to user timezone
 * @param {Date} date - Date object
 * @returns {string} ISO 8601 string
 */
export const formatDateForAPI = (date) => {
  if (!date) return null;
  return new Date(date).toISOString();
};

/**
 * Normalize timezone to valid IANA identifier
 * @param {string} timezone - Timezone identifier
 * @returns {string} Valid timezone or default
 */
export const normalizeTimezone = (timezone) => {
  if (isValidTimezone(timezone)) return timezone;
  return 'UTC'; // Default to UTC if invalid
};

/**
 * Get offset information for documentation (for debugging)
 * @param {string} timezone - Timezone identifier
 * @returns {object} Timezone offset info
 */
export const getTimezoneInfo = (timezone) => {
  try {
    const now = new Date();
    const utcString = now.toLocaleString('en-US', { timeZone: 'UTC' });
    const tzString = now.toLocaleString('en-US', { timeZone: timezone });
    
    const utcDate = new Date(utcString);
    const tzDate = new Date(tzString);
    const offsetMinutes = (utcDate - tzDate) / (1000 * 60);
    const offsetHours = offsetMinutes / 60;
    
    return {
      timezone,
      offsetMinutes,
      offsetHours,
      valid: true
    };
  } catch (error) {
    return {
      timezone,
      valid: false,
      error: 'Invalid timezone'
    };
  }
};

/**
 * IMPORTANT: Scheduling Guidelines for Campaigns/Broadcasts
 * 
 * When user selects a send time in their timezone:
 * 1. Frontend captures local time + user's timezone (from Account.timezone)
 * 2. Frontend converts local time to UTC for API request
 * 3. Backend stores UTC datetime in Campaign.scheduling.startDate
 * 4. When scheduled job runs (via scheduler), it compares against current UTC
 * 5. Frontend displays dates using Account.timezone for local display
 * 
 * Example:
 * - User in NY (UTC-5) sets campaign to send at "2:00 PM today"
 * - Frontend converts: 2:00 PM EST = 7:00 PM UTC
 * - Backend stores: scheduling.startDate = 2026-03-25T19:00:00.000Z
 * - Scheduler runs: if (now > scheduling.startDate) sendCampaign()
 * - Frontend displays: Shows "2:00 PM" using Intl.DateTimeFormat(en-US, {timeZone: 'America/New_York'})
 */

export default {
  convertToUTC,
  getCurrentUTC,
  isValidTimezone,
  formatDateForAPI,
  normalizeTimezone,
  getTimezoneInfo
};
