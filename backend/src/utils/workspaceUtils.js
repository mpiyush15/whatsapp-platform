/**
 * Workspace Filtering Utility
 * Provides helper functions to filter queries by workspaceId
 * Ensures data isolation across tenants
 */

/**
 * Add workspaceId filter to any MongoDB query
 * Prevents cross-tenant data access
 * 
 * Usage:
 * const query = { status: 'active' };
 * const isolatedQuery = addWorkspaceFilter(query, req.workspaceId);
 * const messages = await Message.find(isolatedQuery);
 */
export const addWorkspaceFilter = (query = {}, workspaceId) => {
  if (!workspaceId) {
    return query;
  }
  
  return {
    ...query,
    workspaceId: workspaceId  // MongoDB will AND this with existing conditions
  };
};

/**
 * Build an aggregation pipeline stage for workspace filtering
 * Used in aggregation queries
 * 
 * Usage:
 * const pipeline = [
 *   { $match: { status: 'active' } },
 *   getWorkspaceMatchStage(req.workspaceId),
 *   { $group: { _id: '$type', count: { $sum: 1 } } }
 * ];
 */
export const getWorkspaceMatchStage = (workspaceId) => {
  if (!workspaceId) {
    return { $match: {} };
  }
  
  return {
    $match: {
      workspaceId: workspaceId
    }
  };
};

/**
 * Ensure user is accessing their own workspace
 * Call this in routes that handle user data
 * 
 * Usage:
 * if (!validateWorkspaceOwnership(req.user.workspaceId, req.workspaceId)) {
 *   return res.status(403).json({ error: 'Access denied' });
 * }
 */
export const validateWorkspaceOwnership = (userWorkspaceId, requestWorkspaceId) => {
  if (!userWorkspaceId || !requestWorkspaceId) {
    return false;
  }
  
  return userWorkspaceId.toString() === requestWorkspaceId.toString();
};

/**
 * Middleware to validate workspace access
 * Can be used as route middleware: app.get('/api/data', validateWorkspaceMiddleware, handler)
 * 
 * Usage:
 * router.get('/messages', validateWorkspaceMiddleware, async (req, res) => { ... })
 */
export const validateWorkspaceMiddleware = (req, res, next) => {
  // If subdomain detection didn't set workspaceId, skip
  if (!req.workspaceId) {
    return next();
  }
  
  // If user is not authenticated, skip (auth middleware will catch)
  if (!req.user || !req.user.workspaceId) {
    return next();
  }
  
  // Verify user's workspace matches request workspace
  if (req.user.workspaceId.toString() !== req.workspaceId.toString()) {
    return res.status(403).json({
      success: false,
      error: 'Access denied - Workspace mismatch'
    });
  }
  
  next();
};

/**
 * Helper to add workspaceId to response data
 * Useful for multi-workspace queries where you need to know the context
 * 
 * Usage:
 * const data = await Message.find(addWorkspaceFilter(query, req.workspaceId));
 * return res.json({ workspaceId: req.workspaceId, data });
 */
export const attachWorkspaceContext = (data, workspaceId) => {
  return {
    workspaceId,
    data
  };
};

/**
 * Update operation with workspace isolation
 * Prevents updating documents from other workspaces
 * 
 * Usage:
 * await Message.updateOne(
 *   getWorkspaceFilter({ _id: messageId }, req.workspaceId),
 *   { $set: { status: 'sent' } }
 * );
 */
export const getWorkspaceFilter = (baseFilter = {}, workspaceId) => {
  if (!workspaceId) {
    return baseFilter;
  }
  
  return {
    ...baseFilter,
    workspaceId: workspaceId
  };
};

/**
 * Delete operation with workspace isolation
 * Prevents deleting documents from other workspaces
 * 
 * Usage:
 * const result = await Message.deleteOne(
 *   getWorkspaceFilter({ _id: messageId }, req.workspaceId)
 * );
 * if (result.deletedCount === 0) {
 *   return res.status(404).json({ error: 'Message not found' });
 * }
 */
export const deleteWithWorkspaceCheck = async (Model, baseFilter, workspaceId) => {
  const filter = getWorkspaceFilter(baseFilter, workspaceId);
  const result = await Model.deleteOne(filter);
  
  if (result.deletedCount === 0) {
    return {
      success: false,
      error: 'Document not found or not in your workspace'
    };
  }
  
  return {
    success: true,
    message: 'Document deleted'
  };
};

export default {
  addWorkspaceFilter,
  getWorkspaceMatchStage,
  validateWorkspaceOwnership,
  validateWorkspaceMiddleware,
  attachWorkspaceContext,
  getWorkspaceFilter,
  deleteWithWorkspaceCheck
};
