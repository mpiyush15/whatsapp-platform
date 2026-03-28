import logger from '../utils/logger.js';
import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * Session Authentication Middleware
 * For dashboard users - uses sessions, NOT API keys
 */

export const requireSession = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login.',
      redirectTo: '/login'
    });
  }
  
  // Inject user info into request
  req.accountId = req.session.user.accountId;
  req.user = req.session.user;
  
  next();
};

export default requireSession;
