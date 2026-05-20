import WorkflowSession from '../models/WorkflowSession.js';
import logger from '../utils/logger.js';

const BATCH_SIZE = 200;

/**
 * Expire workflow sessions that passed their response deadline.
 * Safe for multi-instance deploys (atomic updates per session).
 */
export async function processWorkflowTimeouts() {
  const now = new Date();

  const sessions = await WorkflowSession.find({
    status: 'active',
    responseDeadlineAt: { $ne: null, $lte: now },
  })
    .select('_id')
    .limit(BATCH_SIZE)
    .lean();

  if (sessions.length === 0) {
    return { processed: 0 };
  }

  const whatsappService = (await import('../services/whatsappService.js')).default;
  let processed = 0;

  for (const row of sessions) {
    try {
      await whatsappService.checkWorkflowTimeout(String(row._id));
      processed += 1;
    } catch (err) {
      logger.error('Workflow timeout job error:', { sessionId: row._id, error: err.message });
    }
  }

  logger.info(`⏰ Workflow timeout job: processed ${processed}/${sessions.length} sessions`);
  return { processed, pending: sessions.length };
}

export default { processWorkflowTimeouts };
