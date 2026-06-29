import historyService from '../services/healthcarePatientHistoryService.js';
import { sendNotFound, sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import { NotFoundError, ValidationError, handleControllerError } from '../utils/errorHandler.js';

const getAccountId = (req) => req.user?.accountId || req.account?.accountId || null;
const getProjectId = (req) => req.query?.projectId || req.body?.projectId || req.projectId || null;

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

async function getPatientHistory(req, res) {
  try {
    const scope = resolveScope(req, { requireProject: true });
    const payload = await historyService.getPatientHistory(scope, req.params.patientId);
    return sendSuccess(res, payload, 'Patient history retrieved');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Patient');
    }
    return handleControllerError(res, error, 'getHealthcarePatientHistory');
  }
}

export default {
  getPatientHistory,
};
