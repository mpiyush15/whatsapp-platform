import logger from '../utils/logger.js';

const FALLBACK_WINDOW_MS = 60 * 1000;
const FALLBACK_LIMIT = 300;
const inMemoryCounters = new Map();

const getRedisClient = () => {
  return global.__redisClient || null;
};

const getLimitForRequest = (req) => {
  const byKey = Number(req.apiKeyRecord?.rateLimitPerMinute || 0);
  return byKey > 0 ? byKey : FALLBACK_LIMIT;
};

const inMemoryConsume = (key, windowStart, limit) => {
  const existing = inMemoryCounters.get(key);

  if (!existing || existing.windowStart !== windowStart) {
    inMemoryCounters.set(key, { count: 1, windowStart });
    return { allowed: true, count: 1 };
  }

  existing.count += 1;
  inMemoryCounters.set(key, existing);

  return { allowed: existing.count <= limit, count: existing.count };
};

export const apiRateLimiter = async (req, res, next) => {
  try {
    const apiKeyId = req.apiKeyRecord?._id?.toString() || req.apiKeyId?.toString() || 'unknown';
    const limit = getLimitForRequest(req);

    const now = Date.now();
    const windowStart = Math.floor(now / FALLBACK_WINDOW_MS);
    const resetAt = (windowStart + 1) * FALLBACK_WINDOW_MS;

    const redisClient = getRedisClient();
    let count = 0;
    let allowed = true;

    if (redisClient) {
      const redisKey = `extapi:ratelimit:${apiKeyId}:${windowStart}`;
      count = await redisClient.incr(redisKey);
      if (count === 1) {
        await redisClient.expire(redisKey, 60);
      }
      allowed = count <= limit;
    } else {
      const consumed = inMemoryConsume(`${apiKeyId}:${windowStart}`, windowStart, limit);
      count = consumed.count;
      allowed = consumed.allowed;
    }

    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(limit - count, 0)));
    res.setHeader('X-RateLimit-Reset', String(resetAt));

    if (!allowed) {
      logger.warn(`⛔ External API rate limit exceeded for key=${apiKeyId}`);
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded for this API key',
      });
    }

    return next();
  } catch (error) {
    logger.error('apiRateLimiter error', error);
    return res.status(500).json({
      success: false,
      code: 'RATE_LIMITER_ERROR',
      message: 'Failed to apply API rate limit',
    });
  }
};

export default apiRateLimiter;
