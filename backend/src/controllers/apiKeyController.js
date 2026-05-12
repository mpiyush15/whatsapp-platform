import ApiKey from '../models/ApiKey.js';
import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';

export const generateApiKey = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { name, projectId = null, scopes, rateLimitPerMinute } = req.body;

    if (!name) {
      return sendValidationError(res, 'API key name is required');
    }

    const { apiKey, keyHash, keyPrefix } = ApiKey.generateApiKey();

    const newKey = await ApiKey.create({
      accountId,
      name,
      projectId: projectId || null,
      scopes: Array.isArray(scopes) && scopes.length > 0 ? scopes : undefined,
      rateLimitPerMinute: Number(rateLimitPerMinute) > 0 ? Number(rateLimitPerMinute) : undefined,
      keyHash,
      keyPrefix
    });

    logger.info(`✅ API Key generated for account ${accountId}:`, keyPrefix);

    return res.status(201).json({
      success: true,
      data: {
        id: newKey._id,
        name: newKey.name,
        apiKey: apiKey,
        keyPrefix: newKey.keyPrefix,
        projectId: newKey.projectId,
        scopes: newKey.scopes,
        rateLimitPerMinute: newKey.rateLimitPerMinute,
        createdAt: newKey.createdAt,
        expiresAt: newKey.expiresAt,
        warning: '⚠️ Save this API key somewhere safe. You won\'t be able to see it again.'
      }
    });
  } catch (error) {
    return handleControllerError(res, error, 'generateApiKey');
  }
};

export const listApiKeys = async (req, res) => {
  try {
    const accountId = req.account.accountId;

    const keys = await ApiKey.find({ accountId })
      .select('-keyHash')
      .sort({ createdAt: -1 });

    return sendSuccess(res, {
      data: keys.map(key => ({
        id: key._id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        projectId: key.projectId,
        scopes: key.scopes,
        rateLimitPerMinute: key.rateLimitPerMinute,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        isActive: !key.expiresAt || new Date(key.expiresAt) > new Date()
      }))
    }, 'API keys retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listApiKeys');
  }
};

export const deleteApiKey = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { keyId } = req.params;

    const key = await ApiKey.findOne({
      _id: keyId,
      accountId
    });

    if (!key) {
      return sendNotFound(res, 'API key not found');
    }

    await ApiKey.deleteOne({ _id: keyId });

    logger.info(`✅ API Key deleted for account ${accountId}:`, key.keyPrefix);

    return sendSuccess(res, { id: keyId }, 'API key deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteApiKey');
  }
};

export const revokeApiKey = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { keyId } = req.params;

    const key = await ApiKey.findOne({
      _id: keyId,
      accountId
    });

    if (!key) {
      return sendNotFound(res, 'API key not found');
    }

    key.expiresAt = new Date();
    await key.save();

    logger.info(`✅ API Key revoked for account ${accountId}:`, key.keyPrefix);

    return sendSuccess(res, { id: keyId, revokedAt: key.expiresAt }, 'API key revoked');
  } catch (error) {
    return handleControllerError(res, error, 'revokeApiKey');
  }
};

export const updateApiKey = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { keyId } = req.params;
    const { name, scopes, rateLimitPerMinute, projectId } = req.body;

    const key = await ApiKey.findOne({
      _id: keyId,
      accountId
    });

    if (!key) {
      return sendNotFound(res, 'API key not found');
    }

    if (name) key.name = name;
    if (Array.isArray(scopes) && scopes.length > 0) key.scopes = scopes;
    if (Number(rateLimitPerMinute) > 0) key.rateLimitPerMinute = Number(rateLimitPerMinute);
    if (projectId !== undefined) key.projectId = projectId || null;
    await key.save();

    return sendSuccess(res, {
      data: {
        id: key._id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        projectId: key.projectId,
        scopes: key.scopes,
        rateLimitPerMinute: key.rateLimitPerMinute,
      }
    }, 'API key updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateApiKey');
  }
};

export default {
  generateApiKey,
  listApiKeys,
  deleteApiKey,
  revokeApiKey,
  updateApiKey
};
