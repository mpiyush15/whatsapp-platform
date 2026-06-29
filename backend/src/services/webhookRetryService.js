/**
 * Webhook Retry Service
 * Handles failed webhook deliveries with exponential backoff
 */

import axios from 'axios';
import WebhookLog from '../models/WebhookLog.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
class WebhookRetryService {
  constructor() {
    this.maxRetries = 5;
    this.initialDelay = 1000; // 1 second
  }

  /**
   * Calculate exponential backoff delay
   * Delay = initialDelay * (2 ^ attemptNumber) + random jitter
   */
  getBackoffDelay(attemptNumber) {
    const exponentialDelay = this.initialDelay * Math.pow(2, attemptNumber);
    const jitter = Math.random() * 1000; // 0-1 second random jitter
    return exponentialDelay + jitter;
  }

  /**
   * Send webhook with retry logic
   */
  async sendWithRetry(webhookUrl, payload, accountId, eventType) {
    let lastError;
    let attemptNumber = 0;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      attemptNumber = attempt;

      try {
        logger.info(`📤 Webhook attempt ${attempt + 1}/${this.maxRetries} to ${webhookUrl}`);

        const response = await axios.post(webhookUrl, payload, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'WhatsApp-Platform/1.0',
            'X-Webhook-Event': eventType,
            'X-Account-ID': accountId
          }
        });

        // ✅ Success (2xx status)
        if (response.status >= 200 && response.status < 300) {
          logger.info(`✅ Webhook delivered successfully on attempt ${attempt + 1}`);

          // Log successful delivery
          await WebhookLog.create({
            accountId,
            eventType,
            webhookUrl,
            payload,
            status: 'delivered',
            statusCode: response.status,
            attempts: attempt + 1,
            response: response.data,
            deliveredAt: new Date()
          }).catch(err => logger.error('Failed to log webhook:', err));

          return { success: true, attempts: attempt + 1, statusCode: response.status };
        }

        // Non-2xx success (treat as failure for retry)
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error;
        logger.error(`❌ Webhook attempt ${attempt + 1} failed:`, error.message);

        // Don't retry on certain errors
        if (error.response?.status === 410) {
          // 410 Gone - endpoint no longer exists
          logger.error('Webhook endpoint no longer exists (410). Stopping retries.');
          await WebhookLog.create({
            accountId,
            eventType,
            webhookUrl,
            payload,
            status: 'failed',
            statusCode: 410,
            attempts: attempt + 1,
            error: 'Endpoint no longer exists (410 Gone)',
            failedAt: new Date()
          }).catch(err => logger.error('Failed to log webhook:', err));

          return { success: false, attempts: attempt + 1, statusCode: 410, error: 'Endpoint no longer exists' };
        }

        if (error.response?.status === 403 || error.response?.status === 401) {
          // 403/401 Unauthorized - credentials invalid
          logger.error('Webhook authentication failed. Stopping retries.');
          await WebhookLog.create({
            accountId,
            eventType,
            webhookUrl,
            payload,
            status: 'failed',
            statusCode: error.response.status,
            attempts: attempt + 1,
            error: 'Authentication failed',
            failedAt: new Date()
          }).catch(err => logger.error('Failed to log webhook:', err));

          return { success: false, attempts: attempt + 1, statusCode: error.response.status, error: 'Authentication failed' };
        }

        // For other errors (network, timeout, 5xx), retry with exponential backoff
        if (attempt < this.maxRetries - 1) {
          const delay = this.getBackoffDelay(attempt);
          logger.info(`⏳ Retrying in ${Math.round(delay)}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // ❌ All retries exhausted
    logger.error(`❌ Webhook delivery failed after ${this.maxRetries} attempts`);

    await WebhookLog.create({
      accountId,
      eventType,
      webhookUrl,
      payload,
      status: 'failed',
      statusCode: lastError?.response?.status || 0,
      attempts: this.maxRetries,
      error: lastError?.message || 'Unknown error',
      failedAt: new Date()
    }).catch(err => logger.error('Failed to log webhook:', err));

    return {
      success: false,
      attempts: this.maxRetries,
      error: lastError?.message,
      statusCode: lastError?.response?.status
    };
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry failed webhooks from log
   */
  async retryFailedWebhooks() {
    try {
      // Find webhooks that failed and need retry
      const failedWebhooks = await WebhookLog.find({
        status: 'failed',
        attempts: { $lt: this.maxRetries },
        createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }).limit(100);

      logger.info(`🔄 Found ${failedWebhooks.length} webhooks to retry`);

      for (const webhook of failedWebhooks) {
        const result = await this.sendWithRetry(
          webhook.webhookUrl,
          webhook.payload,
          webhook.accountId,
          webhook.eventType
        );

        if (result.success) {
          // Mark as delivered
          await WebhookLog.updateOne(
            { _id: webhook._id },
            { status: 'delivered', deliveredAt: new Date() }
          );
        } else {
          // Update attempt count
          await WebhookLog.updateOne(
            { _id: webhook._id },
            { attempts: result.attempts, error: result.error }
          );
        }
      }

      logger.info('✅ Webhook retry batch completed');
    } catch (error) {
      logger.error('❌ Webhook retry batch error:', error);
    }
  }
}

export default new WebhookRetryService();
