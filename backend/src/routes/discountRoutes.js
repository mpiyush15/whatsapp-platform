import express from 'express';
import logger from '../utils/logger.js';
import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
import {
  getAllDiscounts,
  getDiscountByPlan,
  updateDiscount,
  resetDiscount,
  getDiscountHistory,
  exportDiscounts
} from '../controllers/discountController.js';

const router = express.Router();

// Get all discount configurations
router.get('/', getAllDiscounts);

// Get discount for a specific plan
router.get('/plan/:planId', getDiscountByPlan);

// Update discount for a plan
router.post('/plan/:planId', updateDiscount);

// Reset discount to defaults
router.delete('/plan/:planId', resetDiscount);

// Get update history for a plan
router.get('/history/:planId', getDiscountHistory);

// Export all discounts as CSV
router.get('/export/csv', exportDiscounts);

export default router;
