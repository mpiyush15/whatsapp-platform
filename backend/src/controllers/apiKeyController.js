import ApiKey from '../models/ApiKey.js';

/**
 * API Key Management Controller
 * Handles generation, listing, and deletion of API keys for client integrations
 */

/**
 * Generate a new API key for the account
 * POST /api/integrations/api-keys/generate
 */
export const generateApiKey = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'API key name is required'
      });
    }

    // Generate new API key
    const { apiKey, keyHash, keyPrefix } = ApiKey.generateApiKey();

    // Save to database
    const newKey = await ApiKey.create({
      accountId,
      name,
      keyHash,
      keyPrefix
    });

    console.log(`✅ API Key generated for account ${accountId}:`, keyPrefix);

    // Return the key only once (never store it in plain text again)
    return res.status(201).json({
      success: true,
      message: 'API key generated successfully',
      data: {
        id: newKey._id,
        name: newKey.name,
        apiKey: apiKey, // Only return full key once
        keyPrefix: newKey.keyPrefix,
        createdAt: newKey.createdAt,
        expiresAt: newKey.expiresAt,
        warning: '⚠️ Save this API key somewhere safe. You won\'t be able to see it again.'
      }
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate API key',
      error: error.message
    });
  }
};

/**
 * List all API keys for the account
 * GET /api/integrations/api-keys
 */
export const listApiKeys = async (req, res) => {
  try {
    const accountId = req.account.accountId;

    const keys = await ApiKey.find({ accountId })
      .select('-keyHash') // Don't return the hash
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: keys.map(key => ({
        id: key._id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        isActive: !key.expiresAt || new Date(key.expiresAt) > new Date()
      }))
    });
  } catch (error) {
    console.error('Error listing API keys:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list API keys',
      error: error.message
    });
  }
};

/**
 * Delete an API key
 * DELETE /api/integrations/api-keys/:keyId
 */
export const deleteApiKey = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { keyId } = req.params;

    const key = await ApiKey.findOne({
      _id: keyId,
      accountId
    });

    if (!key) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    await ApiKey.deleteOne({ _id: keyId });

    console.log(`✅ API Key deleted for account ${accountId}:`, key.keyPrefix);

    return res.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete API key',
      error: error.message
    });
  }
};

/**
 * Revoke an API key (set expiration to now)
 * POST /api/integrations/api-keys/:keyId/revoke
 */
export const revokeApiKey = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { keyId } = req.params;

    const key = await ApiKey.findOne({
      _id: keyId,
      accountId
    });

    if (!key) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    // Set expiration to now
    key.expiresAt = new Date();
    await key.save();

    console.log(`✅ API Key revoked for account ${accountId}:`, key.keyPrefix);

    return res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke API key',
      error: error.message
    });
  }
};

/**
 * Update API key name
 * PATCH /api/integrations/api-keys/:keyId
 */
export const updateApiKey = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { keyId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'API key name is required'
      });
    }

    const key = await ApiKey.findOne({
      _id: keyId,
      accountId
    });

    if (!key) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    key.name = name;
    await key.save();

    return res.json({
      success: true,
      message: 'API key updated successfully',
      data: {
        id: key._id,
        name: key.name,
        keyPrefix: key.keyPrefix
      }
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update API key',
      error: error.message
    });
  }
};
