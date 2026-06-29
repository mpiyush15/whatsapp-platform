import { Queue } from 'bullmq';
import { connection } from './connection.js';

// The BroadcastQueue where jobs are pushed
export const broadcastQueue = new Queue('BroadcastQueue', {
  connection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times on failure
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 25s, 125s...
    },
    removeOnComplete: 500, // keep last 500 successful jobs for debugging
    removeOnFail: 5000,    // keep up to 5000 failed jobs for debugging
  },
});
