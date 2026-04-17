import bcrypt from 'bcryptjs';
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
    const account = await Account.findOne({ email }).select('+password');
    logger.info('📊 Account found:', !!account);
    console.log('🔐 Password in DB?:', !!account?.password);
    
    if (!account) {
      logger.info('❌ No account for email:', email);
      return sendUnauthorized(res, 'Invalid email or password');
    }
    
    if (account.status !== 'active') {
      return sendUnauthorized(res, 'Account is not active');
    }
    
    // ✅ VERIFY PASSWORD WITH BCRYPT
    if (!account.password) {
      logger.error('❌ No password stored for account:', email);
      return sendUnauthorized(res, 'Invalid email or password');
    }
    
    const isPasswordValid = await bcrypt.compare(password, account.password);
    if (!isPasswordValid) {
      logger.info('❌ Invalid password for email:', email);
      return sendUnauthorized(res, 'Invalid email or password');
    }
    
    const user = {
      email: account.email,
      accountId: account.accountId,
      name: account.name,
      role: account.role || 'user',
      type: account.type || 'client', // Add type field (internal, client, company)
      workspaceId: account.accountId,
      isDemoAccount: account.isDemoAccount || false,
      demoLabel: account.demoLabel || null,
      demoNote: account.demoNote || null
    };
    
    const token = generateToken(user);
    
    if (account.isDemoAccount) {
      logger.info(`🎭 DEMO ACCOUNT LOGIN: ${account.email} (${account.accountId})`);
    }
    
    return sendSuccess(res, {
      token,
      user,
      isDemo: account.isDemoAccount || false,
      demoLabel: account.demoLabel || null
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
    const accountId = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
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

export default {
  login,
  signup,
  logout,
  getCurrentUser
};
