/**
 * Centralized Logging Utility
 * Standardizes all console output with consistent emoji and formatting
 * 
 * Usage:
 *   logger.info('Message here')     // ✅ Message here
 *   logger.error('Error message')   // ❌ Error message
 *   logger.warn('Warning message')  // 🟡 Warning message
 */

const logger = {
  /**
   * Info level - Success messages
   * Format: ✅ Message
   * @param {string} message - The message to log
   * @param {any} data - Optional data to log
   */
  info: (message, data = null) => {
    if (data) {
      console.log(`✅ ${message}`, data);
    } else {
      console.log(`✅ ${message}`);
    }
  },

  /**
   * Error level - Error messages
   * Format: ❌ Message
   * @param {string} message - The message to log
   * @param {any} error - Optional error object
   */
  error: (message, error = null) => {
    if (error) {
      console.error(`❌ ${message}`, error);
    } else {
      console.error(`❌ ${message}`);
    }
  },

  /**
   * Warning level - Warning messages
   * Format: 🟡 Message
   * @param {string} message - The message to log
   * @param {any} data - Optional data to log
   */
  warn: (message, data = null) => {
    if (data) {
      console.warn(`🟡 ${message}`, data);
    } else {
      console.warn(`🟡 ${message}`);
    }
  },

  /**
   * Debug level - Debug messages
   * Format: 🔔 Message
   * @param {string} message - The message to log
   * @param {any} data - Optional data to log
   */
  debug: (message, data = null) => {
    if (process.env.DEBUG === 'true') {
      if (data) {
        console.log(`🔔 ${message}`, data);
      } else {
        console.log(`🔔 ${message}`);
      }
    }
  },

  /**
   * Success - Alias for info
   * @param {string} message - The message to log
   * @param {any} data - Optional data to log
   */
  success: (message, data = null) => {
    logger.info(message, data);
  },

  /**
   * Failure - Alias for error
   * @param {string} message - The message to log
   * @param {any} error - Optional error object
   */
  failure: (message, error = null) => {
    logger.error(message, error);
  }
};

export default logger;
