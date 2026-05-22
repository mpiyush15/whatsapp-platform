import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Account from '../models/Account.js';
import User from '../models/User.js';
import PlatformOtp from '../models/PlatformOtp.js';
import platformWhatsAppService from './platformWhatsAppService.js';
import { generateToken } from '../middlewares/jwtAuth.js';
import { JWT_SECRET } from '../config/jwt.js';
import { normalizePhone, phoneLookupVariants } from '../utils/normalizePhone.js';
import logger from '../utils/logger.js';

const OTP_TTL_MS = Number(process.env.PLATFORM_OTP_TTL_MS || 10 * 60 * 1000);
const OTP_RESEND_COOLDOWN_MS = Number(process.env.PLATFORM_OTP_RESEND_COOLDOWN_MS || 60 * 1000);
const MAX_SENDS_PER_HOUR = Number(process.env.PLATFORM_OTP_MAX_SENDS_PER_HOUR || 5);
const MAX_VERIFY_ATTEMPTS = Number(process.env.PLATFORM_OTP_MAX_VERIFY_ATTEMPTS || 5);

function generateOtpCode() {
  return String(crypto.randomInt(100000, 999999));
}

function buildPhoneVerificationToken({ phone, email, purpose }) {
  return jwt.sign(
    {
      phone: normalizePhone(phone),
      email: email ? String(email).trim().toLowerCase() : undefined,
      purpose: 'phone_verified',
      otpPurpose: purpose,
    },
    JWT_SECRET,
    { expiresIn: process.env.PLATFORM_PHONE_VERIFY_JWT_EXPIRES || '20m' }
  );
}

export function verifyPhoneVerificationToken(token, expectedPhone) {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.purpose !== 'phone_verified') {
    throw new Error('Invalid verification token');
  }
  const phone = normalizePhone(expectedPhone);
  if (normalizePhone(decoded.phone) !== phone) {
    throw new Error('Phone verification mismatch');
  }
  return decoded;
}

async function findAccountByPhone(phone) {
  const normalized = normalizePhone(phone);
  const variants = phoneLookupVariants(normalized);
  return Account.findOne({
    $or: variants.flatMap((v) => [{ phone: v }, { phone: v.replace(/^\+/, '') }]),
    status: { $ne: 'suspended' },
  }).select('+password accountId email name role type plan billingCycle status isDemoAccount demoLabel demoNote phone');
}

class PlatformOtpService {
  async sendOtp({ phone: rawPhone, purpose, email }) {
    const phone = normalizePhone(rawPhone);
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return { ok: false, error: 'Enter a valid mobile number' };
    }

    const purposeNorm = purpose === 'signup' ? 'signup' : 'login';

    if (purposeNorm === 'login') {
      const account = await findAccountByPhone(phone);
      const user =
        !account &&
        (await User.findOne({
          $or: phoneLookupVariants(phone).map((v) => ({ phone: v })),
          status: 'active',
        }).select('+password accountId email name role phone'));

      if (!account && !user) {
        return { ok: false, error: 'No account found for this WhatsApp number. Sign up first.' };
      }
    }

    if (purposeNorm === 'signup') {
      const existing = await findAccountByPhone(phone);
      if (existing) {
        return { ok: false, error: 'This number is already registered. Please log in.' };
      }
      if (email) {
        const emailTaken = await Account.findOne({ email: email.trim().toLowerCase() });
        if (emailTaken) {
          return { ok: false, error: 'Email already registered' };
        }
      }
    }

    const cfg = platformWhatsAppService.getConfig();
    if (!cfg.isConfigured) {
      return {
        ok: false,
        error: 'WhatsApp OTP is not configured yet. Contact support or use email login.',
      };
    }

    let record = await PlatformOtp.findOne({ phone, purpose: purposeNorm });
    const now = Date.now();

    if (record) {
      if (record.lastSentAt && now - record.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil(
          (OTP_RESEND_COOLDOWN_MS - (now - record.lastSentAt.getTime())) / 1000
        );
        return { ok: false, error: `Please wait ${waitSec}s before requesting another code` };
      }
      if (record.sendCount >= MAX_SENDS_PER_HOUR && now - record.createdAt.getTime() < 3600000) {
        return { ok: false, error: 'Too many OTP requests. Try again later.' };
      }
    }

    const code = generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(now + OTP_TTL_MS);

    if (record) {
      record.codeHash = codeHash;
      record.expiresAt = expiresAt;
      record.attempts = 0;
      record.verifiedAt = null;
      record.email = email ? email.trim().toLowerCase() : record.email;
      record.sendCount = (record.sendCount || 0) + 1;
      record.lastSentAt = new Date();
      await record.save();
    } else {
      record = await PlatformOtp.create({
        phone,
        purpose: purposeNorm,
        codeHash,
        email: email ? email.trim().toLowerCase() : null,
        expiresAt,
        sendCount: 1,
        lastSentAt: new Date(),
      });
    }

    const sendResult =
      purposeNorm === 'signup'
        ? await platformWhatsAppService.sendSignupOtp(phone, code)
        : await platformWhatsAppService.sendLoginOtp(phone, code);

    if (!sendResult.success && !sendResult.skipped) {
      logger.error('Platform OTP WhatsApp send failed', sendResult);
      return {
        ok: false,
        error: sendResult.error || 'Failed to send OTP on WhatsApp. Try again shortly.',
      };
    }

    if (sendResult.skipped) {
      return { ok: false, error: 'Platform WhatsApp is not configured' };
    }

    logger.info('Platform OTP sent', { phone: phone.slice(-4), purpose: purposeNorm });

    return {
      ok: true,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      maskedPhone: phone.replace(/\d(?=\d{4})/g, '•'),
    };
  }

  async verifyOtp({ phone: rawPhone, code, purpose }) {
    const phone = normalizePhone(rawPhone);
    const purposeNorm = purpose === 'signup' ? 'signup' : 'login';

    if (!code || String(code).trim().length < 4) {
      return { ok: false, error: 'Enter the verification code' };
    }

    const record = await PlatformOtp.findOne({ phone, purpose: purposeNorm });
    if (!record) {
      return { ok: false, error: 'No OTP found. Request a new code.' };
    }

    if (record.expiresAt < new Date()) {
      return { ok: false, error: 'Code expired. Request a new one.' };
    }

    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      return { ok: false, error: 'Too many attempts. Request a new code.' };
    }

    const valid = await bcrypt.compare(String(code).trim(), record.codeHash);
    record.attempts += 1;

    if (!valid) {
      await record.save();
      return { ok: false, error: 'Invalid code. Try again.' };
    }

    record.verifiedAt = new Date();
    await record.save();

    if (purposeNorm === 'signup') {
      const phoneVerificationToken = buildPhoneVerificationToken({
        phone,
        email: record.email,
        purpose: 'signup',
      });
      return {
        ok: true,
        purpose: 'signup',
        phoneVerificationToken,
        phone,
      };
    }

    let account = await findAccountByPhone(phone);
    let user = null;

    if (!account) {
      user = await User.findOne({
        $or: phoneLookupVariants(phone).map((v) => ({ phone: v })),
        status: 'active',
      }).select('+password accountId email name role phone');
    }

    if (!account && !user) {
      return { ok: false, error: 'Account not found for this number' };
    }

    const authEntity = account || user;
    let tokenType = account?.type || 'client';

    if (!account && user) {
      const orgAccount = await Account.findOne({ accountId: user.accountId });
      tokenType = orgAccount?.type === 'client' ? 'client' : 'internal';
    }

    if (account && !['active', 'pending'].includes(account.status)) {
      return {
        ok: false,
        error: 'Account is not active. Complete payment or contact support.',
        status: account.status,
      };
    }

    const tokenUser = {
      email: authEntity.email,
      accountId: authEntity.accountId || authEntity._id.toString(),
      name: authEntity.name,
      role: authEntity.role || 'user',
      type: tokenType,
      workspaceId: authEntity.accountId || authEntity._id.toString(),
      isDemoAccount: authEntity.isDemoAccount || false,
      demoLabel: authEntity.demoLabel || null,
      demoNote: authEntity.demoNote || null,
    };

    const token = generateToken(tokenUser);

    return {
      ok: true,
      purpose: 'login',
      token,
      user: tokenUser,
    };
  }
}

export default new PlatformOtpService();
