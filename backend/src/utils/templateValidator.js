/**
 * Utility for validating WhatsApp Message Templates against Meta's strict rules
 * before submission to the Graph API.
 */

export function validateTemplateMetaRules(template) {
  const errors = [];

  const {
    name,
    category,
    content,
    components = [],
    headerText
  } = template;

  const isAuthentication = String(category).toLowerCase() === 'authentication';

  // 1. Name and Category validation
  if (!name || !/^[a-z0-9_]+$/.test(name)) {
    errors.push('Template name must only contain lowercase alphanumeric characters and underscores.');
  }

  const validCategories = ['utility', 'authentication', 'marketing'];
  if (!validCategories.includes(String(category).toLowerCase())) {
    errors.push('Category mismatch: Must be Marketing, Utility or Authentication.');
  }

  // Authentication templates have very strict and limited rules
  if (isAuthentication) {
    const authVars = (content || '').match(/\{\{(\d+)\}\}/g) || [];
    if (!authVars.includes('{{1}}') || authVars.length !== 1) {
      errors.push('Authentication templates must contain exactly one variable {{1}} for the OTP code.');
    }
    return errors;
  }

  // 2. Body Variables Validation
  const bodyText = content || '';
  
  // Rule: No consecutive variables (e.g., {{1}}{{2}} or {{1}} {{2}})
  const consecutiveRegex = /\{\{\d+\}\}\s*\{\{\d+\}\}/;
  if (consecutiveRegex.test(bodyText)) {
    errors.push('Variables cannot be placed consecutively (e.g. {{1}}{{2}} or {{1}} {{2}}). They must be separated by actual text.');
  }

  // Rule: Never start or end with a variable
  if (/^\{\{\d+\}\}/.test(bodyText.trim())) {
    errors.push('Templates cannot start with a variable. Always anchor it with text at the beginning.');
  }
  if (/\{\{\d+\}\}$/.test(bodyText.trim())) {
    errors.push('Templates cannot end with a variable. Always anchor it with text at the end.');
  }

  // Rule: Variable numbering must be sequential starting at 1
  const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
  const numbers = matches.map(m => parseInt(m.replace(/\D/g, ''), 10));
  
  if (numbers.length > 0) {
    const maxNum = Math.max(...numbers);
    const uniqueNums = new Set(numbers);
    // Meta requires exact sequential numbers 1, 2, 3, etc.
    if (uniqueNums.size !== maxNum) {
      errors.push(`Variable numbers must be sequential starting from 1 up to ${uniqueNums.size}. Check for gaps.`);
    }
  }

  // Rule: No more than 2 consecutive newlines
  if (/\n{3,}/.test(bodyText)) {
    errors.push('Body text cannot contain more than two consecutive newlines.');
  }

  // 3. Header Variables Validation
  if (headerText) {
    const headerVars = headerText.match(/\{\{(\d+)\}\}/g) || [];
    if (headerVars.length > 1) {
      errors.push('Text headers can only contain a maximum of one variable.');
    }
    if (headerVars.length === 1 && headerVars[0] !== '{{1}}') {
      errors.push('The variable in a text header must be exactly {{1}}.');
    }
  }

  // 4. Buttons Validation
  const buttonComp = components.find(c => c.type === 'BUTTONS');
  if (buttonComp && buttonComp.buttons) {
    buttonComp.buttons.forEach((btn) => {
      if (btn.type === 'URL') {
        const urlStr = btn.url || '';
        const urlVars = urlStr.match(/\{\{(\d+)\}\}/g) || [];
        
        if (urlVars.length > 1) {
          errors.push(`URL button "${btn.text}" cannot contain more than one variable.`);
        }
        
        if (urlVars.length === 1) {
          if (!urlStr.endsWith('{{1}}')) {
            errors.push(`In URL button "${btn.text}", the variable {{1}} must be placed at the very end of the URL.`);
          }
        }
      }
    });
  }

  // 5. Utility vs Marketing words
  if (String(category).toLowerCase() === 'utility') {
    const promoWords = ['offer', 'discount', 'off', 'deal', 'buy now', 'sale', 'free', 'promo'];
    const lowerBody = bodyText.toLowerCase();
    // Use word boundaries to avoid matching "coffee" with "off" or "freedom" with "free"
    const found = promoWords.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(bodyText));
    if (found.length > 0) {
      errors.push(`UTILITY template contains promotional words (${found.join(', ')}). This will be flagged to MARKETING and go to 24h review. Change category to MARKETING or remove those words.`);
    }
  }

  // 6. Body too short
  if (bodyText.replace(/\{\{\d+\}\}/g, '').trim().length < 10) {
    errors.push('Body text is too short. Add more context about why user is receiving this message.');
  }

  return errors;
}
