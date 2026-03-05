import express from 'express';
import tagService from '../services/tagService.js';
import { requireJWT } from '../middlewares/jwtAuth.js';

const router = express.Router();

// ✅ All routes require JWT authentication
router.use(requireJWT);

/**
 * GET /api/tags
 * List tags for account
 */
router.get('/', async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { type = null } = req.query;

    // List tags
    const tags = await tagService.listTags(accountId, type, true);

    return res.status(200).json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('❌ Error listing tags:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list tags',
      error: error.message
    });
  }
});

/**
 * POST /api/tags
 * Create new tag
 */
router.post('/', async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { name, type = 'conversation', color = '#808080', icon = null, description = null } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'name is required',
        error: 'MISSING_NAME'
      });
    }

    if (!['conversation', 'contact', 'message'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'type must be one of: conversation, contact, message',
        error: 'INVALID_TYPE'
      });
    }

    // Create tag
    const tag = await tagService.createTag(accountId, name, type, color, icon, description);

    return res.status(201).json({
      success: true,
      message: 'Tag created successfully',
      data: tag
    });
  } catch (error) {
    console.error('❌ Error creating tag:', error);
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message,
        error: 'TAG_EXISTS'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to create tag',
      error: error.message
    });
  }
});

/**
 * GET /api/tags/:tagId
 * Get single tag
 */
router.get('/:tagId', async (req, res) => {
  try {
    const { tagId } = req.params;
    const accountId = req.account.accountId;

    // Get tag
    const tag = await tagService.getTag(tagId, accountId);

    return res.status(200).json({
      success: true,
      data: tag
    });
  } catch (error) {
    console.error('❌ Error getting tag:', error);
    if (error.message === 'Tag not found') {
      return res.status(404).json({
        success: false,
        message: 'Tag not found',
        error: 'NOT_FOUND'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to get tag',
      error: error.message
    });
  }
});

/**
 * PATCH /api/tags/:tagId
 * Update tag
 */
router.patch('/:tagId', async (req, res) => {
  try {
    const { tagId } = req.params;
    const accountId = req.account.accountId;
    const { name, color, icon, description, isActive } = req.body;

    // Build updates
    const updates = {};
    if (name) updates.name = name;
    if (color) updates.color = color;
    if (icon) updates.icon = icon;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.isActive = isActive;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
        error: 'EMPTY_UPDATE'
      });
    }

    // Update tag
    const tag = await tagService.updateTag(tagId, accountId, updates);

    return res.status(200).json({
      success: true,
      message: 'Tag updated',
      data: tag
    });
  } catch (error) {
    console.error('❌ Error updating tag:', error);
    if (error.message === 'Tag not found') {
      return res.status(404).json({
        success: false,
        message: 'Tag not found',
        error: 'NOT_FOUND'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to update tag',
      error: error.message
    });
  }
});

/**
 * DELETE /api/tags/:tagId
 * Delete tag
 */
router.delete('/:tagId', async (req, res) => {
  try {
    const { tagId } = req.params;
    const accountId = req.account.accountId;

    // Delete tag
    const tag = await tagService.deleteTag(tagId, accountId);

    return res.status(200).json({
      success: true,
      message: 'Tag deleted',
      data: tag
    });
  } catch (error) {
    console.error('❌ Error deleting tag:', error);
    if (error.message === 'Tag not found') {
      return res.status(404).json({
        success: false,
        message: 'Tag not found',
        error: 'NOT_FOUND'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to delete tag',
      error: error.message
    });
  }
});

/**
 * GET /api/tags/popular
 * Get popular tags
 */
router.get('/popular', async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { type = null, limit = 10 } = req.query;

    // Get popular tags
    const tags = await tagService.getPopularTags(
      accountId,
      type,
      Math.min(parseInt(limit) || 10, 50)
    );

    return res.status(200).json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('❌ Error getting popular tags:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get popular tags',
      error: error.message
    });
  }
});

/**
 * GET /api/tags/search
 * Search tags by name
 */
router.get('/search', async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { q, type = null } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'q (query) is required',
        error: 'MISSING_QUERY'
      });
    }

    // Search tags
    const tags = await tagService.searchTags(accountId, q, type);

    return res.status(200).json({
      success: true,
      data: tags,
      query: q
    });
  } catch (error) {
    console.error('❌ Error searching tags:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search tags',
      error: error.message
    });
  }
});

export default router;
