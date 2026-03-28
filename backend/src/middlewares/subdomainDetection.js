import Account from '../models/Account.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * Subdomain Detection Middleware
 * Extracts subdomain from request hostname
 * Looks up workspace (Account) by subdomain
 * Stores workspaceId in req.workspaceId for all downstream routes
 * 
 * Flow:
 * 1. client-a.whatsapp-platform.com → extract "client-a"
 * 2. Look up Account with subdomain: "client-a"
 * 3. Store Account._id as req.workspaceId
 * 4. Continue to route handler
 */

export const subdomainDetectionMiddleware = async (req, res, next) => {
  try {
    const hostname = req.hostname; // e.g., "client-a.whatsapp-platform.com"
    
    // Skip subdomain detection for backend API domains
    // Backends typically accessed at: domain.up.railway.app, localhost:5000, etc.
    const backendDomains = [
      'whatsapp-platform-production',
      'localhost',
      '127.0.0.1',
      process.env.BACKEND_DOMAIN || 'api'  // Allow configuring backend domain
    ];
    
    // Check if this is a backend API domain (skip subdomain detection)
    const isBackendDomain = backendDomains.some(domain => hostname.includes(domain));
    if (isBackendDomain) {
      req.workspaceId = null;  // No workspace context for backend API
      return next();
    }
    
    // Extract subdomain (first part before first dot)
    // "client-a.whatsapp-platform.com" → "client-a"
    // "whatsapp-platform.com" → "whatsapp-platform" (root domain, no subdomain)
    const parts = hostname.split('.');
    const subdomain = parts.length > 1 ? parts[0] : null;
    
    // If no subdomain (accessing root domain), skip workspace lookup
    if (!subdomain || subdomain === 'www' || subdomain === 'replysys') {
      req.workspaceId = null;  // No workspace context
      return next();
    }
    
    // Look up workspace by subdomain
    const workspace = await Account.findOne({ subdomain: subdomain.toLowerCase() });
    
    if (!workspace) {
      // Subdomain doesn't exist - but don't fail, let routes handle it
      req.workspaceId = null;
      req.subdomain = subdomain;
      return next();  // ✅ Continue instead of returning 404
    }
    
    // Store workspace info in request context
    req.workspaceId = workspace._id.toString();  // MongoDB ObjectId as string
    req.workspace = workspace;  // Full workspace object
    req.subdomain = subdomain;
    
    // Continue to next middleware/route
    next();
  } catch (error) {
    logger.error('Error in subdomain detection middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Workspace ID injection middleware
 * Used in routes to add workspaceId to request context if needed
 * This ensures all queries can filter by workspace
 */
export const injectWorkspaceId = (req, res, next) => {
  // workspaceId is already set by subdomainDetectionMiddleware
  // This middleware is a placeholder for consistency
  if (!req.workspaceId && req.body?.workspaceId) {
    req.workspaceId = req.body.workspaceId;
  }
  next();
};

/**
 * Workspace context middleware
 * Validates that user belongs to the current workspace (for authenticated routes)
 * Call this AFTER authentication middleware
 */
export const validateWorkspaceAccess = async (req, res, next) => {
  try {
    // If no workspace context, allow (might be root domain)
    if (!req.workspaceId) {
      return next();
    }
    
    // If user is not authenticated, skip (auth middleware will catch)
    if (!req.user) {
      return next();
    }
    
    // Check if user belongs to this workspace
    // For now, we check if user's workspace matches the subdomain's workspace
    // This will be enhanced with proper team/workspace membership table later
    
    const userWorkspace = await Account.findOne({
      _id: req.workspaceId,
      email: req.user.email  // User must belong to this workspace
    });
    
    if (!userWorkspace) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have access to this workspace'
      });
    }
    
    // Store resolved workspace in request
    req.workspace = userWorkspace;
    next();
  } catch (error) {
    logger.error('Error validating workspace access:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

export default subdomainDetectionMiddleware;
