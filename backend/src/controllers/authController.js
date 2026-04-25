import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateToken } from '../middlewares/jwtAuth.js';
import Account from '../models/Account.js';
import User from '../models/User.js';
import PricingPlan from '../models/PricingPlan.js';
import { emailService } from '../services/emailService.js';
import logger from '../utils/logger.js';
import { sendSuccess, sendValidationError, sendConflict, sendUnauthorized } from '../utils/responseHandler.js';
import { handleControllerError } from '../utils/errorHandler.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    logger.info('🔐 Login attempt:', email);
    
    if (!email || !password) {
      return sendValidationError(res, 'Email and password required');
    }
    
    // IMPORTANT: Include password in select() even though it's sensitive
    // We need it for bcrypt.compare()
    let account = await Account.findOne({ email }).select('+password');
    logger.info('📊 Account found:', !!account);
    
    // If not in accounts collection, check users collection (for superadmin)
    let user = null;
    if (!account) {
      user = await User.findOne({ email }).select('+password');
      logger.info('📊 User (superadmin) found:', !!user);
      if (!user) {
        logger.info('❌ No account/user for email:', email);
        return sendUnauthorized(res, 'Invalid email or password');
      }
    }
    
    // Use account or user
    const authEntity = account || user;
    console.log('🔐 Password in DB?:', !!authEntity?.password);
    
    if (account && account.status !== 'active') {
      return sendUnauthorized(res, 'Account is not active');
    }
    
    // ✅ VERIFY PASSWORD WITH BCRYPT
    if (!authEntity.password) {
      logger.error('❌ No password stored for:', email);
      return sendUnauthorized(res, 'Invalid email or password');
    }
    
    const isPasswordValid = await bcrypt.compare(password, authEntity.password);
    if (!isPasswordValid) {
      logger.info('❌ Invalid password for email:', email);
      return sendUnauthorized(res, 'Invalid email or password');
    }
    
    const tokenUser = {
      email: authEntity.email,
      accountId: authEntity.accountId || authEntity._id.toString(),
      name: authEntity.name,
      role: authEntity.role || 'user',
      type: authEntity.type || (user ? 'internal' : 'client'), // Mark superadmin as internal
      workspaceId: authEntity.accountId || authEntity._id.toString(),
      isDemoAccount: authEntity.isDemoAccount || false,
      demoLabel: authEntity.demoLabel || null,
      demoNote: authEntity.demoNote || null
    };
    
    const token = generateToken(tokenUser);
    
    if (account?.isDemoAccount) {
      logger.info(`🎭 DEMO ACCOUNT LOGIN: ${account.email} (${account.accountId})`);
    }
    
    return sendSuccess(res, {
      token,
      user: tokenUser,
      isDemo: account?.isDemoAccount || false,
      demoLabel: account?.demoLabel || null
    }, 'Login successful');
  } catch (error) {
    logger.error('❌ Login error:', error.message);
    return handleControllerError(res, error, 'login');
  }
};

export const logout = async (req, res) => {
  try {
    logger.info('✅ User logged out');
    
    return sendSuccess(res, {}, 'Logged out successfully');
  } catch (error) {
    return handleControllerError(res, error, 'logout');
  }
};

export const signup = async (req, res) => {
  try {
    const { name, email, password, company, phone, selectedPlan, billingCycle } = req.body;

    if (!name || !email || !password) {
      return sendValidationError(res, 'Name, email, and password are required');
    }

    if (!selectedPlan || selectedPlan.trim() === '') {
      return sendValidationError(res, 'Please select a plan');
    }

    const validCycles = ['monthly', 'quarterly', 'annual'];
    const cycle = (billingCycle || 'monthly').toLowerCase();
    if (!validCycles.includes(cycle)) {
      return sendValidationError(res, 'Invalid billing cycle. Choose: monthly, quarterly, annual');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendValidationError(res, 'Please provide a valid email address');
    }

    if (password.length < 6) {
      return sendValidationError(res, 'Password must be at least 6 characters');
    }

    const existingAccount = await Account.findOne({ email });
    if (existingAccount) {
      return sendConflict(res, 'Email already registered. Please login instead.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate accountId: YYMMDD + sequential number
    // Format: 26041801 (April 18, 2026, Client #01)
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const sequential = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
    const accountId = `${yy}${mm}${dd}${sequential}`;
    
    let planName = selectedPlan.toLowerCase();
    
    try {
      let pricingPlan = await PricingPlan.findOne({ 
        planId: selectedPlan,
        isActive: true 
      });
      
      if (!pricingPlan) {
        pricingPlan = await PricingPlan.findOne({
          name: { $regex: selectedPlan, $options: 'i' },
          isActive: true
        });
      }
      
      if (pricingPlan) {
        planName = pricingPlan.name.toLowerCase();
        logger.info(`✅ Plan resolved: "${pricingPlan.name}" → "${planName}"`);
      } else {
        logger.info(`⚠️ Plan "${selectedPlan}" not found. Using fallback: "${planName}"`);
      }
    } catch (err) {
      logger.error(`❌ Error querying PricingPlan:`, err.message);
    }

    const newAccount = new Account({
      accountId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      company: company?.trim() || undefined,
      phone: phone?.trim() || undefined,
      type: 'client',
      role: 'admin',
      plan: planName,
      billingCycle: cycle,
      status: 'pending'
    });

    let subdomain = '';
    try {
      if (company && company.trim()) {
        subdomain = company
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      } else if (name && name.trim()) {
        const firstName = name.trim().split(' ')[0];
        subdomain = firstName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      } else {
        subdomain = email
          .split('@')[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      }
      
      if (subdomain.length < 3) {
        subdomain = `user-${accountId.substring(0, 8)}`.toLowerCase();
      }
      
      let originalSubdomain = subdomain;
      let counter = 1;
      let existingSubdomain = await Account.findOne({ subdomain });
      
      while (existingSubdomain) {
        subdomain = `${originalSubdomain}-${counter}`;
        existingSubdomain = await Account.findOne({ subdomain });
        counter++;
      }
      
      newAccount.subdomain = subdomain;
      logger.info(`✅ Generated subdomain: ${subdomain}`);
    } catch (err) {
      logger.error('⚠️ Error generating subdomain:', err.message);
    }

    await newAccount.save();

    logger.info('✅ New account created (PENDING):', {
      accountId,
      email,
      name,
      subdomain,
      plan: planName,
      cycle
    });

    try {
      const paymentLink = `${process.env.FRONTEND_URL || 'https://app.pixelswhatsapp.com'}/checkout?plan=${planName.toLowerCase()}`;
      
      let planAmount = 0;
      try {
        const pricingPlan = await PricingPlan.findOne({
          name: { $regex: planName, $options: 'i' },
          isActive: true
        });
        
        if (pricingPlan) {
          const monthlyPrice = pricingPlan.monthlyPrice || 0;
          
          if (cycle === 'monthly') {
            planAmount = monthlyPrice;
          } else if (cycle === 'quarterly') {
            planAmount = Math.round(monthlyPrice * 3 * 0.95);
          } else if (cycle === 'annual') {
            planAmount = Math.round(monthlyPrice * 12 * 0.85);
          }
        }
      } catch (priceErr) {
        logger.error('⚠️ Error calculating price:', priceErr.message);
      }

      if (planAmount > 0) {
        await emailService.sendPendingPaymentEmail(
          email,
          name,
          planName,
          planAmount,
          cycle,
          paymentLink
        ).catch(err => logger.error('⚠️ Failed to send email:', err.message));
      }
    } catch (emailErr) {
      logger.error('⚠️ Email error:', emailErr.message);
    }

    const user = {
      accountId,
      email: newAccount.email,
      name: newAccount.name,
      role: 'admin',
      status: 'pending',
      workspaceId: newAccount._id.toString()
    };

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      token,
      user,
      selectedPlan: selectedPlan.toLowerCase(),
      redirectTo: `/checkout?plan=${selectedPlan.toLowerCase()}`
    });
  } catch (error) {
    logger.error('❌ Signup error:', error);
    return handleControllerError(res, error, 'signup');
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return sendUnauthorized(res, 'Not authenticated');
    }
    
    return sendSuccess(res, {
      user: req.user
    }, 'Current user retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getCurrentUser');
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const email = req.body?.email?.toLowerCase()?.trim();

    if (!email) {
      return sendValidationError(res, 'Email is required');
    }

    const genericMessage = 'If an account exists with this email, a password reset link has been sent.';

    let authEntity = await Account.findOne({ email }).select('+password');
    let entityType = 'account';

    if (!authEntity) {
      authEntity = await User.findOne({ email }).select('+password');
      entityType = 'user';
    }

    if (!authEntity) {
      logger.info('🔐 Forgot password requested for unknown email:', email);
      return sendSuccess(res, {}, genericMessage);
    }

    if (!authEntity.password) {
      logger.info('🔐 Forgot password requested for password-less account:', email);
      return sendSuccess(res, {}, genericMessage);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    authEntity.resetPasswordToken = resetPasswordToken;
    authEntity.resetPasswordExpires = resetPasswordExpires;
    await authEntity.save();

    const emailResult = await emailService.sendPasswordResetEmail(email, resetToken);
    if (!emailResult?.success) {
      logger.error('❌ Failed to send reset email:', emailResult?.error || 'Unknown error');
    }

    logger.info(`✅ Password reset initiated for ${entityType}: ${email}`);
    return sendSuccess(res, {}, genericMessage);
  } catch (error) {
    logger.error('❌ Forgot password error:', error.message);
    return handleControllerError(res, error, 'forgotPassword');
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return sendValidationError(res, 'Token and new password are required');
    }

    if (password.length < 6) {
      return sendValidationError(res, 'Password must be at least 6 characters');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    let authEntity = await Account.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    }).select('+password');

    let entityType = 'account';

    if (!authEntity) {
      authEntity = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() }
      }).select('+password');
      entityType = 'user';
    }

    if (!authEntity) {
      return sendValidationError(res, 'Reset link is invalid or expired');
    }

    authEntity.password = await bcrypt.hash(password, 10);
    authEntity.resetPasswordToken = null;
    authEntity.resetPasswordExpires = null;
    await authEntity.save();

    logger.info(`✅ Password reset completed for ${entityType}: ${authEntity.email}`);
    return sendSuccess(res, {}, 'Password reset successful. Please login with your new password.');
  } catch (error) {
    logger.error('❌ Reset password error:', error.message);
    return handleControllerError(res, error, 'resetPassword');
  }
};

export default {
  login,
  signup,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword
};
