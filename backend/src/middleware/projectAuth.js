import Project from '../models/Project.js';
import Account from '../models/Account.js';
import PhoneNumber from '../models/PhoneNumber.js';

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
  return async (req, res, next) => {
    try {
      const { projectId } = req;
      const accountId = req.user?.accountId || req.account?.accountId;

      if (!projectId) {
        // No project context, skip quota check
        next();
        return;
      }

      if (req.account?.isInternal === true) {
        // Internal org accounts are exempt from billing/quota enforcement
        next();
        return;
      }

      // Import models
      const Message = (await import('../models/Message.js')).default;
      const Contact = (await import('../models/Contact.js')).default;
      const Subscription = (await import('../models/Subscription.js')).default;

      // Get project and subscription
      const project = await Project.findOne({ projectId, accountId });
      const subscription = await Subscription.findOne({ accountId });
      const account = req.account?._id
        ? await Account.findById(req.account._id).select('limits isInternal')
        : await Account.findOne({ accountId }).select('limits isInternal');

      if ((!subscription || subscription.status !== 'active') && account?.isInternal !== true) {
        return res.status(403).json({
          success: false,
          error: 'Active subscription required'
        });
      }

      const resolvedLimits = {
        messagesPerDay: Number(subscription?.features?.messagesPerDay ?? account?.limits?.messagesPerDay ?? 0),
        contacts: Number(subscription?.features?.contacts ?? account?.limits?.contacts ?? 0),
        phoneNumbers: Number(subscription?.features?.phoneNumbers ?? account?.limits?.phoneNumbers ?? 0),
      };

      const sendQuotaExceeded = ({ resource, limit, used, message }) => {
        return res.status(429).json({
          success: false,
          code: 'QUOTA_EXCEEDED',
          resource,
          error: message,
          limit,
          used,
          upgradeCta: '/dashboard/features/billing',
          topupCta: '/dashboard/features/billing',
        });
      };

      // Check limits based on resource type
      switch (resourceType) {
        case 'message':
          if (!Number.isFinite(resolvedLimits.messagesPerDay) || resolvedLimits.messagesPerDay <= 0) {
            break;
          }

          // Check daily message limit
          const messageCount = await Message.countDocuments({
            projectId,
            accountId,
            createdAt: {
              $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          });

          if (messageCount >= resolvedLimits.messagesPerDay) {
            return sendQuotaExceeded({
              resource: 'messagesPerDay',
              limit: resolvedLimits.messagesPerDay,
              used: messageCount,
              message: 'Daily message limit reached',
            });
          }
          break;

        case 'contact':
          if (!Number.isFinite(resolvedLimits.contacts) || resolvedLimits.contacts <= 0) {
            break;
          }

          // Check contact limit
          const contactCount = await Contact.countDocuments({
            projectId,
            accountId
          });

          if (contactCount >= resolvedLimits.contacts) {
            return sendQuotaExceeded({
              resource: 'contacts',
              limit: resolvedLimits.contacts,
              used: contactCount,
              message: 'Contact limit reached',
            });
          }
          break;

        case 'phoneNumber':
          if (!Number.isFinite(resolvedLimits.phoneNumbers) || resolvedLimits.phoneNumbers <= 0) {
            break;
          }

          // Check phone number limit
          const phoneCount = await PhoneNumber.countDocuments({
            accountId
          });

          if (phoneCount >= resolvedLimits.phoneNumbers) {
            return sendQuotaExceeded({
              resource: 'phoneNumbers',
              limit: resolvedLimits.phoneNumbers,
              used: phoneCount,
              message: 'Phone number limit reached',
            });
          }
          break;

        default:
          break;
      }

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
