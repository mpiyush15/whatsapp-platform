'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  Shield,
} from 'lucide-react';
import { API_URL } from '@/lib/config/api';

type ObservabilitySnapshot = {
  generatedAt: string;
  summary: {
    systemStatus: 'operational' | 'degraded';
    healthScore: number;
    activeAlerts: number;
    uptimeDisplay: string;
    hostMemoryPercent: number;
    queuedMessages: number;
  };
  server: {
    hostname: string;
    platform: string;
    nodeVersion: string;
    environment: string;
    uptimeDisplay: string;
    cpu: { processPercent: number; loadAverage1m: number; cores: number };
    memory: {
      hostUsedPercent: number;
      hostUsedFormatted: string;
      hostTotalFormatted: string;
      processRssFormatted: string;
      processHeapUsedPercent: number;
      processHeapUsedFormatted: string;
    };
  };
  mongo: {
    status: string;
    readyStateLabel: string;
    host: string | null;
    name: string | null;
  };
  pipelines: {
    queuedNow: number;
    failedLastHour: number;
    stuckProcessingPayments: number;
    supportOpen: number;
    supportOverdue: number;
    pendingPayments: number;
  };
  services: Array<{
    name: string;
    status: 'healthy' | 'warning';
    metricLabel: string;
    metricDisplay: string;
    extra?: string;
  }>;
  incidents: Array<{
    severity: 'warning' | 'error';
    service: string;
    detail: string;
  }>;
  auditTrail: Array<{
    actor?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    createdAt?: string;
  }>;
};

function UsageBar({
  label,
  value,
  sub,
  warnAt = 80,
  errorAt = 90,
}: {
  label: string;
  value: number;
  sub?: string;
  warnAt?: number;
  errorAt?: number;
}) {
  const color =
    value >= errorAt ? 'bg-red-500' : value >= warnAt ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-900">{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: 'operational' | 'degraded' }) {
  const ok = status === 'operational';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
        ok ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'
      }`}
    >
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {ok ? 'Operational' : 'Degraded'}
    </span>
  );
}

export default function SystemHealthPage() {
  const [snapshot, setSnapshot] = useState<ObservabilitySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/admin/system-health/observability`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || data?.message || 'Failed to load system health');
      }
      setSnapshot(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setSnapshot(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 60000);
    return () => clearInterval(interval);
  }, [load]);

  const operational = snapshot?.summary.systemStatus === 'operational';

  return (
    <div className="min-h-full bg-slate-50/80 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/dashboard/superadmin"
              className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">System health</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Server resources, database connectivity, and operational pipelines. For message volume
              and billing analytics, use{' '}
              <Link
                href="/dashboard/superadmin/analytics/platform"
                className="font-medium text-green-700 hover:underline"
              >
                Platform analytics
              </Link>
              .
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/superadmin/analytics/platform"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <BarChart3 className="h-4 w-4 text-green-600" />
              Platform analytics
            </Link>
            <button
              type="button"
              onClick={() => load(true)}
              disabled={loading || refreshing}
              className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {loading && !snapshot ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border bg-white" />
            ))}
          </div>
        ) : null}

        {snapshot ? (
          <>
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    operational ? 'bg-green-100' : 'bg-amber-100'
                  }`}
                >
                  <Shield className={`h-6 w-6 ${operational ? 'text-green-600' : 'text-amber-600'}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Platform status
                  </p>
                  <StatusBadge status={snapshot.summary.systemStatus} />
                </div>
              </div>
              <div className="h-10 w-px bg-slate-200 hidden sm:block" />
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-10">
                <div>
                  <p className="text-xs text-slate-500">Health score</p>
                  <p className="text-2xl font-bold text-slate-900">{snapshot.summary.healthScore}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Active alerts</p>
                  <p className="text-2xl font-bold text-slate-900">{snapshot.summary.activeAlerts}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">API uptime</p>
                  <p className="text-2xl font-bold text-slate-900">{snapshot.summary.uptimeDisplay}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Queue backlog</p>
                  <p className="text-2xl font-bold text-slate-900">{snapshot.summary.queuedMessages}</p>
                </div>
              </div>
              {snapshot.generatedAt ? (
                <p className="ml-auto text-xs text-slate-400">
                  Updated {new Date(snapshot.generatedAt).toLocaleTimeString('en-IN')}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <Server className="h-5 w-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Server usage</h2>
                </div>
                <div className="space-y-5">
                  <UsageBar
                    label="Host memory (RAM)"
                    value={snapshot.server.memory.hostUsedPercent}
                    sub={`${snapshot.server.memory.hostUsedFormatted} / ${snapshot.server.memory.hostTotalFormatted}`}
                  />
                  <UsageBar
                    label="Node heap"
                    value={snapshot.server.memory.processHeapUsedPercent}
                    sub={`RSS ${snapshot.server.memory.processRssFormatted} · heap ${snapshot.server.memory.processHeapUsedFormatted}`}
                    warnAt={75}
                  />
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="rounded-xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <Cpu className="h-3.5 w-3.5" />
                        Process CPU
                      </div>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {snapshot.server.cpu.processPercent}%
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <Activity className="h-3.5 w-3.5" />
                        Load (1m)
                      </div>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {snapshot.server.cpu.loadAverage1m}
                        <span className="text-sm font-normal text-slate-500">
                          {' '}
                          / {snapshot.server.cpu.cores} cores
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                  <div>
                    <dt className="text-slate-400">Host</dt>
                    <dd className="font-mono font-medium text-slate-800">{snapshot.server.hostname}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Environment</dt>
                    <dd className="font-medium capitalize text-slate-800">{snapshot.server.environment}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Node</dt>
                    <dd className="font-mono text-slate-800">{snapshot.server.nodeVersion}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">OS</dt>
                    <dd className="font-medium text-slate-800">{snapshot.server.platform}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <Database className="h-5 w-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Database</h2>
                </div>
                <div
                  className={`rounded-xl border p-4 ${
                    snapshot.mongo.status === 'connected'
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">MongoDB</p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                        snapshot.mongo.status === 'connected'
                          ? 'bg-green-200 text-green-900'
                          : 'bg-red-200 text-red-900'
                      }`}
                    >
                      {snapshot.mongo.readyStateLabel}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-xs text-slate-600">
                    {snapshot.mongo.host || '—'}
                    {snapshot.mongo.name ? ` · ${snapshot.mongo.name}` : ''}
                  </p>
                </div>

                <h3 className="mb-3 mt-6 text-sm font-semibold text-slate-800">Operational pipelines</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Queued messages', value: snapshot.pipelines.queuedNow, icon: HardDrive },
                    { label: 'Failed (1h)', value: snapshot.pipelines.failedLastHour, icon: AlertCircle },
                    { label: 'Stuck payments', value: snapshot.pipelines.stuckProcessingPayments, icon: Clock },
                    { label: 'Support overdue', value: snapshot.pipelines.supportOverdue, icon: AlertCircle },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                      <item.icon className="mb-1 h-4 w-4 text-slate-400" />
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        {item.label}
                      </p>
                      <p className="text-xl font-bold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Service checks</h2>
              <div className="space-y-2">
                {snapshot.services.map((service) => (
                  <div
                    key={service.name}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          service.status === 'healthy' ? 'bg-green-500' : 'bg-amber-500'
                        }`}
                      />
                      <div>
                        <p className="font-medium text-slate-900">{service.name}</p>
                        <p className="text-xs text-slate-500">{service.extra}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] uppercase text-slate-400">{service.metricLabel}</p>
                        <p className="text-sm font-semibold text-slate-900">{service.metricDisplay}</p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          service.status === 'healthy'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {service.status === 'healthy' ? 'Healthy' : 'Warning'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Active incidents</h2>
                {snapshot.incidents.length === 0 ? (
                  <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    No active incidents. Infrastructure and pipelines look stable.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {snapshot.incidents.map((incident, i) => (
                      <li
                        key={`${incident.service}-${i}`}
                        className={`flex gap-3 rounded-xl border p-4 ${
                          incident.severity === 'error'
                            ? 'border-red-200 bg-red-50'
                            : 'border-amber-200 bg-amber-50'
                        }`}
                      >
                        <AlertCircle
                          className={`h-5 w-5 shrink-0 ${
                            incident.severity === 'error' ? 'text-red-600' : 'text-amber-600'
                          }`}
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{incident.service}</p>
                          <p className="mt-0.5 text-sm text-slate-600">{incident.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent admin actions</h2>
                {snapshot.auditTrail.length === 0 ? (
                  <p className="text-sm text-slate-500">No recent audit log entries.</p>
                ) : (
                  <ul className="max-h-64 space-y-2 overflow-y-auto">
                    {snapshot.auditTrail.map((log, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-slate-800">{log.action || '—'}</p>
                        <p className="text-xs text-slate-500">
                          {log.actor || 'system'} · {log.entityType}
                          {log.entityId ? ` · ${log.entityId}` : ''}
                        </p>
                        {log.createdAt ? (
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            {new Date(log.createdAt).toLocaleString('en-IN')}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
