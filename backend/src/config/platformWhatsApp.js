/**
 * Replysys platform WABA — sends OTP, billing, and system messages from one internal account.
 * Set PLATFORM_AUTH_ACCOUNT_ID (e.g. 26042058) and PLATFORM_OTP_PHONE_NUMBER_ID in production.
 */

export const PLATFORM_TEMPLATE_KEYS = {
  LOGIN_OTP: 'loginOtp',
  SIGNUP_OTP: 'signupOtp',
  WELCOME: 'welcome',
  PAYMENT_REMINDER: 'paymentReminder',
  LOW_CREDIT: 'lowCredit',
  RENEWAL_REMINDER: 'renewalReminder',
};

export function getPlatformWhatsAppConfig() {
  const accountId = (process.env.PLATFORM_AUTH_ACCOUNT_ID || '26042058').trim();
  const phoneNumberId = (
    process.env.PLATFORM_OTP_PHONE_NUMBER_ID ||
    process.env.BILLING_ONBOARDING_PHONE_NUMBER_ID ||
    ''
  ).trim();

  const templates = {
    [PLATFORM_TEMPLATE_KEYS.LOGIN_OTP]:
      process.env.PLATFORM_OTP_TEMPLATE_LOGIN || 'replysys_login_otp',
    [PLATFORM_TEMPLATE_KEYS.SIGNUP_OTP]:
      process.env.PLATFORM_OTP_TEMPLATE_SIGNUP ||
      process.env.PLATFORM_OTP_TEMPLATE_LOGIN ||
      'replysys_login_otp',
    [PLATFORM_TEMPLATE_KEYS.WELCOME]:
      process.env.BILLING_ONBOARDING_TEMPLATE_NAME || 'replysys_welcome',
    [PLATFORM_TEMPLATE_KEYS.PAYMENT_REMINDER]:
      process.env.PLATFORM_PAYMENT_REMINDER_TEMPLATE || 'replysys_payment_reminder',
    [PLATFORM_TEMPLATE_KEYS.LOW_CREDIT]:
      process.env.PLATFORM_LOW_CREDIT_TEMPLATE || 'replysys_low_credit',
    [PLATFORM_TEMPLATE_KEYS.RENEWAL_REMINDER]:
      process.env.PLATFORM_RENEWAL_REMINDER_TEMPLATE || 'replysys_renewal_reminder',
  };

  return {
    accountId,
    phoneNumberId,
    templates,
    isConfigured: Boolean(accountId && phoneNumberId),
  };
}

export function getSuperadminAccountEmails() {
  return (process.env.PLATFORM_SUPERADMIN_EMAILS || 'mpiyush2727@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function getPlatformClientAccountEmail() {
  return (process.env.PLATFORM_WABA_ACCOUNT_EMAIL || 'pixelsadvertise@gmail.com')
    .trim()
    .toLowerCase();
}
