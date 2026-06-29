import crypto from 'crypto';

/**
 * Generate a unique ID for various entities
 * @returns {string} A random ID of 12 characters
 */
export function generateId() {
  return crypto.randomBytes(8).toString('hex').slice(0, 12);
}

/**
 * Generate a prefix ID (like stripe does)
 * @param {string} prefix - The prefix (e.g., 'sub', 'pay', 'inv')
 * @returns {string} A prefixed ID (e.g., 'sub_abc123def456')
 */
export function generatePrefixedId(prefix) {
  return `${prefix}_${generateId()}`;
}

/**
 * Generate account ID (Universal Identifier)
 * Format: YYXXXXX (7 digits)
 * YY = last 2 digits of year (26 for 2026, 27 for 2027)
 * XXXXX = 5-digit sequential number (00001-99999)
 * @returns {string} Account ID (e.g., '2600001', '2600002', '2700001')
 */
export async function generateAccountId(AccountCounter = null) {
  try {
    // If AccountCounter model is provided, use database sequence
    if (AccountCounter) {
      const counter = await AccountCounter.findByIdAndUpdate(
        'account_id',
        { $inc: { sequence: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      
      const year = new Date().getFullYear();
      const yearSuffix = year.toString().slice(-2); // "26" for 2026, "27" for 2027
      const sequencePadded = String(counter.sequence).padStart(5, '0'); // "00001"
      return `${yearSuffix}${sequencePadded}`;
    }
    
    // Fallback: Generate random 5-digit number if no database access
    const year = new Date().getFullYear();
    const yearSuffix = year.toString().slice(-2);
    const randomSequence = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    return `${yearSuffix}${randomSequence}`;
  } catch (error) {
    console.error('Error generating account ID:', error);
    // Fallback to random
    const year = new Date().getFullYear();
    const yearSuffix = year.toString().slice(-2);
    const randomSequence = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    return `${yearSuffix}${randomSequence}`;
  }
}

/**
 * Generate invoice number
 * Format: INV-YYYY-XXXXXX
 * @returns {string} Invoice number
 */
export function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const sequence = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${year}-${sequence}`;
}

/**
 * Hash a sensitive string (like API keys)
 * @param {string} value - The value to hash
 * @returns {string} SHA256 hash
 */
export function hashSensitiveData(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a random string of specified length
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
export function generateRandomString(length = 32) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

export default {
  generateId,
  generatePrefixedId,
  generateInvoiceNumber,
  hashSensitiveData,
  generateRandomString
};
