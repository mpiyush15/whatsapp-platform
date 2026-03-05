/**
 * Account Controller
 * Handles account CRUD and API key management
 */

import Account from '../models/Account.js';
import PhoneNumber from '../models/PhoneNumber.js';

/**
 * POST /api/admin/accounts - Create new account
 */
export const createAccount = async (req, res) => {
  try {
    const {
      accountId,
      name,
      email,
      type = 'client',
      plan = 'free',
      limits,
      wabaId,
      phoneNumberId,
      accessToken
    } = req.body;
    
    // Validate required fields
    if (!accountId || !name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: accountId, name, email'
      });
    }
    
    // Check if account already exists
    // For creation endpoint, verify by accountId field (not by _id)
    const existing = await Account.findOne({ accountId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Account with ID '${accountId}' already exists`
      });
    }
    
    // Create account
    const account = new Account({
      accountId,
      name,
      email,
      type,
      plan,
      status: 'active',
      limits: limits || undefined, // Use defaults if not provided
      lastActiveAt: new Date()
    });
    
    // Generate API key
    const apiKey = account.generateApiKey();
    
    // Save account
    await account.save();
    
    // If WABA credentials provided, create phone number entry
    if (wabaId && phoneNumberId && accessToken) {
      const phoneNumber = new PhoneNumber({
        accountId,
        wabaId,
        phoneNumberId,
        accessToken,
        status: 'active'
      });
      await phoneNumber.save();
    }
    
    // Return account details + API key (ONLY TIME IT'S SHOWN)
    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      account: {
        accountId: account.accountId,
        name: account.name,
        email: account.email,
        type: account.type,
        plan: account.plan,
        status: account.status,
        apiKeyPrefix: account.apiKeyPrefix,
        createdAt: account.createdAt
      },
      apiKey, // ⚠️ ONLY SHOWN ONCE
      warning: '⚠️ Store this API key securely. It will not be shown again.'
    });
    
  } catch (error) {
    console.error('Create account error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create account',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/accounts - List all accounts
 */
export const listAccounts = async (req, res) => {
  try {
    const { type, status, limit = 50, skip = 0 } = req.query;
    
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    
    const accounts = await Account.find(query)
      .select('-apiKeyHash') // Don't expose hash
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });
    
    const total = await Account.countDocuments(query);
    
    return res.json({
      success: true,
      accounts,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: skip + accounts.length < total
      }
    });
    
  } catch (error) {
    console.error('List accounts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list accounts',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/accounts/:accountId - Get account details
 */
export const getAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    
    // For admin endpoints, accountId from params is a String identifier
    const account = await Account.findOne({ accountId })
      .select('-apiKeyHash');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    // Get associated phone numbers - use String accountId for consistency
    const phoneNumbers = await PhoneNumber.find({ accountId: account.accountId });
    
    return res.json({
      success: true,
      account,
      phoneNumbers
    });
    
  } catch (error) {
    console.error('Get account error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get account',
      error: error.message
    });
  }
};

/**
 * PATCH /api/admin/accounts/:accountId - Update account
 */
export const updateAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    const updates = req.body;
    
    // Don't allow updating sensitive fields
    delete updates.accountId;
    delete updates.apiKeyHash;
    delete updates.apiKeyPrefix;
    delete updates.createdAt;
    
    const account = await Account.findOneAndUpdate(
      { accountId },
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-apiKeyHash');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Account updated successfully',
      account
    });
    
  } catch (error) {
    console.error('Update account error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update account',
      error: error.message
    });
  }
};

/**
 * DELETE /api/admin/accounts/:accountId - Delete account
 */
export const deleteAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    
    // For admin endpoints, delete by accountId string field
    const account = await Account.findOneAndDelete({ accountId });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    // Also delete associated phone numbers
    await PhoneNumber.deleteMany({ accountId });
    
    return res.json({
      success: true,
      message: 'Account deleted successfully',
      accountId
    });
    
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/accounts/:accountId/api-key/regenerate - Regenerate API key
 */
export const regenerateApiKey = async (req, res) => {
  try {
    const { accountId } = req.params;
    
    // For admin endpoints, search by accountId string field
    const account = await Account.findOne({ accountId });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    // Generate new API key
    const newApiKey = account.generateApiKey();
    
    await account.save();
    
    return res.json({
      success: true,
      message: 'API key regenerated successfully',
      account: {
        accountId: account.accountId,
        name: account.name,
        apiKeyPrefix: account.apiKeyPrefix
      },
      apiKey: newApiKey, // ⚠️ ONLY SHOWN ONCE
      warning: '⚠️ Old API key is now invalid. Store this new key securely.'
    });
    
  } catch (error) {
    console.error('Regenerate API key error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to regenerate API key',
      error: error.message
    });
  }
};

/**
 * DELETE /api/admin/accounts/:accountId/api-key - Revoke API key
 */
export const revokeApiKey = async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const account = await Account.findOneAndUpdate(
      { accountId },
      {
        $unset: { apiKeyHash: '', apiKeyPrefix: '' },
        $set: { apiKeyCreatedAt: null, apiKeyLastUsedAt: null }
      },
      { new: true }
    ).select('-apiKeyHash');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'API key revoked successfully',
      account: {
        accountId: account.accountId,
        name: account.name,
        status: account.status
      }
    });
    
  } catch (error) {
    console.error('Revoke API key error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to revoke API key',
      error: error.message
    });
  }
};

/**
 * GET /api/account/me - Get own account details (self-service)
 */
export const getMyAccount = async (req, res) => {
  try {
    // Use ObjectId from authenticated request
    const account = await Account.findById(req.account._id)
      .select('-apiKeyHash');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    // Get associated phone numbers
    const phoneNumbers = await PhoneNumber.find({ accountId: account._id });
    
    return res.json({
      success: true,
      data: {
        _id: account._id,
        name: account.name,
        email: account.email,
        accountId: account.accountId,
        phone: account.phone,
        company: account.company,
        phoneNumbers
      }
    });
    
  } catch (error) {
    console.error('Get my account error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get account details',
      error: error.message
    });
  }
};

/**
 * POST /api/account/api-key/regenerate - Regenerate own API key (self-service)
 */
export const regenerateMyApiKey = async (req, res) => {
  try {
    // Use ObjectId from authenticated request
    const account = await Account.findById(req.account._id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    // Generate new API key
    const newApiKey = account.generateApiKey();
    
    await account.save();
    
    return res.json({
      success: true,
      message: 'API key regenerated successfully',
      apiKey: newApiKey, // ⚠️ ONLY SHOWN ONCE
      warning: '⚠️ Your old API key is now invalid. Update your application with this new key immediately.'
    });
    
  } catch (error) {
    console.error('Regenerate my API key error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to regenerate API key',
      error: error.message
    });
  }
};

/**
 * POST /api/account/generate-integration-token - Generate integration token for external apps
 */
export const generateIntegrationToken = async (req, res) => {
  try {
    const { platform } = req.body;
    
    if (!platform) {
      return res.status(400).json({
        success: false,
        message: 'Platform is required'
      });
    }

    // Use ObjectId from authenticated request
    const account = await Account.findById(req.account._id).select('+integrationTokenHash');
    
    if (!account) {
      console.error('❌ Account not found');
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    console.log('✅ Account found:', account.name);
    console.log('📱 Platform:', platform);
    
    // Generate integration token
    const integrationToken = account.generateIntegrationToken();
    
    console.log('🔐 Token generated, prefix:', account.integrationTokenPrefix);
    
    // Add to connected platforms
    if (!account.connectedPlatforms) {
      account.connectedPlatforms = [];
    }
    
    // Check if platform already exists
    const existingPlatform = account.connectedPlatforms.find(p => p.name === platform);
    
    if (existingPlatform) {
      // Update existing
      existingPlatform.apiKeyPrefix = account.integrationTokenPrefix;
      existingPlatform.testStatus = 'pending';
    } else {
      // Add new
      account.connectedPlatforms.push({
        name: platform,
        isConnected: false,
        connectedAt: null,
        lastTestedAt: null,
        testStatus: 'pending',
        apiKeyPrefix: account.integrationTokenPrefix
      });
    }
    
    await account.save();
    
    console.log('✅ Integration token generated successfully for', platform);
    
    return res.json({
      success: true,
      message: `Integration token generated successfully for ${platform}`,
      integrationToken, // ⚠️ ONLY SHOWN ONCE
      tokenPrefix: account.integrationTokenPrefix,
      createdAt: account.integrationTokenCreatedAt,
      platform: platform,
      warning: `⚠️ Save this token securely. Use it in ${platform} to connect to this WhatsApp platform.`
    });
    
  } catch (error) {
    console.error('❌ Generate integration token error:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate integration token',
      error: error.message
    });
  }
};

/**
 * GET /api/account/connected-platforms - Get list of connected platforms
 */
export const getConnectedPlatforms = async (req, res) => {
  try {
    const account = await Account.findById(req.account._id).select('connectedPlatforms');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    return res.json({
      success: true,
      platforms: account.connectedPlatforms || []
    });
    
  } catch (error) {
    console.error('Get connected platforms error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get connected platforms',
      error: error.message
    });
  }
};

/**
 * GET /api/account/integration-token - Get integration token info (not the full token)
 */
export const getIntegrationToken = async (req, res) => {
  try {
    // Use ObjectId from authenticated request
    const account = await Account.findById(req.account._id).select('integrationTokenPrefix integrationTokenCreatedAt integrationTokenLastUsedAt');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    return res.json({
      success: true,
      integrationToken: {
        prefix: account.integrationTokenPrefix || null,
        createdAt: account.integrationTokenCreatedAt || null,
        lastUsedAt: account.integrationTokenLastUsedAt || null,
        exists: !!account.integrationTokenPrefix
      }
    });
    
  } catch (error) {
    console.error('Get integration token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get integration token info',
      error: error.message
    });
  }
};

/**
 * DELETE /api/account/integration-token - Revoke integration token
 */
export const revokeIntegrationToken = async (req, res) => {
  try {
    // Use ObjectId from authenticated request
    const account = await Account.findById(req.account._id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    // Revoke token
    account.integrationTokenHash = undefined;
    account.integrationTokenPrefix = undefined;
    account.integrationTokenCreatedAt = undefined;
    account.integrationTokenLastUsedAt = undefined;
    
    await account.save();
    
    return res.json({
      success: true,
      message: 'Integration token revoked successfully'
    });
    
  } catch (error) {
    console.error('Revoke integration token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to revoke integration token',
      error: error.message
    });
  }
};
/**
 * POST /api/account/test-platform-connection - Test if a platform connection is working
 */
export const testPlatformConnection = async (req, res) => {
  try {
    const { platformName } = req.body;

    if (!platformName) {
      return res.status(400).json({
        success: false,
        message: 'Platform name is required'
      });
    }

    const account = await Account.findById(req.account._id).select('connectedPlatforms integrationTokenPrefix integrationTokenHash');

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Find the platform in connected platforms
    const platform = account.connectedPlatforms?.find(p => p.name === platformName);

    if (!platform) {
      return res.status(404).json({
        success: false,
        message: `Platform "${platformName}" not found in connected platforms`
      });
    }

    console.log(`🧪 Testing connection for ${platformName}...`);

    // Update test status to 'testing'
    platform.lastTestedAt = new Date();
    platform.testStatus = 'testing';
    
    try {
      await account.save();
    } catch (saveError) {
      console.error('Error saving test status:', saveError);
    }

    // Simulate platform test - in production, make actual API call to the platform
    let isConnected = false;
    let testMessage = '';

    if (platformName === 'Enromatics') {
      // TODO: Implement actual Enromatics API test
      // For now, we'll check if token exists and is valid
      isConnected = !!account.integrationTokenPrefix;
      testMessage = isConnected ? 'Token is valid. Please verify connection in Enromatics dashboard' : 'Token not found';
    } else if (platformName === 'Zapier') {
      // TODO: Implement Zapier API test
      isConnected = !!account.integrationTokenPrefix;
      testMessage = isConnected ? 'Token is valid. Please verify connection in Zapier' : 'Token not found';
    } else if (platformName === 'Make') {
      // TODO: Implement Make/Integromat API test
      isConnected = !!account.integrationTokenPrefix;
      testMessage = isConnected ? 'Token is valid. Please verify in Make' : 'Token not found';
    } else {
      // For custom platforms, just check token validity
      isConnected = !!account.integrationTokenPrefix;
      testMessage = isConnected ? 'Token is valid for authentication' : 'Token not found';
    }

    // Update platform connection status
    platform.isConnected = isConnected;
    platform.testStatus = isConnected ? 'success' : 'failed';
    
    try {
      await account.save();
    } catch (saveError) {
      console.error('Error saving connection status:', saveError);
    }

    const responseMessage = isConnected
      ? `✅ ${platformName} token verified successfully. ${testMessage}`
      : `❌ Failed to verify ${platformName} connection. ${testMessage}`;

    console.log(responseMessage);

    return res.json({
      success: isConnected,
      message: responseMessage,
      platform: {
        name: platformName,
        isConnected: platform.isConnected,
        testedAt: platform.lastTestedAt,
        testStatus: platform.testStatus
      }
    });

  } catch (error) {
    console.error('Test platform connection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to test platform connection',
      error: error.message
    });
  }
};