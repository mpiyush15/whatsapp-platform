/**
 * Enums API Controller
 * Provides centralized enum endpoints for frontend consumption
 * Single source of truth: backend/src/constants/enums.js
 */

import * as allEnums from '../constants/enums.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';

/**
 * GET /api/enums/all
 * Returns all enums as JSON
 * Frontend can cache this or fetch on app init
 */
export const getAllEnums = async (req, res) => {
  try {
    const {
      AccountType,
      UserRole,
      AccountStatus,
      MetaSyncStatus,
      PermissionLevel,
      PhoneStatus,
      PhoneQualityRating,
      ConversationStatus,
      MessageStatus,
      MessageDirection,
      AssignmentStatus,
      AssignmentMode,
      TemplateStatus,
      TemplateCategory,
      CampaignType,
      CampaignStatus,
      CampaignTargetType,
      CampaignTriggerType,
      LeadStatus,
      LeadSource,
      ContactType,
      AgentRole,
      AgentStatus,
      AgentAvailability,
      PaymentStatus,
      PaymentMethod,
      PaymentType,
      SubscriptionStatus,
      IntegrationType,
      WebhookStatus,
      TagType,
      KeywordRuleAction,
    } = allEnums;

    const enums = {
      // Account & Auth
      AccountType,
      UserRole,
      AccountStatus,
      MetaSyncStatus,
      PermissionLevel,
      // Phone
      PhoneStatus,
      PhoneQualityRating,
      // Conversations & Messages
      ConversationStatus,
      MessageStatus,
      MessageDirection,
      AssignmentStatus,
      AssignmentMode,
      // Templates
      TemplateStatus,
      TemplateCategory,
      // Campaigns
      CampaignType,
      CampaignStatus,
      CampaignTargetType,
      CampaignTriggerType,
      // Leads
      LeadStatus,
      LeadSource,
      // Contacts
      ContactType,
      // Agents
      AgentRole,
      AgentStatus,
      AgentAvailability,
      // Payments
      PaymentStatus,
      PaymentMethod,
      PaymentType,
      SubscriptionStatus,
      // Integrations
      IntegrationType,
      WebhookStatus,
      // Tags & Rules
      TagType,
      KeywordRuleAction,
    };

    logger.info('All enums fetched');
    return sendSuccess(res, enums, 'Enums retrieved successfully');
  } catch (error) {
    logger.error('Failed to fetch enums', error);
    return sendError(res, error.message, 500);
  }
};

/**
 * GET /api/enums/:enumName
 * Returns specific enum by name
 * Example: /api/enums/UserRole
 */
export const getEnumByName = async (req, res) => {
  try {
    const { enumName } = req.params;

    if (!allEnums[enumName]) {
      logger.warn(`Enum not found: ${enumName}`);
      return sendError(res, `Enum '${enumName}' not found`, 404);
    }

    const enumData = allEnums[enumName];
    logger.info(`Enum '${enumName}' fetched`);
    return sendSuccess(res, enumData, `${enumName} enum retrieved`);
  } catch (error) {
    logger.error(`Failed to fetch enum ${req.params.enumName}`, error);
    return sendError(res, error.message, 500);
  }
};

/**
 * GET /api/enums/validate
 * Validate if value exists in specific enum
 * Query: ?enum=UserRole&value=admin
 */
export const validateEnumValue = async (req, res) => {
  try {
    const { enum: enumName, value } = req.query;

    if (!enumName || !value) {
      return sendError(res, 'enum and value query params required', 400);
    }

    if (!allEnums[enumName]) {
      return sendError(res, `Enum '${enumName}' not found`, 404);
    }

    const enumData = allEnums[enumName];
    const isValid = Object.values(enumData).includes(value);

    logger.info(`Validated ${enumName}.${value} = ${isValid}`);
    return sendSuccess(res, { isValid, enum: enumName, value }, 'Validation complete');
  } catch (error) {
    logger.error('Enum validation failed', error);
    return sendError(res, error.message, 500);
  }
};

/**
 * GET /api/enums/list
 * Returns list of all available enum names
 */
export const listEnumNames = async (req, res) => {
  try {
    const enumNames = Object.keys(allEnums).filter((key) => typeof allEnums[key] === 'object' && !Array.isArray(allEnums[key]) && key !== 'default');

    logger.info(`Listed ${enumNames.length} enums`);
    return sendSuccess(res, { enums: enumNames, count: enumNames.length }, 'Enum list retrieved');
  } catch (error) {
    logger.error('Failed to list enums', error);
    return sendError(res, error.message, 500);
  }
};
