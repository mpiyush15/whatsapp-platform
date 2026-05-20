import PhoneNumber from '../models/PhoneNumber.js';
import Project from '../models/Project.js';

/**
 * Resolve how to attribute account data to a project when legacy rows lack projectId.
 * - Explicit projectId on documents
 * - Phone lines registered to this project
 * - Default project: unscoped phones + messages for this account
 */
export async function resolveProjectScope(accountId, projectId) {
  const project = await Project.findOne({ accountId, projectId }).lean();
  if (!project) {
    return null;
  }

  let phoneNumberIds = await PhoneNumber.find({ accountId, projectId })
    .distinct('phoneNumberId');

  if (project.whatsappPhoneNumberId && !phoneNumberIds.includes(project.whatsappPhoneNumberId)) {
    phoneNumberIds = [...phoneNumberIds, project.whatsappPhoneNumberId];
  }

  if (phoneNumberIds.length === 0 && project.isDefault) {
    const unscoped = await PhoneNumber.find({
      accountId,
      $or: [
        { projectId: null },
        { projectId: { $exists: false } },
        { projectId: '' },
      ],
    }).distinct('phoneNumberId');

    phoneNumberIds = unscoped.length
      ? unscoped
      : await PhoneNumber.find({ accountId, isActive: true }).distinct('phoneNumberId');
  }

  const scopeOr = [{ projectId }];
  if (phoneNumberIds.length > 0) {
    scopeOr.push({ phoneNumberId: { $in: phoneNumberIds } });
  }

  const entityOr = [{ projectId }];
  if (project.isDefault) {
    entityOr.push(
      { projectId: null },
      { projectId: { $exists: false } },
      { projectId: '' }
    );
  }
  if (phoneNumberIds.length > 0) {
    entityOr.push({ phoneNumberId: { $in: phoneNumberIds } });
  }

  return {
    project,
    phoneNumberIds,
    /** Messages, conversations (phone + project) */
    messageMatch: { accountId, $or: scopeOr },
    /** Campaigns, rules, leads, contacts */
    entityMatch: { accountId, $or: entityOr },
  };
}

/** Resolve projectId when saving a message for a WhatsApp line */
export async function resolveProjectIdForAccountPhone(accountId, phoneNumberId) {
  if (!accountId || !phoneNumberId) return null;

  const phone = await PhoneNumber.findOne({ accountId, phoneNumberId })
    .select('projectId')
    .lean();
  if (phone?.projectId) return phone.projectId;

  const defaultProject = await Project.findOne({
    accountId,
    isDefault: true,
    status: 'active',
  })
    .select('projectId')
    .lean();

  return defaultProject?.projectId || null;
}

export default { resolveProjectScope, resolveProjectIdForAccountPhone };
