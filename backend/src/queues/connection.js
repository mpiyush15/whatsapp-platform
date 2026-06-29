import { Redis } from 'ioredis';
import logger from '../utils/logger.js';

// Configuration for Redis connection
const connectionOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null, // Essential for BullMQ
};

// Create a single shared connection for queues
export const connection = new Redis(connectionOptions);

connection.on('error', (err) => {
  logger.error('❌ Redis Connection Error: ' + err.message);
});

connection.on('ready', () => {
  logger.info('✅ Redis connected successfully for BullMQ');
});
