import express from 'express';
import Project from '../models/Project.js';
import Patient from '../models/Patient.js';
import Lab from '../models/Lab.js';
import LabTest from '../models/LabTest.js';
import LabOrder from '../models/LabOrder.js';
import LabReport from '../models/LabReport.js';
import { sendSuccess, sendNotFound, sendValidationError } from '../utils/responseHandler.js';
import { handleControllerError, NotFoundError, ValidationError } from '../utils/errorHandler.js';

const router = express.Router();

const getAccountId = (req) => req.user?.accountId || req.account?.accountId || null;
const getProjectId = (req) => req.query?.projectId || req.body?.projectId || req.params?.projectId || null;
const getActor = (req) => req.user?.email || req.user?.name || req.user?.accountId || 'system';

const buildScopeFilter = ({ accountId, projectId }) => (
  projectId ? { accountId, projectId } : { accountId }
);

const parsePagination = (req) => {
  const page = Math.max(Number(req.query?.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query?.limit) || 20, 1), 200);
  return { page, limit, skip: (page - 1) * limit };
};

async function resolveScope(req, { requireProject = false } = {}) {
  const accountId = getAccountId(req);
  const projectId = getProjectId(req);

  if (!accountId) {
    throw new ValidationError('Account context is missing');
  }

  if (requireProject && !projectId) {
    throw new ValidationError('projectId is required');
  }

  if (!projectId) {
    return { accountId, projectId: null, project: null };
  }

  const project = await Project.findOne({
    accountId,
    projectId,
    status: 'active',
    vertical: 'pathology',
  }).select('projectId name status vertical');

  if (!project) {
    throw new NotFoundError('Pathology project not found or inactive');
  }

  return { accountId, projectId, project };
}

router.get('/lab/:projectId', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const lab = await Lab.findOne({ accountId: scope.accountId, projectId: scope.projectId }).lean();

    if (!lab) {
      return sendNotFound(res, 'Lab');
    }

    return sendSuccess(res, { lab }, 'Lab retrieved');
  } catch (error) {
    if (error instanceof ValidationError) return sendValidationError(res, error.message);
    return handleControllerError(res, error, 'getLab');
  }
});

router.put('/lab/:projectId', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const payload = { ...req.body };
    delete payload.accountId;
    delete payload.projectId;
    delete payload.labId;

    const lab = await Lab.findOneAndUpdate(
      { accountId: scope.accountId, projectId: scope.projectId },
      {
        $set: {
          ...payload,
          updatedBy: getActor(req),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return sendSuccess(res, { lab }, 'Lab updated');
  } catch (error) {
    if (error instanceof ValidationError) return sendValidationError(res, error.message);
    return handleControllerError(res, error, 'updateLab');
  }
});

router.get('/overview', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const filter = buildScopeFilter(scope);

    const [patientCount, testCount, orderCount, reportCount, pendingOrders] = await Promise.all([
      Patient.countDocuments(filter),
      LabTest.countDocuments({ ...filter, status: 'active' }),
      LabOrder.countDocuments(filter),
      LabReport.countDocuments(filter),
      LabOrder.countDocuments({ ...filter, status: { $in: ['requested', 'scheduled', 'collected', 'processing'] } }),
    ]);

    return sendSuccess(res, {
      counts: {
        patients: patientCount,
        tests: testCount,
        orders: orderCount,
        reports: reportCount,
        pendingOrders,
      },
    }, 'Pathology overview');
  } catch (error) {
    if (error instanceof ValidationError) return sendValidationError(res, error.message);
    return handleControllerError(res, error, 'pathologyOverview');
  }
});

router.get('/tests', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const { page, limit, skip } = parsePagination(req);
    const filter = { ...buildScopeFilter(scope), ...(req.query?.status ? { status: req.query.status } : {}) };

    const [tests, total] = await Promise.all([
      LabTest.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      LabTest.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      tests,
      pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    }, 'Lab tests retrieved');
  } catch (error) {
    if (error instanceof ValidationError) return sendValidationError(res, error.message);
    return handleControllerError(res, error, 'listLabTests');
  }
});

router.post('/tests', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const test = await LabTest.create({
      accountId: scope.accountId,
      projectId: scope.projectId,
      name: req.body?.name,
      code: req.body?.code || null,
      category: req.body?.category || 'general',
      price: Number(req.body?.price) || 0,
      fastingRequired: Boolean(req.body?.fastingRequired),
      turnaroundHours: Number(req.body?.turnaroundHours) || 24,
      createdBy: getActor(req),
      updatedBy: getActor(req),
    });

    return sendSuccess(res, { test }, 'Lab test created', 201);
  } catch (error) {
    if (error instanceof ValidationError) return sendValidationError(res, error.message);
    return handleControllerError(res, error, 'createLabTest');
  }
});

router.get('/orders', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const { page, limit, skip } = parsePagination(req);
    const filter = {
      ...buildScopeFilter(scope),
      ...(req.query?.status ? { status: req.query.status } : {}),
      ...(req.query?.patientId ? { patientId: req.query.patientId } : {}),
    };

    const [orders, total] = await Promise.all([
      LabOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      LabOrder.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      orders,
      pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    }, 'Lab orders retrieved');
  } catch (error) {
    if (error instanceof ValidationError) return sendValidationError(res, error.message);
    return handleControllerError(res, error, 'listLabOrders');
  }
});

router.post('/orders', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const patientId = req.body?.patientId;
    if (!patientId) {
      return sendValidationError(res, 'patientId is required');
    }

    const patient = await Patient.findOne({ ...buildScopeFilter(scope), patientId });
    if (!patient) {
      return sendNotFound(res, 'Patient');
    }

    const order = await LabOrder.create({
      accountId: scope.accountId,
      projectId: scope.projectId,
      patientId: patient.patientId,
      patientSnapshot: {
        entityId: patient.patientId,
        fullName: patient.fullName,
        phoneNumber: patient.phoneNumber || patient.whatsappNumber || null,
      },
      testIds: Array.isArray(req.body?.testIds) ? req.body.testIds : [],
      collectionAt: req.body?.collectionAt ? new Date(req.body.collectionAt) : null,
      collectionType: req.body?.collectionType || 'walk-in',
      status: req.body?.status || 'scheduled',
      bookingSource: req.body?.bookingSource || 'manual',
      queueStatus: req.body?.queueStatus || 'none',
      notes: req.body?.notes || '',
      createdBy: getActor(req),
      updatedBy: getActor(req),
    });

    return sendSuccess(res, { order }, 'Lab order created', 201);
  } catch (error) {
    if (error instanceof ValidationError) return sendValidationError(res, error.message);
    return handleControllerError(res, error, 'createLabOrder');
  }
});

router.get('/patients', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const { page, limit, skip } = parsePagination(req);

    const filter = buildScopeFilter(scope);
    const [patients, total] = await Promise.all([
      Patient.find(filter).sort({ updatedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Patient.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      patients,
      pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    }, 'Patients retrieved');
  } catch (error) {
    if (error instanceof ValidationError) return sendValidationError(res, error.message);
    return handleControllerError(res, error, 'listPathologyPatients');
  }
});

router.get('/reports', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const { page, limit, skip } = parsePagination(req);
    const filter = {
      ...buildScopeFilter(scope),
      ...(req.query?.status ? { status: req.query.status } : {}),
    };

    const [reports, total] = await Promise.all([
      LabReport.find(filter).sort({ reportDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      LabReport.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      reports,
      pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    }, 'Lab reports retrieved');
  } catch (error) {
    if (error instanceof ValidationError) return sendValidationError(res, error.message);
    return handleControllerError(res, error, 'listLabReports');
  }
});

export default router;
