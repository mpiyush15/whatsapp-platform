import Enquiry from '../../models/Enquiry.js';
import Contact from '../../models/Contact.js';
import Batch from '../../models/Batch.js';
import Course from '../../models/Course.js';
import { handleControllerError } from '../../utils/errorHandler.js';

const accountIdFromReq = (req) => req.account?.accountId || req.user?.accountId;
const projectIdFromReq = (req) => req.query?.projectId || req.body?.projectId || req.params?.projectId;
const normalizeTags = (tags = []) => Array.from(new Set(
  (Array.isArray(tags) ? tags : String(tags || '').split(','))
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)
));
const normalizeStudentDetails = (details = {}) => ({
  parentName: String(details.parentName || '').trim(),
  parentPhone: String(details.parentPhone || '').replace(/[\s+()-]/g, ''),
  address: String(details.address || '').trim(),
  tenthMarks: String(details.tenthMarks || '').trim(),
});

const buildStats = (enquiries = []) => {
  const stats = { total: enquiries.length, new: 0, contacted: 0, admitted: 0, dropped: 0, paid: 0, pendingFees: 0 };
  enquiries.forEach((enquiry) => {
    if (Object.prototype.hasOwnProperty.call(stats, enquiry.status)) stats[enquiry.status] += 1;
    const paid = (enquiry.paymentLogs || []).reduce((sum, log) => sum + Number(log.amount || 0), 0);
    stats.paid += paid;
    stats.pendingFees += Math.max(0, Number(enquiry.fees || 0) - paid);
  });
  return stats;
};

const getEnquiryRows = async ({ accountId, projectId, status, search, tag, source }) => {
  const query = { accountId, projectId };
  if (status && status !== 'all') query.status = status;
  if (tag && tag !== 'all') query.tags = tag;
  if (search) {
    const regex = { $regex: String(search), $options: 'i' };
    query.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { notes: regex },
      { tags: regex },
    ];
  }

  let rows = await Enquiry.find(query)
    .populate('courseId batchId')
    .populate('contactId', 'source firstContactAt lastMessageAt messageCount engagementScore')
    .sort({ createdAt: -1 });

  if (source && source !== 'all') {
    rows = rows.filter((enquiry) => (enquiry.source || enquiry.contactId?.source || 'Manual') === source);
  }

  return rows;
};

export const createEnquiry = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const projectId = projectIdFromReq(req);
    const { name, email, phone, courseId, batchId, fees, notes, tags, status, studentDetails, source } = req.body;
    const cleanCourseId = courseId || undefined;
    const cleanBatchId = batchId || undefined;

    if (!accountId || !projectId) {
      return res.status(400).json({ success: false, message: 'Project context is required' });
    }

    const cleanPhone = String(phone || '').replace(/[\s+()-]/g, '');
    if (!cleanPhone) {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    if (cleanCourseId) {
      const course = await Course.findOne({ _id: cleanCourseId, accountId, projectId });
      if (!course) {
        return res.status(400).json({ success: false, message: 'Course not found for this project' });
      }
    }

    if (cleanBatchId) {
      const batch = await Batch.findOne({ _id: cleanBatchId, accountId, projectId, ...(cleanCourseId ? { courseId: cleanCourseId } : {}) });
      if (!batch) {
        return res.status(400).json({ success: false, message: 'Batch not found for this project' });
      }
    }

    const contact = await Contact.findOne({
      accountId,
      projectId,
      $or: [
        { whatsappNumber: cleanPhone },
        { phone: cleanPhone },
      ],
    }).select('_id').lean();

    const enquiry = new Enquiry({
      accountId,
      projectId,
      ...(contact?._id ? { contactId: contact._id } : {}),
      name,
      email,
      phone: cleanPhone,
      courseId: cleanCourseId,
      batchId: cleanBatchId,
      fees,
      notes,
      tags: normalizeTags(tags),
      studentDetails: normalizeStudentDetails(studentDetails),
      source: String(source || 'Manual').trim() || 'Manual',
      status
    });

    await enquiry.save();
    res.status(201).json({ success: true, data: enquiry });
  } catch (error) {
    handleControllerError(res, error, 'createEnquiry');
  }
};

export const getEnquiries = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const projectId = projectIdFromReq(req);
    if (!accountId || !projectId) {
      return res.status(400).json({ success: false, message: 'Project context is required' });
    }

    const enquiries = await getEnquiryRows({
      accountId,
      projectId,
      status: req.query.status,
      search: req.query.search,
      tag: req.query.tag,
      source: req.query.source,
    });
    const stats = buildStats(enquiries);
    res.status(200).json({ success: true, data: enquiries, enquiries, stats });
  } catch (error) {
    handleControllerError(res, error, 'getEnquiries');
  }
};

export const getEnquiry = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const projectId = projectIdFromReq(req);
    if (!accountId || !projectId) {
      return res.status(400).json({ success: false, message: 'Project context is required' });
    }

    const enquiry = await Enquiry.findOne({ _id: req.params.id, accountId, projectId })
      .populate('courseId batchId')
      .populate('contactId', 'source firstContactAt lastMessageAt messageCount engagementScore');
    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }
    res.status(200).json({ success: true, data: enquiry });
  } catch (error) {
    handleControllerError(res, error, 'getEnquiry');
  }
};

export const updateEnquiry = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const projectId = projectIdFromReq(req);
    const { name, email, phone, courseId, batchId, fees, notes, tags, status, studentDetails, source } = req.body;
    const hasCourseId = Object.prototype.hasOwnProperty.call(req.body, 'courseId');
    const hasBatchId = Object.prototype.hasOwnProperty.call(req.body, 'batchId');
    const cleanCourseId = courseId || undefined;
    const cleanBatchId = batchId || undefined;

    if (!accountId || !projectId) {
      return res.status(400).json({ success: false, message: 'Project context is required' });
    }

    if (cleanCourseId) {
      const course = await Course.findOne({ _id: cleanCourseId, accountId, projectId });
      if (!course) {
        return res.status(400).json({ success: false, message: 'Course not found for this project' });
      }
    }

    if (cleanBatchId) {
      const batch = await Batch.findOne({ _id: cleanBatchId, accountId, projectId, ...(cleanCourseId ? { courseId: cleanCourseId } : {}) });
      if (!batch) {
        return res.status(400).json({ success: false, message: 'Batch not found for this project' });
      }
    }

    const enquiry = await Enquiry.findOneAndUpdate(
      { _id: req.params.id, accountId, projectId },
      {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(phone !== undefined ? { phone: String(phone || '').replace(/[\s+()-]/g, '') } : {}),
        ...(hasCourseId ? { courseId: cleanCourseId || null } : {}),
        ...(hasBatchId ? { batchId: cleanBatchId || null } : {}),
        ...(fees !== undefined ? { fees } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(tags !== undefined ? { tags: normalizeTags(tags) } : {}),
        ...(studentDetails !== undefined ? { studentDetails: normalizeStudentDetails(studentDetails) } : {}),
        ...(source !== undefined ? { source: String(source || 'Manual').trim() || 'Manual' } : {}),
        ...(status !== undefined ? { status } : {}),
      },
      { new: true, runValidators: true }
    ).populate('courseId batchId').populate('contactId', 'source firstContactAt lastMessageAt messageCount engagementScore');

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }
    res.status(200).json({ success: true, data: enquiry });
  } catch (error) {
    handleControllerError(res, error, 'updateEnquiry');
  }
};

export const exportEnquiries = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const projectId = projectIdFromReq(req);
    if (!accountId || !projectId) {
      return res.status(400).json({ success: false, message: 'Project context is required' });
    }

    const enquiries = await getEnquiryRows({
      accountId,
      projectId,
      status: req.query.status,
      search: req.query.search,
      tag: req.query.tag,
      source: req.query.source,
    });
    const header = 'name,email,phone,status,source,parentName,parentPhone,address,tenthMarks,course,batch,fees,paid,pending,tags,notes,createdAt\n';
    const rows = enquiries.map((enquiry) => {
      const paid = (enquiry.paymentLogs || []).reduce((sum, log) => sum + Number(log.amount || 0), 0);
      const pending = Math.max(0, Number(enquiry.fees || 0) - paid);
      return [
        enquiry.name,
        enquiry.email || '',
        enquiry.phone || '',
        enquiry.status,
        enquiry.source || enquiry.contactId?.source || 'Manual',
        enquiry.studentDetails?.parentName || '',
        enquiry.studentDetails?.parentPhone || '',
        enquiry.studentDetails?.address || '',
        enquiry.studentDetails?.tenthMarks || '',
        enquiry.courseId?.name || '',
        enquiry.batchId?.name || '',
        enquiry.fees || '',
        paid,
        pending,
        (enquiry.tags || []).join('|'),
        enquiry.notes || '',
        enquiry.createdAt?.toISOString?.() || enquiry.createdAt || '',
      ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',');
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=education-enquiries.csv');
    return res.send(header + rows);
  } catch (error) {
    handleControllerError(res, error, 'exportEnquiries');
  }
};

export const deleteEnquiry = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const projectId = projectIdFromReq(req);
    if (!accountId || !projectId) {
      return res.status(400).json({ success: false, message: 'Project context is required' });
    }

    const enquiry = await Enquiry.findOneAndDelete({ _id: req.params.id, accountId, projectId });

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }
    res.status(200).json({ success: true, data: { message: 'Enquiry deleted successfully' } });
  } catch (error) {
    handleControllerError(res, error, 'deleteEnquiry');
  }
};

export const addPaymentLog = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const projectId = projectIdFromReq(req);
    const { amount, date, method, notes } = req.body;

    if (!accountId || !projectId) {
      return res.status(400).json({ success: false, message: 'Project context is required' });
    }

    const enquiry = await Enquiry.findOne({ _id: req.params.id, accountId, projectId });
    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    enquiry.paymentLogs.push({ amount, date, method, notes });
    await enquiry.save();

    res.status(200).json({ success: true, data: enquiry });
  } catch (error) {
    handleControllerError(res, error, 'addPaymentLog');
  }
};
