import Project from '../models/Project.js';
import Account from '../models/Account.js';
import planLimitService, { resolveQuotaResource } from '../services/planLimitService.js';

/**
 * Project Authorization Middleware
 * Verifies that user has access to the requested project
 * Phase 2: Backend API Project Scoping
 */

/**
 * Middleware: Verify project access
 * Checks that:
 * 1. Project exists
 * 2. User owns the project
 * 3. Project is active
 * 4. Attaches project to request context
 */
export async function verifyProjectAccess(req, res, next) {
  try {
    const { projectId } = req.params;
    const { accountId } = req.user; // From JWT middleware

    // Validate projectId provided
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'projectId is required in URL parameters'
      });
    }

    // Find project
    const project = await Project.findOne({
      projectId,
      accountId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // Verify project is active
    if (project.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Project is ${project.status}. Only active projects can be accessed.`
      });
    }

    // Attach project to request context for controller use
    req.project = project;
    req.projectId = projectId;

    next();
  } catch (error) {
    console.error('Project authorization error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization check failed'
    });
  }
}

/**
 * Middleware: Optional project access
 * Tries to attach project but doesn't fail if not provided
 * Used for endpoints that support both /api/data and /api/projects/:projectId/data
 */
export async function optionalProjectAccess(req, res, next) {
  try {
    const { projectId } = req.params;
    const { accountId } = req.user;

    if (!projectId) {
      // No projectId provided, use default
      // Controller will handle this case
      next();
      return;
    }

    // Find project
    const project = await Project.findOne({
      projectId,
      accountId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    if (project.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Project is ${project.status}`
      });
    }

    // Attach project to request
    req.project = project;
    req.projectId = projectId;

    next();
  } catch (error) {
    console.error('Optional project authorization error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization check failed'
    });
  }
}

/**
 * Middleware: Check project quota/limits
 * Verifies that project hasn't exceeded plan limits
 * Used before creating new items (messages, contacts, campaigns, etc.)
 */
export function checkProjectQuota(resourceType) {
  const catalogKey = resolveQuotaResource(resourceType);

  return async (req, res, next) => {
    try {
      const projectId = req.projectId;
      const accountId = req.user?.accountId || req.account?.accountId;

      if (!projectId || !accountId) {
        next();
        return;
      }

      if (req.account?.isInternal === true) {
        next();
        return;
      }

      const project = await Project.findOne({ projectId, accountId });
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const account = req.account?._id
        ? await Account.findById(req.account._id).select('isInternal').lean()
        : await Account.findOne({ accountId }).select('isInternal').lean();

      if (account?.isInternal) {
        next();
        return;
      }

      if (catalogKey === 'messages') {
        const sendCheck = await planLimitService.canSendMessageWithCredits(accountId, projectId);
        if (!sendCheck.allowed) {
          return res.status(429).json({
            success: false,
            code: 'QUOTA_EXCEEDED',
            resource: 'messages',
            error: sendCheck.billingMode === 'credits'
              ? 'Monthly message quota used. Buy credits to continue sending.'
              : 'Monthly message limit reached',
            limit: sendCheck.limit,
            used: sendCheck.used,
            billingMode: sendCheck.billingMode,
            creditBalance: sendCheck.creditBalance ?? 0,
            creditsRequired: sendCheck.creditsRequired ?? planLimitService.minimumBillableCreditCost(),
            upgradeCta: '/dashboard/features/billing',
            topupCta: '/dashboard/features/billing',
          });
        }
        req.planLimitCheck = sendCheck;
        req.messageBillingMode = sendCheck.billingMode;
        next();
        return;
      }

      const check = await planLimitService.checkLimit(accountId, catalogKey, projectId);
      if (!check.allowed && !check.unlimited) {
        return res.status(429).json({
          success: false,
          code: 'QUOTA_EXCEEDED',
          resource: check.resource,
          error: `${check.resource} limit reached`,
          limit: check.limit,
          used: check.used,
          upgradeCta: '/dashboard/features/billing',
          topupCta: '/dashboard/features/billing',
        });
      }

      req.planLimitCheck = check;
      next();
    } catch (error) {
      console.error('Quota check error:', error);
      res.status(500).json({
        success: false,
        error: 'Quota check failed'
      });
    }
  };
}

/**
 * Middleware: Validate project from query params
 * Extracts projectId from query (?projectId=xyz) and validates access
 * Used for settings and other query-based endpoints
 */
export async function validateProjectFromQuery(req, res, next) {
  try {
    const { projectId } = req.query;
    const { accountId } = req.account || req.user; // Support both req.account and req.user

    // If no projectId in query, use default project
    if (!projectId) {
      return attachDefaultProject(req, res, next);
    }

    // Find and validate project
    const project = await Project.findOne({
      projectId,
      accountId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    if (project.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Project is ${project.status}. Only active projects can be accessed.`
      });
    }

    // Attach project to request for controller use
    req.projectId = projectId;
    req.project = project;

    next();
  } catch (error) {
    console.error('Project query validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Project validation failed'
    });
  }
}

/**
 * Middleware: Attach default project if not provided
 * Used for backward compatibility with old API routes
 */
export async function attachDefaultProject(req, res, next) {
  try {
    const { accountId } = req.account || req.user;

    // Check if projectId already attached
    if (req.projectId) {
      next();
      return;
    }

    // Find default project
    const project = await Project.findOne({
      accountId,
      isDefault: true,
      status: 'active'
    });

    if (!project) {
      // No default project, find any active project
      const anyProject = await Project.findOne({
        accountId,
        status: 'active'
      });

      if (!anyProject) {
        return res.status(400).json({
          success: false,
          error: 'No active project found. Please create a project first.'
        });
      }

      req.projectId = anyProject.projectId;
      req.project = anyProject;
    } else {
      req.projectId = project.projectId;
      req.project = project;
    }

    next();
  } catch (error) {
    console.error('Error attaching default project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set default project context'
    });
  }
}
