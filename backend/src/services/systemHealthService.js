import os from 'os';
import mongoose from 'mongoose';

let lastCpuSample = { usage: process.cpuUsage(), at: Date.now() };

function assertInternalSuperadmin(req) {
  if (req.account?.type !== 'internal') {
    const err = new Error('FORBIDDEN');
    err.statusCode = 403;
    throw err;
  }
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

function formatUptime(seconds) {
  const s = Number(seconds) || 0;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

function sampleProcessCpuPercent() {
  const now = Date.now();
  const current = process.cpuUsage();
  const elapsedUs = (now - lastCpuSample.at) * 1000;
  if (elapsedUs <= 0) return 0;

  const userDelta = current.user - lastCpuSample.usage.user;
  const systemDelta = current.system - lastCpuSample.usage.system;
  const pct = Math.min(100, Math.round(((userDelta + systemDelta) / elapsedUs) * 1000) / 10);

  lastCpuSample = { usage: current, at: now };
  return pct;
}

function getServerMetrics() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const hostUsedPercent = totalMem ? Math.round((usedMem / totalMem) * 1000) / 10 : 0;
  const heap = process.memoryUsage();
  const heapUsedPercent = heap.heapTotal
    ? Math.round((heap.heapUsed / heap.heapTotal) * 1000) / 10
    : 0;
  const load = os.loadavg();

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    uptimeDisplay: formatUptime(process.uptime()),
    cpu: {
      processPercent: sampleProcessCpuPercent(),
      loadAverage1m: Math.round(load[0] * 100) / 100,
      loadAverage5m: Math.round(load[1] * 100) / 100,
      cores: os.cpus()?.length || 1,
    },
    memory: {
      hostUsedPercent,
      hostUsedBytes: usedMem,
      hostTotalBytes: totalMem,
      hostFreeBytes: freeMem,
      hostUsedFormatted: formatBytes(usedMem),
      hostTotalFormatted: formatBytes(totalMem),
      processRssBytes: heap.rss,
      processRssFormatted: formatBytes(heap.rss),
      processHeapUsedBytes: heap.heapUsed,
      processHeapUsedFormatted: formatBytes(heap.heapUsed),
      processHeapUsedPercent: heapUsedPercent,
    },
  };
}

function mongoConnectionMeta() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const readyState = mongoose.connection.readyState;
  return {
    status: readyState === 1 ? 'connected' : 'unhealthy',
    readyState,
    readyStateLabel: states[readyState] || 'unknown',
    name: mongoose.connection.name || null,
    host: mongoose.connection.host || null,
  };
}

async function getPipelineMetrics(db, now) {
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const stuckCutoff = new Date(now.getTime() - 30 * 60 * 1000);

  const [
    queuedNow,
    failedLastHour,
    stuckProcessingPayments,
    supportOpen,
    supportOverdue,
    pendingPayments,
  ] = await Promise.all([
    db.collection('messages').countDocuments({ status: 'queued' }),
    db.collection('messages').countDocuments({
      status: 'failed',
      updatedAt: { $gte: hourAgo },
    }),
    db.collection('payments').countDocuments({
      $or: [
        { status: 'processing', updatedAt: { $lt: stuckCutoff } },
        { lifecycleState: 'processing', lifecycleProcessingAt: { $lt: stuckCutoff } },
      ],
    }),
    db.collection('supporttickets').countDocuments({ status: { $in: ['open', 'in-progress'] } }),
    db.collection('supporttickets').countDocuments({
      status: { $in: ['open', 'in-progress'] },
      slaDueAt: { $lt: now },
    }),
    db.collection('payments').countDocuments({ status: 'pending' }),
  ]);

  return {
    queuedNow,
    failedLastHour,
    stuckProcessingPayments,
    supportOpen,
    supportOverdue,
    pendingPayments,
  };
}

function buildIncidents({ server, mongo, pipelines }) {
  const incidents = [];

  if (mongo.status !== 'connected') {
    incidents.push({
      severity: 'error',
      service: 'MongoDB',
      detail: `Database is ${mongo.readyStateLabel}`,
    });
  }

  if (server.memory.hostUsedPercent >= 90) {
    incidents.push({
      severity: 'error',
      service: 'Host memory',
      detail: `Host RAM at ${server.memory.hostUsedPercent}% (${server.memory.hostUsedFormatted} / ${server.memory.hostTotalFormatted})`,
    });
  } else if (server.memory.hostUsedPercent >= 80) {
    incidents.push({
      severity: 'warning',
      service: 'Host memory',
      detail: `Host RAM at ${server.memory.hostUsedPercent}%`,
    });
  }

  if (server.memory.processHeapUsedPercent >= 85) {
    incidents.push({
      severity: 'warning',
      service: 'Node process',
      detail: `Heap at ${server.memory.processHeapUsedPercent}% (${server.memory.processHeapUsedFormatted})`,
    });
  }

  if (pipelines.queuedNow > 500) {
    incidents.push({
      severity: 'warning',
      service: 'Message queue',
      detail: `${pipelines.queuedNow} messages queued (backlog)`,
    });
  }

  if (pipelines.failedLastHour > 50) {
    incidents.push({
      severity: 'warning',
      service: 'Messaging pipeline',
      detail: `${pipelines.failedLastHour} delivery failures in the last hour`,
    });
  }

  if (pipelines.stuckProcessingPayments > 0) {
    incidents.push({
      severity: 'warning',
      service: 'Payments',
      detail: `${pipelines.stuckProcessingPayments} payment(s) stuck in processing (>30 min)`,
    });
  }

  if (pipelines.supportOverdue > 0) {
    incidents.push({
      severity: 'warning',
      service: 'Support',
      detail: `${pipelines.supportOverdue} overdue ticket(s)`,
    });
  }

  return incidents;
}

function buildServices({ server, mongo, pipelines }) {
  return [
    {
      name: 'API process',
      status:
        server.memory.processHeapUsedPercent >= 90 || server.cpu.processPercent >= 95
          ? 'warning'
          : 'healthy',
      metricLabel: 'Uptime',
      metricDisplay: server.uptimeDisplay,
      extra: `${server.cpu.processPercent}% CPU · heap ${server.memory.processHeapUsedPercent}%`,
    },
    {
      name: 'MongoDB',
      status: mongo.status === 'connected' ? 'healthy' : 'warning',
      metricLabel: 'Connection',
      metricDisplay: mongo.readyStateLabel,
      extra: mongo.host || '—',
    },
    {
      name: 'Message queue',
      status: pipelines.queuedNow > 500 || pipelines.failedLastHour > 50 ? 'warning' : 'healthy',
      metricLabel: 'Queued now',
      metricDisplay: String(pipelines.queuedNow),
      extra: `${pipelines.failedLastHour} failed (1h)`,
    },
    {
      name: 'Support SLA',
      status: pipelines.supportOverdue > 0 ? 'warning' : 'healthy',
      metricLabel: 'Open tickets',
      metricDisplay: String(pipelines.supportOpen),
      extra: `${pipelines.supportOverdue} overdue`,
    },
    {
      name: 'Billing pipeline',
      status: pipelines.stuckProcessingPayments > 0 ? 'warning' : 'healthy',
      metricLabel: 'Stuck processing',
      metricDisplay: String(pipelines.stuckProcessingPayments),
      extra: `${pipelines.pendingPayments} pending checkout`,
    },
  ];
}

function computeHealthScore(incidents) {
  const errors = incidents.filter((i) => i.severity === 'error').length;
  const warnings = incidents.filter((i) => i.severity === 'warning').length;
  return Math.max(40, 100 - errors * 25 - warnings * 8);
}

export async function getObservabilitySnapshot(req) {
  assertInternalSuperadmin(req);

  const db = mongoose.connection.db;
  if (!db) {
    const err = new Error('Database not connected');
    err.statusCode = 503;
    throw err;
  }

  const now = new Date();
  const server = getServerMetrics();
  const mongo = mongoConnectionMeta();
  const pipelines = await getPipelineMetrics(db, now);

  const recentAudit = await db
    .collection('admin_audit_logs')
    .find({})
    .sort({ createdAt: -1 })
    .limit(8)
    .toArray();

  const incidents = buildIncidents({ server, mongo, pipelines });
  const healthScore = computeHealthScore(incidents);
  const activeAlerts = incidents.length;
  const hasError = incidents.some((i) => i.severity === 'error');

  return {
    generatedAt: now.toISOString(),
    summary: {
      systemStatus: hasError || activeAlerts > 0 ? 'degraded' : 'operational',
      healthScore,
      activeAlerts,
      uptimeDisplay: server.uptimeDisplay,
      hostMemoryPercent: server.memory.hostUsedPercent,
      queuedMessages: pipelines.queuedNow,
    },
    server,
    mongo,
    pipelines,
    services: buildServices({ server, mongo, pipelines }),
    incidents,
    auditTrail: recentAudit.map((log) => ({
      actor: log.actor,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      createdAt: log.createdAt,
    })),
  };
}

export default { getObservabilitySnapshot };
