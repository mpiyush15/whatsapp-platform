/**
 * API Key Authentication Middleware (External Integrations)
 * ✅ AUTH TYPE: API Key (wpk_live_ prefix)
 * ❌ NOT for: JWT, webhooks, dashboard
 * 
 * Used by: /api/external/* routes for third-party integrations
 * Verifies API key and looks up account from API key
 */

import Account from '../models/Account.js';
import ApiKey from '../models/ApiKey.js';
import Project from '../models/Project.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
export const requireApiKey = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let apiKey = null;

    // Extract API key from Authorization header
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7); // Remove "Bearer "
      } else {
        apiKey = authHeader; // Direct token
      }
    }

    // Also check x-api-key header
    if (!apiKey && req.headers['x-api-key']) {
      apiKey = req.headers['x-api-key'];
    }

    logger.info('🔑 API Key Check:');
    logger.info('  Path:', req.path);
    logger.info('  Method:', req.method);
    logger.info('  Auth Header:', !!authHeader ? '✅ Present' : '❌ Missing');
    logger.info('  API Key:', !!apiKey ? '✅ Present' : '❌ Missing');

    if (!apiKey) {
      logger.info('  → Rejecting: No API key provided');
      return res.status(401).json({
        success: false,
        code: 'NO_API_KEY',
        message: 'API key required. Provide: Authorization: Bearer wpk_live_... or X-API-Key: wpk_live_...'
      });
    }

    // Validate API key format (wpk_live_<key>)
    if (!apiKey.startsWith('wpk_live_')) {
      logger.info('  → Rejecting: Invalid API key format');
      return res.status(401).json({
        success: false,
        code: 'INVALID_API_KEY_FORMAT',
        message: 'Invalid API key format. Must start with: wpk_live_'
      });
    }

    // Find API key record and associated account
    const apiKeyRecord = await ApiKey.findByApiKey(apiKey);

    if (!apiKeyRecord) {
      logger.info('  → Rejecting: API key not found or inactive');
      return res.status(401).json({
        success: false,
        code: 'INVALID_API_KEY',
        message: 'Invalid or inactive API key'
      });
    }

    // Find account by accountId from API key record
    const account = await Account.findOne({ accountId: apiKeyRecord.accountId });

    if (!account || account.status !== 'active') {
      logger.info('  → Rejecting: Account not found or inactive');
      return res.status(401).json({
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: 'Associated account is inactive'
      });
    }

    // Resolve optional project scope from request
    const requestedProjectId = req.headers['x-project-id'] || req.query.projectId || req.body?.projectId || null;

    if (apiKeyRecord.projectId && requestedProjectId && String(apiKeyRecord.projectId) !== String(requestedProjectId)) {
      return res.status(403).json({
        success: false,
        code: 'PROJECT_SCOPE_MISMATCH',
        message: 'API key is scoped to a different project',
      });
    }

    const resolvedProjectId = requestedProjectId || apiKeyRecord.projectId || null;
    if (resolvedProjectId) {
      const project = await Project.findOne({ accountId: account.accountId, projectId: String(resolvedProjectId) }).select('projectId name status');
      if (!project) {
        return res.status(403).json({
          success: false,
          code: 'PROJECT_NOT_ACCESSIBLE',
          message: 'Project not found for this API key/account',
        });
      }

      req.project = {
        projectId: project.projectId,
        name: project.name,
        status: project.status,
      };
      req.projectId = project.projectId;
    }

    logger.info('  → ✅ API key verified for account:', account.accountId);

    // Update last used timestamp (async, don't wait)
    ApiKey.updateOne(
      { _id: apiKeyRecord._id },
      { lastUsedAt: new Date() }
    ).catch(err => logger.error('Error updating API key lastUsedAt:', err));

    // Inject account info into request (STANDARDIZED FORMAT)
    req.accountId = account.accountId;
    req.account = {
      id: account._id,
      accountId: account.accountId,
      name: account.name,
      email: account.email,
      type: account.type,
      plan: account.plan,
      status: account.status,
      _id: account._id
    };
    req.user = {
      _id: account._id,
      id: account._id,
      accountId: account.accountId,
      role: account.role || 'admin',
      type: account.type || 'client',
      projectId: req.projectId || null,
    };
    req.authType = 'apiKey';
    req.apiKeyId = apiKeyRecord._id; // Track which API key was used
    req.apiKeyRecord = apiKeyRecord;

    next();
  } catch (error) {
    logger.error('❌ API key authentication error:', error);
    res.status(500).json({
      success: false,
      code: 'API_KEY_AUTH_ERROR',
      message: 'API key authentication failed'
    });
  }
};

export const requireApiScope = (requiredScope) => {
  return (req, res, next) => {
    const record = req.apiKeyRecord;
    if (!record) {
      return res.status(401).json({ success: false, code: 'NO_API_KEY_CONTEXT', message: 'API key context missing' });
    }

    const scopes = Array.isArray(record.scopes) ? record.scopes : [];
    const allowed = scopes.includes('*') || scopes.includes('all') || scopes.includes(requiredScope);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        code: 'INSUFFICIENT_SCOPE',
        message: `API key missing required scope: ${requiredScope}`,
      });
    }

    return next();
  };
};

export default requireApiKey;
