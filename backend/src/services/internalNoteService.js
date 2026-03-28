import InternalNote from '../models/InternalNote.js';
import ActivityTimeline from '../models/ActivityTimeline.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * InternalNoteService
 * Business logic for internal notes
 * Notes are ONLY for agents, NEVER visible to customers
 */

/**
 * Create internal note
 */
export const createInternalNote = async (conversationId, accountId, content, createdByAgentId, isResolution = false, mentions = []) => {
  const note = await InternalNote.create({
    accountId,
    conversationId,
    createdByAgentId,
    content,
    isResolution,
    mentions
  });

  // Log in activity timeline
  await ActivityTimeline.create({
    accountId,
    conversationId,
    activityType: 'note_added',
    actor: {
      type: 'agent',
      id: createdByAgentId
    },
    details: new Map([
      ['noteId', note._id.toString()],
      ['isResolution', isResolution.toString()],
      ['mentionCount', mentions.length.toString()]
    ])
  });

  return note;
};

/**
 * Get internal notes for conversation
 */
export const getNotes = async (conversationId, accountId, limit = 50) => {
  const notes = await InternalNote.find({
    conversationId,
    accountId
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('createdByAgentId', 'name email')
    .populate('editedByAgentId', 'name email')
    .populate('mentions', 'name email')
    .lean();

  return notes.reverse();
};

/**
 * Get single internal note
 */
export const getNote = async (noteId, accountId) => {
  const note = await InternalNote.findOne({
    _id: noteId,
    accountId
  })
    .populate('createdByAgentId', 'name email')
    .populate('editedByAgentId', 'name email')
    .populate('mentions', 'name email')
    .populate('editHistory.editedBy', 'name email');

  if (!note) {
    throw new NotFoundError('Note not found');
  }

  return note;
};

/**
 * Update internal note
 */
export const updateNote = async (noteId, accountId, content, updatedByAgentId) => {
  const note = await InternalNote.findOne({ _id: noteId, accountId });

  if (!note) {
    throw new NotFoundError('Note not found');
  }

  // Save to edit history
  note.editHistory.push({
    content: note.content,
    editedAt: new Date(),
    editedBy: note.createdByAgentId
  });

  // Update content
  note.content = content;
  note.editedAt = new Date();
  note.editedByAgentId = updatedByAgentId;

  const updatedNote = await note.save();

  // Log in activity timeline
  await ActivityTimeline.create({
    accountId,
    conversationId: note.conversationId,
    activityType: 'note_updated',
    actor: {
      type: 'agent',
      id: updatedByAgentId
    },
    details: new Map([['noteId', noteId.toString()]])
  });

  return updatedNote;
};

/**
 * Delete internal note
 */
export const deleteNote = async (noteId, accountId, deletedByAgentId) => {
  const note = await InternalNote.findOneAndDelete({
    _id: noteId,
    accountId
  });

  if (!note) {
    throw new NotFoundError('Note not found');
  }

  // Log deletion in activity timeline
  await ActivityTimeline.create({
    accountId,
    conversationId: note.conversationId,
    activityType: 'note_deleted',
    actor: {
      type: 'agent',
      id: deletedByAgentId
    },
    details: new Map([['noteId', noteId.toString()]])
  });

  return note;
};

/**
 * Mark note as resolution
 */
export const markAsResolution = async (noteId, accountId, markedByAgentId) => {
  const note = await InternalNote.findOneAndUpdate(
    { _id: noteId, accountId },
    {
      isResolution: true,
      editedAt: new Date(),
      editedByAgentId: markedByAgentId
    },
    { new: true }
  );

  if (!note) {
    throw new NotFoundError('Note not found');
  }

  return note;
};

/**
 * Add mention to note
 */
export const addMention = async (noteId, accountId, agentIdToMention) => {
  const note = await InternalNote.findOne({ _id: noteId, accountId });

  if (!note) {
    throw new NotFoundError('Note not found');
  }

  // Check if already mentioned
  const alreadyMentioned = note.mentions.some(id => id.toString() === agentIdToMention.toString());

  if (!alreadyMentioned) {
    note.mentions.push(agentIdToMention);
    await note.save();
  }

  return note;
};

/**
 * Remove mention from note
 */
export const removeMention = async (noteId, accountId, agentIdToRemove) => {
  const note = await InternalNote.findOne({ _id: noteId, accountId });

  if (!note) {
    throw new NotFoundError('Note not found');
  }

  note.mentions = note.mentions.filter(
    id => id.toString() !== agentIdToRemove.toString()
  );

  await note.save();

  return note;
};

/**
 * Search internal notes
 */
export const searchNotes = async (conversationId, accountId, searchText) => {
  const notes = await InternalNote.find({
    conversationId,
    accountId,
    content: { $regex: searchText, $options: 'i' }
  })
    .sort({ createdAt: -1 })
    .populate('createdByAgentId', 'name email')
    .lean();

  return notes;
};

/**
 * Get resolution notes for conversation
 */
export const getResolutionNotes = async (conversationId, accountId) => {
  const notes = await InternalNote.find({
    conversationId,
    accountId,
    isResolution: true
  })
    .sort({ createdAt: -1 })
    .populate('createdByAgentId', 'name email')
    .lean();

  return notes;
};

export default {
  createInternalNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
  markAsResolution,
  addMention,
  removeMention,
  searchNotes,
  getResolutionNotes
};
