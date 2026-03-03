import Subscription from '../models/Subscription.js';
import Account from '../models/Account.js';

/**
 * Middleware to require active subscription/payment
 * Blocks dashboard access if user hasn't completed payment
 * EXCEPT: Superadmins (type='internal') can always access
 */
export const requireSubscription = async (req, res, next) => {
  try {
    const accountId = req.accountId; // From JWT middleware (STRING like 'pixels_internal')
    
    if (!accountId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        redirectTo: '/login'
      });
    }

    // Find account
    const account = await Account.findOne({ accountId });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
        redirectTo: '/login'
      });
    }

    // ALLOW: Superadmins (internal accounts) skip subscription check
    if (account.type === 'internal') {
      return next();
    }

    // Check if account has active subscription
    const subscription = await Subscription.findOne({
      accountId: account.accountId,  // Use Account.accountId (string)
      status: 'active'
    });

    if (!subscription) {
      console.log(`⚠️ User ${accountId} blocked - no active subscription`);
      return res.status(403).json({
        success: false,
        message: 'Active subscription required. Please complete payment.',
        redirectTo: '/checkout'
      });
    }

    // User has active subscription, continue
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during subscription verification'
    });
  }
};

export default requireSubscription;
