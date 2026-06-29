import express from 'express';
import * as projectController from '../controllers/projectController.js';
import {
  verifyProjectAccess,
  attachDefaultProject
} from '../middleware/projectAuth.js';
import { requireJWT } from '../middlewares/jwtAuth.js';

/**
 * Project Routes
 * Phase 2: Backend API Project Scoping
 */

const router = express.Router();

// All routes require authentication
router.use(requireJWT);

/**
 * Project Management Endpoints
 */

// GET /api/projects - List all user's projects
router.get('/', projectController.getProjects);

// GET /api/projects/presets/list - Wizard presets (before :projectId)
router.get('/presets/list', projectController.getProjectPresets);

// POST /api/projects - Create new project
router.post('/', projectController.createProject);

// GET /api/projects/:projectId - Get project details
router.get('/:projectId', verifyProjectAccess, projectController.getProject);

// PUT /api/projects/:projectId - Update project
router.put('/:projectId', verifyProjectAccess, projectController.updateProject);

// DELETE /api/projects/:projectId - Delete (archive) project
router.delete('/:projectId', verifyProjectAccess, projectController.deleteProject);

// POST /api/projects/:projectId/set-default - Set as default
router.post('/:projectId/set-default', verifyProjectAccess, projectController.setDefaultProject);

// GET /api/projects/:projectId/stats - Get project statistics
router.get('/:projectId/stats', verifyProjectAccess, projectController.getProjectStats);

// GET /api/projects/:projectId/analytics - Full project performance analytics
router.get('/:projectId/analytics', verifyProjectAccess, projectController.getProjectAnalytics);

export default router;
