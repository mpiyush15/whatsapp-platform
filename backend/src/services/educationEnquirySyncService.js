import mongoose from 'mongoose';
import Batch from '../models/Batch.js';
import Contact from '../models/Contact.js';
import Course from '../models/Course.js';
import Enquiry from '../models/Enquiry.js';
import Project from '../models/Project.js';
import logger from '../utils/logger.js';

const normalizePhone = (value = '') => String(value || '').replace(/[\s+()-]/g, '');
const normalizeString = (value = '') => String(value || '').trim();
const normalizeKey = (value = '') => normalizeString(value).toLowerCase().replace(/[^a-z0-9]/g, '');

const responseObject = (value) => {
  if (!value) return {};
  if (typeof value.toObject === 'function') return value.toObject();
  if (value instanceof Map) return Object.fromEntries(value);
  if (typeof value === 'object') return { ...value };
  return {};
};

const firstResponse = (responses, keys = []) => {
  for (const key of keys) {
    const value = responses?.[key];
    if (value !== undefined && value !== null && normalizeString(value)) {
      return normalizeString(value);
    }
  }
  return '';
};

const FIELD_KEYS = {
  name: ['name', 'fullName', 'full_name', 'customerName', 'customer_name', 'student_name', 'studentName', 'student'],
  email: ['email', 'emailAddress', 'email_address'],
  phone: ['phone', 'mobile', 'mobileNumber', 'mobile_number', 'whatsapp', 'whatsappNumber', 'whatsapp_number'],
  course: ['course', 'courseName', 'course_name', 'selectedCourse', 'selected_course'],
  courseId: ['course__id', 'courseId__id', 'course_id', 'courseId'],
  batch: ['batch', 'batchName', 'batch_name', 'selectedBatch', 'selected_batch'],
  batchId: ['batch__id', 'batchId__id', 'batch_id', 'batchId'],
  fees: ['fees', 'fee', 'amount', 'courseFees', 'course_fees'],
  notes: ['notes', 'note', 'remarks', 'remark'],
};

const KNOWN_RESPONSE_KEYS = new Set(Object.values(FIELD_KEYS).flat());
const PLACEHOLDER_VALUES = new Set([
  ...Object.values(FIELD_KEYS).flat().map((key) => normalizeKey(key)),
  ...Object.keys(FIELD_KEYS).map((key) => normalizeKey(key)),
]);

const cleanExplicitValue = (value = '') => {
  const normalized = normalizeString(value);
  if (!normalized) return '';
  if (PLACEHOLDER_VALUES.has(normalizeKey(normalized))) return '';
  return normalized;
};

const mappedResponses = (responses = {}) => {
  const safeResponses = responseObject(responses);
  const mapped = {};

  for (const [field, keys] of Object.entries(FIELD_KEYS)) {
    const value = firstResponse(safeResponses, keys);
    if (value) mapped[field] = value;
  }

  return mapped;
};

const unmappedResponses = (responses = {}) => Object.fromEntries(
  Object.entries(responseObject(responses))
    .filter(([key, value]) => !KNOWN_RESPONSE_KEYS.has(String(key)) && normalizeString(value))
);

const responseKeyCount = (responses = {}) => Object.entries(responseObject(responses))
  .filter(([, value]) => value !== undefined && value !== null && normalizeString(value))
  .length;

const sourceRank = (source = '') => {
  const normalized = normalizeString(source).toLowerCase();
  if (normalized.includes('chatbot_workflow_action')) return 90;
  if (normalized.includes('chatbot_workflow')) return 80;
  if (normalized.includes('manual')) return 70;
  if (normalized.includes('live_chat')) return 50;
  if (normalized.includes('campaign')) return 40;
  if (normalized.includes('whatsapp inbound')) return 20;
  return 30;
};

const mergeMetadata = (existing = {}, incoming = {}) => ({
  ...responseObject(existing),
  ...responseObject(incoming),
});

const normalizeTags = (tags = []) => Array.from(new Set(
  (Array.isArray(tags) ? tags : String(tags || '').split(','))
    .map((tag) => normalizeString(tag))
    .filter(Boolean)
));

const findExistingEnquiry = async ({ accountId, projectId, cleanPhone }) => {
  if (!cleanPhone) return null;
  return await Enquiry.findOne({ accountId, projectId, phone: cleanPhone }).sort({ updatedAt: -1 });
};

export async function isEducationProject(accountId, projectId) {
  if (!accountId || !projectId) return false;
  const project = await Project.findOne({ accountId, projectId }).select('vertical').lean();
  return project?.vertical === 'education';
}

async function resolveCourse(accountId, projectId, mapped = {}, explicitCourseId = '') {
  const candidateId = normalizeString(
    explicitCourseId ||
    mapped.courseId
  );
  const candidateTitle = normalizeString(mapped.course);

  if (candidateId) {
    const byId = await Course.findOne({ _id: candidateId, accountId, projectId }).lean().catch(() => null);
    if (byId) return byId;
  }

  if (candidateTitle) {
    return Course.findOne({
      accountId,
      projectId,
      name: { $regex: `^${candidateTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    }).lean();
  }

  return null;
}

async function resolveBatch(accountId, projectId, mapped = {}, courseId = '', explicitBatchId = '') {
  const candidateId = normalizeString(
    explicitBatchId ||
    mapped.batchId
  );
  const candidateTitle = normalizeString(mapped.batch);

  if (candidateId) {
    const byId = await Batch.findOne({ _id: candidateId, accountId, projectId }).lean().catch(() => null);
    if (byId) return byId;
  }

  if (candidateTitle) {
    return Batch.findOne({
      accountId,
      projectId,
      ...(courseId ? { courseId } : {}),
      name: { $regex: `^${candidateTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    }).lean();
  }

  return null;
}

export async function upsertEducationEnquiry({
  accountId,
  projectId,
  phone,
  name,
  email,
  notes,
  tags,
  status,
  source,
  responses,
  courseId,
  batchId,
  fees,
  workflowSessionId,
  chatbotId,
}) {
  if (!accountId || !projectId) return null;
  if (!(await isEducationProject(accountId, projectId))) return null;

  const safeResponses = responseObject(responses);
  const incomingMapped = mappedResponses(safeResponses);
  const cleanPhone = normalizePhone(phone || incomingMapped.phone);
  if (!cleanPhone) return null;

  const existingEnquiry = await findExistingEnquiry({
    accountId,
    projectId,
    workflowSessionId,
    cleanPhone,
    enquiryId: safeResponses.educationEnquiryId,
  });
  const existingMetadata = responseObject(existingEnquiry?.metadata);
  const existingResponses = responseObject(existingMetadata.responses);
  const incomingResponseCount = responseKeyCount(safeResponses);
  const existingResponseCount = responseKeyCount(existingResponses);
  const existingSourceRank = sourceRank(existingEnquiry?.source || existingMetadata.source);
  const incomingSourceRank = sourceRank(source || 'Education Enquiry');
  const shouldUseIncomingResponses = incomingResponseCount > 0;
  const finalResponses = shouldUseIncomingResponses || existingResponseCount === 0
    ? safeResponses
    : existingResponses;
  const finalMapped = mappedResponses(finalResponses);
  const finalUnmappedResponses = unmappedResponses(finalResponses);
  const hasMappedCourse = Boolean(finalMapped.courseId || finalMapped.course);
  const hasMappedBatch = Boolean(finalMapped.batchId || finalMapped.batch);

  let resolvedCourse = await resolveCourse(
    accountId,
    projectId,
    finalMapped,
    courseId || (!hasMappedCourse ? existingEnquiry?.courseId : '')
  );
  const resolvedBatch = await resolveBatch(
    accountId,
    projectId,
    finalMapped,
    resolvedCourse?._id,
    batchId || (!hasMappedBatch ? existingEnquiry?.batchId : '')
  );
  if (!resolvedCourse && resolvedBatch?.courseId) {
    resolvedCourse = await Course.findOne({
      _id: resolvedBatch.courseId,
      accountId,
      projectId,
    }).lean().catch(() => null);
  }
  const finalCourseId = resolvedCourse?._id || resolvedBatch?.courseId || undefined;
  const finalBatchId = resolvedBatch?._id || undefined;
  const explicitName = cleanExplicitValue(name);
  const explicitEmail = cleanExplicitValue(email);
  const explicitNotes = cleanExplicitValue(notes);
  const prefersMappedIdentity = String(source || '').toLowerCase().includes('chatbot');
  const explicitFees = cleanExplicitValue(fees);
  const finalName = normalizeString(
    (prefersMappedIdentity ? finalMapped.name : explicitName) ||
    (prefersMappedIdentity ? explicitName : finalMapped.name) ||
    cleanExplicitValue(existingEnquiry?.name) ||
    cleanPhone
  );
  const finalEmail = normalizeString(
    explicitEmail || finalMapped.email || cleanExplicitValue(existingEnquiry?.email)
  );
  const shouldUnsetEmail = Boolean(existingEnquiry?.email && !finalEmail);
  const courseFees = resolvedCourse?.fees;
  const finalFees = explicitFees || finalMapped.fees || (courseFees !== undefined ? courseFees : existingEnquiry?.fees);
  const numericFees = finalFees !== '' && finalFees !== undefined ? Number(finalFees) : undefined;
  const incomingNotes = [
    explicitNotes,
    normalizeString(finalMapped.notes),
  ].filter(Boolean).join('\n');
  const shouldReplaceNotes =
    !existingEnquiry?.notes ||
    incomingSourceRank >= existingSourceRank ||
    incomingResponseCount >= existingResponseCount;
  const finalNotes = shouldReplaceNotes ? (incomingNotes || existingEnquiry?.notes || '') : existingEnquiry.notes;

  const contact = await Contact.findOne({
    accountId,
    projectId,
    $or: [
      { whatsappNumber: cleanPhone },
      { phone: cleanPhone },
    ],
  }).select('_id').lean();

  const lookup = existingEnquiry?._id
    ? { _id: existingEnquiry._id, accountId, projectId }
    : { accountId, projectId, phone: cleanPhone };
  const finalSource = incomingSourceRank >= existingSourceRank
    ? (source || existingEnquiry?.source || 'Education Enquiry')
    : (existingEnquiry?.source || source || 'Education Enquiry');
  const finalMetadata = mergeMetadata(existingMetadata, {
    ...(workflowSessionId ? { workflowSessionId: String(workflowSessionId) } : {}),
    ...(chatbotId ? { chatbotId: String(chatbotId) } : {}),
    source: finalSource,
    responses: finalResponses,
    mappedResponses: finalMapped,
    unmappedResponses: finalUnmappedResponses,
  });
  const cleanTags = normalizeTags(tags);

  const enquiry = await Enquiry.findOneAndUpdate(
    lookup,
    {
      $set: {
        ...(contact?._id ? { contactId: contact._id } : {}),
        name: finalName,
        ...(finalEmail ? { email: finalEmail } : {}),
        phone: cleanPhone,
        ...(finalCourseId ? { courseId: finalCourseId } : {}),
        ...(finalBatchId ? { batchId: finalBatchId } : {}),
        ...(Number.isFinite(numericFees) ? { fees: numericFees } : {}),
        notes: finalNotes,
        source: finalSource,
        status: status || existingEnquiry?.status || 'new',
        chatbotResponses: finalResponses,
        metadata: finalMetadata,
      },
      ...(shouldUnsetEmail ? { $unset: { email: '' } } : {}),
      ...(cleanTags.length ? { $addToSet: { tags: { $each: cleanTags } } } : {}),
      $setOnInsert: {
        accountId,
        projectId,
      },
    },
    { returnDocument: 'after', upsert: true, runValidators: true }
  );

  if (workflowSessionId && enquiry?._id) {
    await Enquiry.deleteMany({
      accountId,
      projectId,
      phone: cleanPhone,
      _id: { $ne: enquiry._id },
      source: 'WhatsApp inbound',
      $or: [
        { 'metadata.workflowSessionId': { $exists: false } },
        { 'metadata.workflowSessionId': null },
        { 'metadata.workflowSessionId': '' },
      ],
      'metadata.responses.firstInboundMessage': { $exists: true },
    });
  }

  logger.info('✅ Education enquiry synced', {
    accountId,
    projectId,
    enquiryId: String(enquiry._id),
    source,
  });

  return enquiry;
}

export default {
  isEducationProject,
  upsertEducationEnquiry,
};
