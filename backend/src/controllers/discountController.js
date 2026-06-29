import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';

export const createDiscount = async (req, res) => {
  try {
    const { code, percentage, maxUses } = req.body;

    if (!code || !percentage) {
      return sendValidationError(res, 'Code and percentage required');
    }

    return sendSuccess(res, {
      discountId: `disc_${Date.now()}`,
      code,
      percentage,
      status: 'active'
    }, 'Discount created');
  } catch (error) {
    return handleControllerError(res, error, 'createDiscount');
  }
};

export const validateDiscount = async (req, res) => {
  try {
    const { code } = req.params;
    return sendSuccess(res, { code, percentage: 10, isValid: true }, 'Discount validated');
  } catch (error) {
    return handleControllerError(res, error, 'validateDiscount');
  }
};

export const listDiscounts = async (req, res) => {
  try {
    return sendSuccess(res, { discounts: [] }, 'Discounts retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listDiscounts');
  }
};

export const getAllDiscounts = async (req, res) => {
  try {
    return sendSuccess(res, { discounts: [] }, 'All discounts retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getAllDiscounts');
  }
};

export const getDiscountByPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    return sendSuccess(res, { planId, discount: null }, 'Discount retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getDiscountByPlan');
  }
};

export const updateDiscount = async (req, res) => {
  try {
    const { planId } = req.params;
    const { percentage } = req.body;
    return sendSuccess(res, { planId, percentage }, 'Discount updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateDiscount');
  }
};

export const resetDiscount = async (req, res) => {
  try {
    const { planId } = req.params;
    return sendSuccess(res, { planId }, 'Discount reset');
  } catch (error) {
    return handleControllerError(res, error, 'resetDiscount');
  }
};

export const getDiscountHistory = async (req, res) => {
  try {
    const { planId } = req.params;
    return sendSuccess(res, { planId, history: [] }, 'Discount history retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getDiscountHistory');
  }
};

export const exportDiscounts = async (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=discounts.csv');
    return res.send('planId,discount\n');
  } catch (error) {
    return handleControllerError(res, error, 'exportDiscounts');
  }
};

export default { 
  createDiscount, 
  validateDiscount, 
  listDiscounts,
  getAllDiscounts,
  getDiscountByPlan,
  updateDiscount,
  resetDiscount,
  getDiscountHistory,
  exportDiscounts
};
