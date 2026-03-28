import Tag from '../models/Tag.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * TagService
 * Business logic for tag management
 * Tags are used for organizing conversations, contacts, and messages
 */

/**
 * Create a new tag
 */
export const createTag = async (accountId, name, type = 'conversation', color = '#808080', icon = null, description = null) => {
  // Check if tag with this name and type already exists
  const existingTag = await Tag.findOne({
    accountId,
    name,
    type
  });

  if (existingTag) {
    throw new Error(`Tag '${name}' of type '${type}' already exists`);
  }

  const tag = await Tag.create({
    accountId,
    name,
    type,
    color,
    icon,
    description,
    usageCount: 0,
    isActive: true
  });

  return tag;
};

/**
 * List tags for an account
 */
export const listTags = async (accountId, type = null, isActive = true) => {
  const query = {
    accountId,
    isActive
  };

  if (type) {
    query.type = type;
  }

  const tags = await Tag.find(query)
    .sort({ usageCount: -1, name: 1 })
    .lean();

  return tags;
};

/**
 * Get tag by ID
 */
export const getTag = async (tagId, accountId) => {
  const tag = await Tag.findOne({
    _id: tagId,
    accountId
  });

  if (!tag) {
    throw new NotFoundError('Tag not found');
  }

  return tag;
};

/**
 * Update tag
 */
export const updateTag = async (tagId, accountId, updates) => {
  const allowedFields = ['name', 'color', 'icon', 'description', 'isActive'];
  const updateData = {};

  // Filter only allowed fields
  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      updateData[key] = updates[key];
    }
  });

  const tag = await Tag.findOneAndUpdate(
    { _id: tagId, accountId },
    updateData,
    { new: true }
  );

  if (!tag) {
    throw new NotFoundError('Tag not found');
  }

  return tag;
};

/**
 * Delete tag
 */
export const deleteTag = async (tagId, accountId) => {
  const tag = await Tag.findOneAndDelete({
    _id: tagId,
    accountId
  });

  if (!tag) {
    throw new NotFoundError('Tag not found');
  }

  return tag;
};

/**
 * Increment tag usage count
 */
export const incrementTagUsage = async (tagId, accountId) => {
  const tag = await Tag.findOneAndUpdate(
    { _id: tagId, accountId },
    { $inc: { usageCount: 1 } },
    { new: true }
  );

  return tag;
};

/**
 * Decrement tag usage count
 */
export const decrementTagUsage = async (tagId, accountId) => {
  const tag = await Tag.findOneAndUpdate(
    { _id: tagId, accountId },
    { $inc: { usageCount: -1 } },
    { new: true }
  );

  return tag;
};

/**
 * Get popular tags
 */
export const getPopularTags = async (accountId, type = null, limit = 10) => {
  const query = { accountId, isActive: true };

  if (type) {
    query.type = type;
  }

  const tags = await Tag.find(query)
    .sort({ usageCount: -1 })
    .limit(limit)
    .lean();

  return tags;
};

/**
 * Search tags by name
 */
export const searchTags = async (accountId, searchText, type = null) => {
  const query = {
    accountId,
    isActive: true,
    name: { $regex: searchText, $options: 'i' }
  };

  if (type) {
    query.type = type;
  }

  const tags = await Tag.find(query)
    .sort({ usageCount: -1 })
    .lean();

  return tags;
};

export default {
  createTag,
  listTags,
  getTag,
  updateTag,
  deleteTag,
  incrementTagUsage,
  decrementTagUsage,
  getPopularTags,
  searchTags
};
