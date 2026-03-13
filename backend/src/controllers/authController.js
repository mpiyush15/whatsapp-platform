import bcrypt from 'bcryptjs';
import { generateToken } from '../middlewares/jwtAuth.js';
import Account from '../models/Account.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import PricingPlan from '../models/PricingPlan.js';
import { emailService } from '../services/emailService.js';

/**
 * Auth Controller
 * Handles login/logout for dashboard users
 * Uses Account collection - NO hardcoded credentials
 */

/**
 * POST /api/auth/login
 * Login with email and password
 * Queries Account collection for user
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', email);
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required'
      });
    }
    
    // Query database for account by email
    const account = await Account.findOne({ email });
    console.log('📊 Account found:', !!account);
    
    if (!account) {
      console.log('❌ No account for email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    if (account.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is not active'
      });
    }
    
    // For demo: accept any password (password validation can be added later)
    // In production, use bcrypt.compare(password, account.password)
    
    const user = {
      email: account.email,
      accountId: account.accountId,
      name: account.name,
      role: account.role || 'user',
      workspaceId: account.accountId,
      isDemoAccount: account.isDemoAccount || false,
      demoLabel: account.demoLabel || null,
      demoNote: account.demoNote || null
    };
    
    const token = generateToken(user);
    
    // Log demo account login
    if (account.isDemoAccount) {
      console.log(`🎭 DEMO ACCOUNT LOGIN: ${account.email} (${account.accountId})`);
    }
    
    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user,
      isDemo: account.isDemoAccount || false,
      demoLabel: account.demoLabel || null
    });
    
  } catch (error) {
    console.error('❌ Login error:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * POST /api/auth/logout
 * Logout (JWT is stateless - just clear on client side)
 */
/**
 * POST /api/auth/logout
 * Logout user (clear token)
 */
export const logout = async (req, res) => {
  try {
    // JWT is stateless, no session to destroy
    // Client should clear localStorage token
    console.log('✅ User logged out');
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

/**
 * POST /api/auth/signup
 * Register a new user account
 */
export const signup = async (req, res) => {
  try {
    const { name, email, password, company, phone, selectedPlan, billingCycle } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Validate plan selection - accept any plan name from API
    if (!selectedPlan || selectedPlan.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please select a plan'
      });
    }

    // Validate billing cycle
    const validCycles = ['monthly', 'quarterly', 'annual'];
    const cycle = (billingCycle || 'monthly').toLowerCase();
    if (!validCycles.includes(cycle)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid billing cycle. Choose: monthly, quarterly, or annual'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if email already exists
    const existingAccount = await Account.findOne({ email });
    if (existingAccount) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered. Please login instead.'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique accountId
    const accountId = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Fetch pricing plan to get the plan name (selectedPlan might be a plan ID from API)
    // PricingPlan.name is 'Starter', 'Pro', etc. but Account model enum expects lowercase
    let planName = selectedPlan.toLowerCase(); // Default fallback
    
    try {
      // Query by planId first (exact match) - planId is like "plan_4fe55bd0ea1d"
      let pricingPlan = await PricingPlan.findOne({ 
        planId: selectedPlan,
        isActive: true 
      });
      
      // If not found by planId, try by name
      if (!pricingPlan) {
        pricingPlan = await PricingPlan.findOne({
          name: { $regex: selectedPlan, $options: 'i' },
          isActive: true
        });
      }
      
      if (pricingPlan) {
        planName = pricingPlan.name.toLowerCase(); // Convert 'Starter' → 'starter'
        console.log(`✅ Plan resolved: "${pricingPlan.name}" → "${planName}" (planId: ${pricingPlan.planId})`);
      } else {
        console.log(`⚠️ Plan "${selectedPlan}" not found in database. Using lowercase as fallback: "${planName}"`);
      }
    } catch (err) {
      console.error(`❌ Error querying PricingPlan:`, err.message);
      console.log(`   Continuing with fallback planName: "${planName}"`);
    }

    // Create new account with PENDING status (will be activated after payment)
    // Set role to 'admin' by default for account owners
    const newAccount = new Account({
      accountId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      company: company?.trim() || undefined,
      phone: phone?.trim() || undefined,
      type: 'client',
      role: 'admin', // ✅ Default role for account registrations
      plan: planName, // Use resolved plan name from database or input
      billingCycle: cycle, // Store billing cycle preference
      status: 'pending' // Account is PENDING until payment succeeds
    });

    // Generate subdomain for multi-tenancy (format: company-name or user-first-name)
    // Fallback: use accountId if no company/name available
    let subdomain = '';
    try {
      if (company && company.trim()) {
        // Convert company name to valid subdomain (lowercase, hyphens, no special chars)
        subdomain = company
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')  // Replace non-alphanumeric with hyphens
          .replace(/-+/g, '-')           // Replace multiple hyphens with single
          .replace(/^-|-$/g, '');         // Remove leading/trailing hyphens
      } else if (name && name.trim()) {
        // Use first name if company not provided
        const firstName = name.trim().split(' ')[0];
        subdomain = firstName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      } else {
        // Fallback: use first part of email (before @)
        subdomain = email
          .split('@')[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      }
      
      // Ensure subdomain is not empty and has minimum length
      if (subdomain.length < 3) {
        subdomain = `user-${accountId.substring(0, 8)}`.toLowerCase();
      }
      
      // Check if subdomain already exists - add suffix if needed
      let originalSubdomain = subdomain;
      let counter = 1;
      let existingSubdomain = await Account.findOne({ subdomain });
      
      while (existingSubdomain) {
        subdomain = `${originalSubdomain}-${counter}`;
        existingSubdomain = await Account.findOne({ subdomain });
        counter++;
      }
      
      newAccount.subdomain = subdomain;
      console.log(`✅ Generated subdomain: ${subdomain}`);
    } catch (err) {
      console.error('⚠️ Error generating subdomain:', err.message);
      // Continue without subdomain - it's not critical for login
    }

    await newAccount.save();

    console.log('✅ New account created (PENDING - awaiting payment):');
    console.log('  AccountId:', accountId);
    console.log('  Email:', email);
    console.log('  Name:', name);
    console.log('  Subdomain:', subdomain);
    console.log('  Status: PENDING (will be activated after payment)');
    console.log('  Selected Plan:', planName);
    console.log('  Billing Cycle:', cycle);

    // 📝 NOTE: Account is PENDING until payment completes
    // Invoice will be created after user completes payment for selected plan
    // Webhook will activate the account when payment succeeds

    // Send pending payment notification email
    try {
      const paymentLink = `${process.env.FRONTEND_URL || 'https://app.pixelswhatsapp.com'}/checkout?plan=${planName.toLowerCase()}`;
      
      // Calculate amount based on billing cycle with correct pricing from DB
      let planAmount = 0;
      try {
        const pricingPlan = await PricingPlan.findOne({
          name: { $regex: planName, $options: 'i' },
          isActive: true
        });
        
        if (pricingPlan) {
          const monthlyPrice = pricingPlan.monthlyPrice || 0;
          
          // Apply multipliers and discounts
          if (cycle === 'monthly') {
            planAmount = monthlyPrice * 1; // No discount
          } else if (cycle === 'quarterly') {
            planAmount = Math.round(monthlyPrice * 3 * 0.95); // 5% discount
          } else if (cycle === 'annual') {
            planAmount = Math.round(monthlyPrice * 12 * 0.85); // 15% discount
          }
          console.log(`✅ Email pricing calculated: ${planName} ${cycle} = ₹${planAmount}`);
        }
      } catch (priceErr) {
        console.error('⚠️ Error calculating email price:', priceErr.message);
      }
      if (planAmount > 0) {
        console.log('📧 Sending pending payment email to:', email);
        await emailService.sendPendingPaymentEmail(
          email,
          name,
          planName,
          planAmount,
          cycle,
          paymentLink
        ).catch(err => console.error('⚠️ Failed to send pending payment email:', err.message));

        // Send admin notification
        console.log('📧 Sending admin signup notification');
        await emailService.sendAdminSignupNotification(
          email,
          name,
          company,
          selectedPlan
        ).catch(err => console.error('⚠️ Failed to send admin notification:', err.message));
      }
    } catch (emailErr) {
      console.error('⚠️ Error in pending payment email:', emailErr.message);
      // Don't fail signup if email fails
    }

    // Create user object for token
    // Use a temporary token that only allows checkout
    // First user of new org account is automatically an admin
    const user = {
      accountId,
      email: newAccount.email,
      name: newAccount.name,
      role: 'admin', // First user is organization admin
      status: 'pending', // Mark token as pending
      workspaceId: newAccount._id.toString() // Add workspaceId for subdomain architecture
    };

    // Generate JWT token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Account created! Completing payment to activate...',
      token,
      user,
      selectedPlan: selectedPlan.toLowerCase(),
      redirectTo: `/checkout?plan=${selectedPlan.toLowerCase()}`
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create account. Please try again.'
    });
  }
};

/**
 * POST /api/auth/login
 * Login with email and password
 * Demo mode: superadmin@test.com accepts any password
 */
export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    res.json({
      success: true,
      user: req.user
    });
    
  } catch (error) {
    console.error('❌ Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user'
    });
  }
};

export default {
  login,
  signup,
  logout,
  getCurrentUser
};
