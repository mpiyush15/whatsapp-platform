import Project from '../models/Project.js';
import Account from '../models/Account.js';
import { BusinessCategory } from '../constants/enums.js';

/**
 * Project Controller
 * Handles all project CRUD operations and project-level management
 * Phase 2: Backend API Project Scoping
 */

/**
 * GET /api/projects
 * List all projects for the authenticated user's account
 */
export async function getProjects(req, res) {
  try {
    const { accountId } = req.user;
    const { limit = 50, offset = 0, status = null } = req.query;

    // Build query
    const query = { accountId };
    if (status) {
      query.status = status;
    }

    // Fetch projects
    const projects = await Project.find(query)
      .select('-whatsappAccessToken') // Don't expose tokens
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ createdAt: -1 });

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      data: projects,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch projects'
    });
  }
}

/**
 * GET /api/projects/:projectId
 * Get single project details with account info
 */
export async function getProject(req, res) {
  try {
    const { projectId } = req.params;
    const { accountId } = req.user;

    const project = await Project.findOne({
      projectId,
      accountId
    }).select('-whatsappAccessToken');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Fetch account details
    const account = await Account.findOne({ accountId }).select('-password -whatsappAccessToken');

    res.json({
      success: true,
      data: {
        ...project.toObject(),
        account: account ? {
          email: account.email,
          name: account.name,
          plan: account.plan,
          status: account.status,
          billingCycle: account.billingCycle,
          timezone: account.timezone,
          createdAt: account.createdAt,
          type: account.type
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch project'
    });
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function createProject(req, res) {
  try {
    const { accountId } = req.user;
    const {
      name,
      businessCategory = 'other',
      whatsappPhoneNumber = null,
      whatsappPhoneNumberId = null,
      whatsappBusinessAccountId = null,
      settings = {}
    } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Project name is required'
      });
    }

    if (!Object.values(BusinessCategory).includes(businessCategory)) {
      return res.status(400).json({
        success: false,
        error: `Invalid business category. Allowed: ${Object.values(BusinessCategory).join(', ')}`
      });
    }

    // Generate unique projectId (same pattern as accountId: YYXXXXX)
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    const projectId = `${timestamp}${random}`.slice(0, 8);

    // Check if it's the first project (should be default)
    const existingProjects = await Project.countDocuments({ accountId });
    const isDefault = existingProjects === 0;

    // Create project
    const project = new Project({
      projectId,
      accountId,
      name: name.trim(),
      businessCategory,
      whatsappPhoneNumber,
      whatsappPhoneNumberId,
      whatsappBusinessAccountId,
      settings: {
        timezone: settings.timezone || 'UTC',
        autoReplyEnabled: settings.autoReplyEnabled !== false,
        notificationsEnabled: settings.notificationsEnabled !== false,
        webhookUrl: settings.webhookUrl || null,
        ...settings
      },
      isDefault,
      status: 'active'
    });

    const savedProject = await project.save();

    // If this is the first project, update account's defaultProjectId
    if (isDefault) {
      await Account.findOneAndUpdate(
        { accountId },
        { defaultProjectId: projectId },
        { new: true }
      );
    }

    res.status(201).json({
      success: true,
      data: savedProject,
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create project'
    });
  }
}

/**
 * PUT /api/projects/:projectId
 * Update project details
 */
export async function updateProject(req, res) {
  try {
    const { projectId } = req.params;
    const { accountId } = req.user;
    const updates = req.body;

    // Don't allow updating critical fields
    const forbiddenFields = ['projectId', 'accountId', 'createdAt'];
    forbiddenFields.forEach(field => delete updates[field]);

    // Validate businessCategory if provided
    if (updates.businessCategory && !Object.values(BusinessCategory).includes(updates.businessCategory)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid business category'
      });
    }

    const project = await Project.findOneAndUpdate(
      { projectId, accountId },
      updates,
      { new: true, runValidators: true }
    ).select('-whatsappAccessToken');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update project'
    });
  }
}

/**
 * DELETE /api/projects/:projectId
 * Soft delete project (archive)
 */
export async function deleteProject(req, res) {
  try {
    const { projectId } = req.params;
    const { accountId } = req.user;

    // Find project
    const project = await Project.findOne({ projectId, accountId });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Can't delete if it's the only active project
    const activeCount = await Project.countDocuments({
      accountId,
      status: 'active'
    });

    if (activeCount === 1) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your only active project'
      });
    }

    // Soft delete
    const updated = await Project.findOneAndUpdate(
      { projectId, accountId },
      { status: 'inactive', deletedAt: new Date() },
      { new: true }
    );

    res.json({
      success: true,
      data: updated,
      message: 'Project archived successfully'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete project'
    });
  }
}

/**
 * POST /api/projects/:projectId/set-default
 * Set a project as the default project for quick access
 */
export async function setDefaultProject(req, res) {
  try {
    const { projectId } = req.params;
    const { accountId } = req.user;

    // Verify project exists and belongs to account
    const project = await Project.findOne({ projectId, accountId });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (project.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot set inactive project as default'
      });
    }

    // Update account's defaultProjectId
    await Account.findOneAndUpdate(
      { accountId },
      { defaultProjectId: projectId },
      { new: true }
    );

    // Update isDefault flags
    await Project.updateMany(
      { accountId },
      { isDefault: false }
    );

    await Project.findOneAndUpdate(
      { projectId, accountId },
      { isDefault: true },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Project set as default'
    });
  } catch (error) {
    console.error('Error setting default project:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to set default project'
    });
  }
}

/**
 * GET /api/projects/:projectId/stats
 * Get project statistics (messages, contacts, etc.)
 */
export async function getProjectAnalytics(req, res) {
  try {
    const { projectId } = req.params;
    const { accountId } = req.user;

    const project = await Project.findOne({ projectId, accountId });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    const { getProjectAnalytics: loadAnalytics } = await import(
      '../services/projectAnalyticsService.js'
    );
    const analytics = await loadAnalytics(accountId, projectId, req.query);

    return res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching project analytics:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch project analytics',
    });
  }
}

export async function getProjectStats(req, res) {
  try {
    const { projectId } = req.params;
    const { accountId } = req.user;

    // Verify project exists
    const project = await Project.findOne({ projectId, accountId });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Import models for stats
    const Message = (await import('../models/Message.js')).default;
    const Conversation = (await import('../models/Conversation.js')).default;
    const Contact = (await import('../models/Contact.js')).default;

    // Calculate stats
    const stats = {
      totalMessages: await Message.countDocuments({ projectId, accountId }),
      totalConversations: await Conversation.countDocuments({ projectId, accountId }),
      totalContacts: await Contact.countDocuments({ projectId, accountId }),
      activeToday: await Conversation.countDocuments({
        projectId,
        accountId,
        updatedAt: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      })
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching project stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch project stats'
    });
  }
}
