import staffService from '../services/healthcareStaffService.js';
import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import { NotFoundError, ValidationError, handleControllerError } from '../utils/errorHandler.js';
import { isMongoDuplicateKey } from '../utils/mongoErrors.js';
import logger from '../utils/logger.js';

const getAccountId = (req) => req.user?.accountId || req.account?.accountId || null;
const getProjectId = (req) => req.query?.projectId || req.body?.projectId || req.projectId || null;
const getActor = (req) => req.user?.email || req.user?.name || req.user?.accountId || 'system';

function resolveScope(req, { requireProject = false } = {}) {
  const accountId = getAccountId(req);
  const projectId = getProjectId(req);

  if (!accountId) {
    throw new ValidationError('Account context is missing');
  }

  if (requireProject && !projectId) {
    throw new ValidationError('projectId is required');
  }

  return { accountId, projectId: projectId || null };
}

async function listNurses(req, res) {
  try {
    const scope = resolveScope(req);
    const payload = await staffService.listNurses(scope, {
      q: req.query?.q,
      status: req.query?.status,
      limit: req.query?.limit,
    });
    return sendSuccess(res, payload, 'Nurses retrieved');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'listHealthcareNurses');
  }
}

async function createNurse(req, res) {
  try {
    const scope = resolveScope(req, { requireProject: true });
    const payload = await staffService.createNurse(scope, req.body, getActor(req));
    return sendSuccess(res, payload, 'Nurse created', 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'createHealthcareNurse');
  }
}

async function listStaffMembers(req, res) {
  try {
    const scope = resolveScope(req, { requireProject: true });
    const payload = await staffService.listStaffMembers(scope, {
      q: req.query?.q,
      role: req.query?.role,
      status: req.query?.status,
      limit: req.query?.limit,
    });
    return sendSuccess(res, payload, 'Staff retrieved');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'listHealthcareStaffMembers');
  }
}

async function createStaffMember(req, res) {
  try {
    const scope = resolveScope(req, { requireProject: true });
    const payload = await staffService.createStaffMember(scope, req.body, getActor(req));
    return sendSuccess(res, payload, 'Staff member created', 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    if (isMongoDuplicateKey(error)) {
      logger.warn('[createStaffMember] duplicate key after retries:', error?.message);
      return sendValidationError(
        res,
        'Could not save this staff row due to a database uniqueness conflict (often a quick double-submit or an old unique index). Try once more, refresh the staff list, or use a different email if this address already has a login.'
      );
    }
    return handleControllerError(res, error, 'createHealthcareStaffMember');
  }
}

async function updateStaffMember(req, res) {
  try {
    const scope = resolveScope(req, { requireProject: true });
    const staffId = req.params?.staffId;
    const payload = await staffService.updateStaffMember(scope, staffId, req.body, getActor(req));
    return sendSuccess(res, payload, 'Staff member updated');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Staff member');
    }
    return handleControllerError(res, error, 'updateHealthcareStaffMember');
  }
}

async function syncDoctors(req, res) {
  try {
    const scope = resolveScope(req, { requireProject: true });
    const payload = await staffService.syncExistingDoctors(scope);
    return sendSuccess(res, payload, 'Doctors synced to staff');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'syncHealthcareDoctorsToStaff');
  }
}

export default {
  listNurses,
  createNurse,
  listStaffMembers,
  createStaffMember,
  updateStaffMember,
  syncDoctors,
};
