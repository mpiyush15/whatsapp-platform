import frontdeskService from '../services/healthcareFrontdeskService.js';
import { sendNotFound, sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import { NotFoundError, ValidationError, handleControllerError } from '../utils/errorHandler.js';

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

async function getQueue(req, res) {
  try {
    const scope = resolveScope(req, { requireProject: true });
    const payload = await frontdeskService.getQueueBoard(scope, {
      date: req.query?.date,
      status: req.query?.status,
      doctorId: req.query?.doctorId,
      limit: req.query?.limit,
    });

    return sendSuccess(res, payload, 'Front desk queue retrieved');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'getFrontdeskQueue');
  }
}

async function updateAppointmentStatus(req, res) {
  try {
    const scope = resolveScope(req, { requireProject: true });
    const status = String(req.body?.status || '').trim();

    if (!status) {
      return sendValidationError(res, 'status is required');
    }

    const payload = await frontdeskService.updateQueueStatus(scope, {
      appointmentId: req.params.appointmentId,
      status,
      actor: getActor(req),
      sendWhatsApp: req.body?.sendWhatsApp !== false,
    });

    return sendSuccess(res, payload, 'Front desk appointment status updated');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Appointment');
    }
    return handleControllerError(res, error, 'updateFrontdeskAppointmentStatus');
  }
}

async function sendReminder(req, res) {
  try {
    const scope = resolveScope(req, { requireProject: true });
    const payload = await frontdeskService.sendAppointmentReminder(scope, {
      appointmentId: req.params.appointmentId,
    });

    return sendSuccess(res, payload, 'Appointment reminder trigger executed');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Appointment');
    }
    return handleControllerError(res, error, 'sendFrontdeskAppointmentReminder');
  }
}

export default {
  getQueue,
  updateAppointmentStatus,
  sendReminder,
};
