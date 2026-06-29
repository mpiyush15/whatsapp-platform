import { sendSuccess, sendForbidden } from '../utils/responseHandler.js';
import { handleControllerError } from '../utils/errorHandler.js';
import systemHealthService from '../services/systemHealthService.js';

export async function getObservability(req, res) {
  try {
    const data = await systemHealthService.getObservabilitySnapshot(req);
    return sendSuccess(res, data, 'System health snapshot');
  } catch (error) {
    if (error.statusCode === 403) {
      return sendForbidden(res, 'Only superadmins can view system health');
    }
    return handleControllerError(res, error, 'getObservability');
  }
}

export default { getObservability };
