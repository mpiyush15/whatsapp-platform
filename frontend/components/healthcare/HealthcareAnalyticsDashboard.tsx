'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  CalendarCheck2,
  ClipboardList,
  IndianRupee,
  Loader2,
  RefreshCw,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import {
  fetchHealthcareAnalytics,
  formatCount,
  formatInr,
  type HealthcareAnalytics,
  type HealthcareAnalyticsPeriod,
  type HealthcareMetric,
} from '@/lib/healthcareAnalyticsApi'

const PERIODS: { id: HealthcareAnalyticsPeriod; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
]

function ChangeBadge({ metric }: { metric?: HealthcareMetric }) {
  if (metric?.changePct == null) return null
  const up = metric.changePct >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        up ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
      }`}
    >
      <Icon className="h-3 w-3" />
      {up ? '+' : ''}
      {metric.changePct}% vs last period
    </span>
  )
}

function KpiCard({
  label,
  value,
  sub,
  metric,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  sub?: string
  metric?: HealthcareMetric
  icon: React.ComponentType<{ className?: string }>
  accent: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-40 blur-2xl ${accent}`} />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {sub ? <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p> : null}
          <div className="mt-2">
            <ChangeBadge metric={metric} />
          </div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

type Props = {
  projectId: string
  clinicName?: string
  basePath: string
}

export function HealthcareAnalyticsDashboard({ projectId, clinicName, basePath }: Props) {
  const [period, setPeriod] = useState<HealthcareAnalyticsPeriod>('week')
  const [data, setData] = useState<HealthcareAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const id = ++requestId.current
    try {
      setLoading(true)
      setError('')
      const payload = await fetchHealthcareAnalytics(projectId, period)
      if (id !== requestId.current) return
      if (!payload || payload.period !== period) {
        setError('Could not load stats for this period')
        setData(null)
        return
      }
      setData(payload)
    } catch (err) {
      if (id !== requestId.current) return
      setError(err instanceof Error ? err.message : 'Failed to load overview')
      setData(null)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [projectId, period])

  useEffect(() => {
    void load()
  }, [load])

  const handlePeriodChange = (next: HealthcareAnalyticsPeriod) => {
    if (next === period) return
    setPeriod(next)
    setData(null)
    setLoading(true)
  }

  const periodLabel = PERIODS.find((p) => p.id === period)?.label || 'This week'
  const rangeLabel = data?.range?.label

  const quickLinks = [
    { href: `${basePath}/healthcare/patients`, label: 'Patients' },
    { href: `${basePath}/healthcare/appointments`, label: 'Appointments' },
    { href: `${basePath}/healthcare/frontdesk`, label: 'Front desk' },
    { href: `${basePath}/healthcare/billing`, label: 'Billing' },
    { href: `${basePath}/healthcare/prescriptions`, label: 'Prescriptions' },
    { href: `${basePath}/healthcare/clinic-setup`, label: 'Clinic setup' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Clinic overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {clinicName || 'Overview'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Key numbers for your clinic — pick a time range below.</p>
          {rangeLabel ? <p className="mt-1 text-xs font-medium text-slate-600">{rangeLabel}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePeriodChange(p.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  period === p.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          Loading {periodLabel.toLowerCase()}…
        </div>
      ) : data && data.period === period ? (
        <div className={`space-y-6 transition-opacity ${loading ? 'pointer-events-none opacity-60' : ''}`}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Money received"
              value={formatInr(data.kpis.revenueCollected.value)}
              sub="Payments in"
              metric={data.kpis.revenueCollected}
              icon={IndianRupee}
              accent="bg-emerald-400"
            />
            <KpiCard
              label="Billed"
              value={formatInr(data.kpis.revenueBilled.value)}
              sub="Invoice total"
              metric={data.kpis.revenueBilled}
              icon={Wallet}
              accent="bg-teal-400"
            />
            <KpiCard
              label="Still due"
              value={formatInr(data.kpis.outstandingDue.value)}
              sub="All open bills"
              icon={Activity}
              accent="bg-amber-400"
            />
            <KpiCard
              label="Visits"
              value={formatCount(data.kpis.visits.value)}
              sub={`${formatCount(data.kpis.completedVisits.value)} finished`}
              metric={data.kpis.visits}
              icon={CalendarCheck2}
              accent="bg-blue-400"
            />
            <KpiCard
              label="Prescriptions"
              value={formatCount(data.kpis.prescriptions.value)}
              sub="Written in period"
              metric={data.kpis.prescriptions}
              icon={ClipboardList}
              accent="bg-violet-400"
            />
            <KpiCard
              label="New patients"
              value={formatCount(data.kpis.newPatients.value)}
              sub={`${formatCount(data.kpis.patients.value)} on file`}
              metric={data.kpis.newPatients}
              icon={Users}
              accent="bg-sky-400"
            />
            <KpiCard
              label="Doctors"
              value={formatCount(data.kpis.doctors.value)}
              sub="Active"
              icon={Stethoscope}
              accent="bg-indigo-400"
            />
            <KpiCard
              label="Upcoming visits"
              value={formatCount(data.kpis.upcomingAppointments.value)}
              sub="Booked ahead"
              icon={CalendarCheck2}
              accent="bg-cyan-400"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Doctor activity</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{periodLabel}</p>
                </div>
                <Link
                  href={`${basePath}/healthcare/doctors`}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                >
                  All doctors →
                </Link>
              </div>
              {data.doctors.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">No visits in this period yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[280px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-500">
                        <th className="pb-2 font-medium">Doctor</th>
                        <th className="pb-2 font-medium text-right">Visits</th>
                        <th className="pb-2 font-medium text-right">Rx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.doctors.map((doc) => (
                        <tr key={doc.doctorId} className="border-b border-slate-50 last:border-0">
                          <td className="py-2.5 font-medium text-slate-800">{doc.name}</td>
                          <td className="py-2.5 text-right tabular-nums text-slate-700">{doc.visits}</td>
                          <td className="py-2.5 text-right tabular-nums text-violet-700">{doc.prescriptions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
              <h2 className="text-sm font-semibold">Go to</h2>
              <p className="mt-0.5 text-xs text-slate-400">Daily work</p>
              <div className="mt-4 grid gap-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium transition hover:bg-white/10"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
