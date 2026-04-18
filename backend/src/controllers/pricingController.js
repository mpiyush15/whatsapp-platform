import { sendSuccess } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError, NotFoundError, ValidationError, ConflictError } from '../utils/errorHandler.js';
import PricingPlan from '../models/PricingPlan.js';
import DiscountOffer from '../models/DiscountOffer.js';

/**
 * PRICING PLANS - Public Routes
 */

export const getPublicPricingPlans = async (req, res) => {
  try {
    const plans = await PricingPlan.find({
      isActive: true,
      publishedToPublic: true
    }).select('-updatedBy -__v');

    return sendSuccess(res, {
      data: plans,
      count: plans.length
    }, 'Public pricing plans retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getPublicPricingPlans');
  }
};

export const getPricingPlanDetails = async (req, res) => {
  try {
    const { planId } = req.params;
    
    const plan = await PricingPlan.findById(planId);
    if (!plan) {
      throw new NotFoundError('Pricing plan not found');
    }

    if (!plan.isActive || !plan.publishedToPublic) {
      throw new NotFoundError('This plan is not available');
    }

    return sendSuccess(res, { data: plan }, 'Pricing plan details retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getPricingPlanDetails');
  }
};

/**
 * PRICING PLANS - Admin Routes (Superadmin only)
 */

export const getAllPricingPlans = async (req, res) => {
  try {
    const plans = await PricingPlan.find({})
      .sort({ createdAt: -1 })
      .select('-__v');

    return sendSuccess(res, {
      data: plans,
      count: plans.length
    }, 'All pricing plans retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getAllPricingPlans');
  }
};

export const getPlanById = async (req, res) => {
  try {
    const { planId } = req.params;
    
    const plan = await PricingPlan.findById(planId);
    if (!plan) {
      throw new NotFoundError('Pricing plan not found');
    }

    return sendSuccess(res, { data: plan }, 'Pricing plan retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getPlanById');
  }
};

export const createPricingPlan = async (req, res) => {
  try {
    const { name, monthlyPrice, yearlyPrice, setupFee, signupCredits, monthlyCredits, features, description, publishedToPublic, isPopular, isActive } = req.body;

    // Validation
    if (!name || monthlyPrice === undefined || yearlyPrice === undefined) {
      throw new ValidationError('Name, monthly price, and yearly price are required');
    }

    // Check duplicate
    const existing = await PricingPlan.findOne({ name });
    if (existing) {
      throw new ConflictError('Plan with this name already exists');
    }

    const plan = new PricingPlan({
      planId: `plan_${name.toLowerCase()}_${Date.now()}`,
      name,
      monthlyPrice,
      yearlyPrice,
      setupFee: setupFee || 0,
      signupCredits: signupCredits || 0,
      monthlyCredits: monthlyCredits || 0,
      description: description || '',
      features: features || { included: [], excluded: [] },
      publishedToPublic: publishedToPublic !== undefined ? publishedToPublic : true,
      isPopular: isPopular || false,
      isActive: isActive !== undefined ? isActive : true
    });

    await plan.save();
    logger.info(`Plan created: ${name}`);

    return sendSuccess(res, { data: plan }, 'Pricing plan created successfully', 201);
  } catch (error) {
    return handleControllerError(res, error, 'createPricingPlan');
  }
};

export const updatePricingPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const updates = req.body;

    // Don't allow updating planId
    delete updates.planId;

    const plan = await PricingPlan.findByIdAndUpdate(
      planId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!plan) {
      throw new NotFoundError('Pricing plan not found');
    }

    logger.info(`Plan updated: ${plan.name}`);
    return sendSuccess(res, { data: plan }, 'Pricing plan updated successfully');
  } catch (error) {
    return handleControllerError(res, error, 'updatePricingPlan');
  }
};

export const deletePricingPlan = async (req, res) => {
  try {
    const { planId } = req.params;

    const plan = await PricingPlan.findByIdAndDelete(planId);
    if (!plan) {
      throw new NotFoundError('Pricing plan not found');
    }

    logger.info(`Plan deleted: ${plan.name}`);
    return sendSuccess(res, { data: { _id: plan._id } }, 'Pricing plan deleted successfully');
  } catch (error) {
    return handleControllerError(res, error, 'deletePricingPlan');
  }
};

export const suspendPlan = async (req, res) => {
  try {
    const { planId } = req.params;

    const plan = await PricingPlan.findByIdAndUpdate(
      planId,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!plan) {
      throw new NotFoundError('Pricing plan not found');
    }

    logger.info(`Plan suspended: ${plan.name}`);
    return sendSuccess(res, { data: plan }, 'Pricing plan suspended');
  } catch (error) {
    return handleControllerError(res, error, 'suspendPlan');
  }
};

export const publishPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const { publishedToPublic } = req.body;

    const plan = await PricingPlan.findByIdAndUpdate(
      planId,
      { publishedToPublic, updatedAt: new Date() },
      { new: true }
    );

    if (!plan) {
      throw new NotFoundError('Pricing plan not found');
    }

    logger.info(`Plan publish status updated: ${plan.name} - ${publishedToPublic}`);
    return sendSuccess(res, { data: plan }, 'Plan publication status updated');
  } catch (error) {
    return handleControllerError(res, error, 'publishPlan');
  }
};

export const addFeatureToPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const { featureList } = req.body;

    if (!featureList || !Array.isArray(featureList)) {
      throw new ValidationError('featureList must be an array');
    }

    const plan = await PricingPlan.findById(planId);
    if (!plan) {
      throw new NotFoundError('Pricing plan not found');
    }

    plan.features.included.push(...featureList);
    await plan.save();

    logger.info(`Features added to plan: ${plan.name}`);
    return sendSuccess(res, { data: plan }, 'Features added to plan');
  } catch (error) {
    return handleControllerError(res, error, 'addFeatureToPlan');
  }
};

export const removeFeatureFromPlan = async (req, res) => {
  try {
    const { planId, featureId } = req.params;

    const plan = await PricingPlan.findById(planId);
    if (!plan) {
      throw new NotFoundError('Pricing plan not found');
    }

    plan.features.included = plan.features.included.filter(f => f !== featureId);
    await plan.save();

    logger.info(`Feature removed from plan: ${plan.name}`);
    return sendSuccess(res, { data: plan }, 'Feature removed from plan');
  } catch (error) {
    return handleControllerError(res, error, 'removeFeatureFromPlan');
  }
};

/**
 * DISCOUNT OFFERS - Admin Routes
 */

export const getAllOffers = async (req, res) => {
  try {
    const offers = await DiscountOffer.find({})
      .sort({ createdAt: -1 })
      .select('-__v');

    return sendSuccess(res, {
      data: offers,
      count: offers.length
    }, 'All offers retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getAllOffers');
  }
};

export const getOfferById = async (req, res) => {
  try {
    const { offerId } = req.params;
    
    const offer = await DiscountOffer.findById(offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    return sendSuccess(res, { data: offer }, 'Offer retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getOfferById');
  }
};

export const createOffer = async (req, res) => {
  try {
    const { name, type, value, applicablePlans, validFrom, validUntil, maxRedemptions, isActive } = req.body;

    // Validation
    if (!name || !type || value === undefined || !applicablePlans || !validFrom || !validUntil) {
      throw new ValidationError('All required fields must be provided: name, type, value, applicablePlans, validFrom, validUntil');
    }

    if (!['percentage', 'flat'].includes(type)) {
      throw new ValidationError('Type must be either percentage or flat');
    }

    if (type === 'percentage' && value > 100) {
      throw new ValidationError('Percentage discount cannot exceed 100');
    }

    const offer = new DiscountOffer({
      name,
      type,
      value,
      applicablePlans,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      maxRedemptions: maxRedemptions || null,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id
    });

    await offer.save();
    logger.info(`Offer created: ${name}`);

    return sendSuccess(res, { data: offer }, 'Offer created successfully', 201);
  } catch (error) {
    return handleControllerError(res, error, 'createOffer');
  }
};

export const updateOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const updates = req.body;

    updates.updatedBy = req.user._id;
    updates.updatedAt = new Date();

    const offer = await DiscountOffer.findByIdAndUpdate(
      offerId,
      updates,
      { new: true, runValidators: true }
    );

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    logger.info(`Offer updated: ${offer.name}`);
    return sendSuccess(res, { data: offer }, 'Offer updated successfully');
  } catch (error) {
    return handleControllerError(res, error, 'updateOffer');
  }
};

export const deleteOffer = async (req, res) => {
  try {
    const { offerId } = req.params;

    const offer = await DiscountOffer.findByIdAndDelete(offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    logger.info(`Offer deleted: ${offer.name}`);
    return sendSuccess(res, { data: { _id: offer._id } }, 'Offer deleted successfully');
  } catch (error) {
    return handleControllerError(res, error, 'deleteOffer');
  }
};

export const deactivateOffer = async (req, res) => {
  try {
    const { offerId } = req.params;

    const offer = await DiscountOffer.findByIdAndUpdate(
      offerId,
      { isActive: false, updatedBy: req.user._id, updatedAt: new Date() },
      { new: true }
    );

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    logger.info(`Offer deactivated: ${offer.name}`);
    return sendSuccess(res, { data: offer }, 'Offer deactivated');
  } catch (error) {
    return handleControllerError(res, error, 'deactivateOffer');
  }
};

/**
 * UTILITY
 */

export const getApplicableOffers = async (req, res) => {
  try {
    const { planId } = req.params;

    const plan = await PricingPlan.findById(planId);
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    const now = new Date();
    const offers = await DiscountOffer.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      $or: [
        { applicablePlans: 'all' },
        { applicablePlans: plan.name.toLowerCase() }
      ]
    });

    return sendSuccess(res, {
      data: offers,
      count: offers.length,
      planName: plan.name
    }, 'Applicable offers retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getApplicableOffers');
  }
};

export default {
  getPublicPricingPlans,
  getPricingPlanDetails,
  getAllPricingPlans,
  getPlanById,
  createPricingPlan,
  updatePricingPlan,
  deletePricingPlan,
  suspendPlan,
  publishPlan,
  addFeatureToPlan,
  removeFeatureFromPlan,
  getAllOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
  deactivateOffer,
  getApplicableOffers
};
