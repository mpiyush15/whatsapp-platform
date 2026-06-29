import crypto from 'crypto';
import logger from '../utils/logger.js';
import WebhookEndpoint from '../models/WebhookEndpoint.js';

const DEFAULT_TIMEOUT_MS = 15000;

const signPayload = (payload, secret) => {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
};

const isEventSubscribed = (events = [], eventType) => {
  if (!Array.isArray(events) || events.length === 0) return false;
  if (events.includes('*') || events.includes('all')) return true;
  if (events.includes(eventType)) return true;

  const [namespace] = String(eventType).split('.');
  return events.includes(`${namespace}.*`);
};

export const dispatchWebhookEvent = async ({
  accountId,
  projectId = null,
  eventType,
  payload,
  source = 'system',
}) => {
  try {
    if (!accountId || !eventType) return { dispatched: 0, matched: 0 };

    const endpoints = await WebhookEndpoint.find({
      accountId,
      enabled: true,
      ...(projectId ? { $or: [{ projectId }, { projectId: null }] } : {}),
    }).select('+secret');

    if (!endpoints.length) {
      return { dispatched: 0, matched: 0 };
    }

    const matched = endpoints.filter((ep) => isEventSubscribed(ep.events, eventType));

    const envelope = {
      event: eventType,
      source,
      accountId,
      projectId,
      timestamp: new Date().toISOString(),
      data: payload || {},
    };

    let dispatched = 0;

    await Promise.all(matched.map(async (endpoint) => {
      try {
        const signature = signPayload(envelope, endpoint.secret);

        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Replysys-Event': eventType,
            'X-Replysys-Signature': signature,
            'X-Replysys-Timestamp': envelope.timestamp,
          },
          body: JSON.stringify(envelope),
          signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
        });

        if (!response.ok) {
          endpoint.failureCount = Number(endpoint.failureCount || 0) + 1;
          endpoint.lastFailureAt = new Date();
          await endpoint.save();
          logger.warn(`webhook dispatch failed: endpoint=${endpoint._id} status=${response.status}`);
          return;
        }

        endpoint.lastDeliveredAt = new Date();
        endpoint.failureCount = 0;
        await endpoint.save();
        dispatched += 1;
      } catch (error) {
        endpoint.failureCount = Number(endpoint.failureCount || 0) + 1;
        endpoint.lastFailureAt = new Date();
        await endpoint.save();
        logger.error(`webhook dispatch exception endpoint=${endpoint._id}`, error);
      }
    }));

    return { dispatched, matched: matched.length };
  } catch (error) {
    logger.error('dispatchWebhookEvent error', error);
    return { dispatched: 0, matched: 0, error: error.message };
  }
};

export default {
  dispatchWebhookEvent,
};
