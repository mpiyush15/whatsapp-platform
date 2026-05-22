'use client'

import type { ReactNode } from 'react'
import { CalendarCheck2, CheckCircle2, Clock, Eye, FileText, UserX, XCircle } from 'lucide-react'
import DataTable from '@/components/DataTable'
import {
  COMPLETED_TODAY_VISIBLE_HOURS,
  completedVisitStillVisibleToday,
  formatVisitStatus,
} from '@/lib/healthcarePatientUi'

export type TodayVisitRow = {
  appointmentId: string
  scheduledAt: string
  status?: string | null
  reason?: string | null
  doctorId?: string | null
  doctorSnapshot?: { fullName?: string | null } | null
  updatedAt?: string | null
  frontdesk?: { completedAt?: string | null } | null
}

type Props = {
  appointments: TodayVisitRow[]
  loading?: boolean
  error?: string | null
  workflowBusyId: string | null
  canWritePrescription: boolean
  canBookVisit: boolean
  /** When true, finished today visits stay visible (for doctors). */
  includeCompleted?: boolean
  onComplete: (appointment: TodayVisitRow) => void
  onOpenCompleted?: (appointment: TodayVisitRow) => void
  onCancel: (appointment: TodayVisitRow) => void
  onDelay: (appointment: TodayVisitRow) => void
  onNoShow: (appointment: TodayVisitRow) => void
  onCheckIn: (appointment: TodayVisitRow) => void
  onBookVisit: () => void
  onWritePrescription: () => void
  onBookReturnVisit: () => void
}

const ACTIVE_STATUSES = new Set(['scheduled', 'confirmed', 'checked-in'])
const COMPLETED_STATUS = 'completed'

function statusRank(status?: string | null): number {
  if (status === 'checked-in') return 0
  if (status === 'confirmed') return 1
  if (status === 'scheduled') return 2
  if (status === COMPLETED_STATUS) return 3
  return 4
}

function statusBadgeClass(status?: string | null): string {
  switch (status) {
    case 'checked-in':
      return 'bg-teal-100 text-teal-900 ring-1 ring-teal-200'
    case 'confirmed':
      return 'bg-blue-100 text-blue-900 ring-1 ring-blue-200'
    case 'scheduled':
      return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200'
    case 'completed':
      return 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200'
    default:
      return 'bg-slate-100 text-slate-800 ring-1 ring-slate-200'
  }
}

function taskBtn(
  label: string,
  onClick: () => void,
  opts: { variant?: 'primary' | 'danger' | 'secondary'; disabled?: boolean; icon?: ReactNode } = {}
) {
  const base =
    'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50'
  const variant =
    opts.variant === 'danger'
      ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
      : opts.variant === 'primary'
        ? 'bg-teal-100 text-teal-900 hover:bg-teal-200'
        : 'bg-slate-100 text-slate-800 hover:bg-slate-200'

  return (
    <button type="button" disabled={opts.disabled} onClick={onClick} className={`${base} ${variant}`}>
      {opts.icon}
      {label}
    </button>
  )
}

export function PatientTodayVisitsTable({
  appointments,
  loading = false,
  error = null,
  workflowBusyId,
  canWritePrescription,
  canBookVisit,
  includeCompleted = false,
  onComplete,
  onOpenCompleted,
  onCancel,
  onDelay,
  onNoShow,
  onCheckIn,
  onBookVisit,
  onWritePrescription,
  onBookReturnVisit,
}: Props) {
  const queue = appointments
    .filter((apt) => {
      const status = String(apt.status || '')
      if (ACTIVE_STATUSES.has(status)) return true
      return includeCompleted && status === COMPLETED_STATUS && completedVisitStillVisibleToday(apt)
    })
    .sort((a, b) => {
      const rankDiff = statusRank(a.status) - statusRank(b.status)
      if (rankDiff !== 0) return rankDiff
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    })

  const activeCount = queue.filter((apt) => ACTIVE_STATUSES.has(String(apt.status || ''))).length
  const completedCount = queue.filter((apt) => apt.status === COMPLETED_STATUS).length

  const columns = [
    {
      key: 'scheduledAt',
      label: 'Time',
      minWidth: '6.5rem',
      render: (_: unknown, row: TodayVisitRow) => (
        <span className="font-semibold text-slate-900 whitespace-nowrap">
          {new Date(row.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'doctor',
      label: 'Doctor',
      minWidth: '8rem',
      render: (_: unknown, row: TodayVisitRow) => (
        <span className="text-slate-800">{row.doctorSnapshot?.fullName || '—'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      minWidth: '7rem',
      render: (_: unknown, row: TodayVisitRow) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(row.status)}`}
        >
          {formatVisitStatus(row.status)}
        </span>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      minWidth: '10rem',
      render: (_: unknown, row: TodayVisitRow) => (
        <span className="text-slate-700">{row.reason?.trim() || '—'}</span>
      ),
    },
    {
      key: 'tasks',
      label: 'Actions',
      minWidth: '16rem',
      render: (_: unknown, row: TodayVisitRow) => {
        const busy = workflowBusyId === row.appointmentId
        const isDone = row.status === COMPLETED_STATUS

        if (isDone) {
          return (
            <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
              {taskBtn('Open visit', () => onOpenCompleted?.(row), {
                variant: 'primary',
                disabled: busy || !onOpenCompleted,
                icon: <Eye className="h-3.5 w-3.5" />,
              })}
            </div>
          )
        }

        const isCheckedIn = row.status === 'checked-in'
        return (
          <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
            {!isCheckedIn ? (
              taskBtn('Check in', () => onCheckIn(row), {
                variant: 'secondary',
                disabled: busy,
              })
            ) : null}
            {taskBtn('Complete', () => onComplete(row), {
              variant: 'primary',
              disabled: busy,
              icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            })}
            {taskBtn('Delay 30m', () => onDelay(row), {
              disabled: busy,
              icon: <Clock className="h-3.5 w-3.5" />,
            })}
            {taskBtn('Cancel', () => onCancel(row), {
              variant: 'danger',
              disabled: busy,
              icon: <XCircle className="h-3.5 w-3.5" />,
            })}
            {taskBtn('No show', () => onNoShow(row), {
              variant: 'danger',
              disabled: busy,
              icon: <UserX className="h-3.5 w-3.5" />,
            })}
          </div>
        )
      },
    },
  ]

  return (
    <section className="hc-patient-card hc-tab-panel border-teal-500 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-teal-100 bg-gradient-to-r from-teal-700 to-teal-600 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-50">Today&apos;s visits</p>
          <p className="mt-1 text-sm text-teal-50">
            {queue.length === 0
              ? 'No visits for today'
              : [
                  activeCount ? `${activeCount} active` : null,
                  completedCount ? `${completedCount} finished` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
            {includeCompleted
              ? ` — finished visits hide after ${COMPLETED_TODAY_VISIBLE_HOURS} hours (see All visits anytime)`
              : null}
            {activeCount > 0 ? ' · use actions on active rows' : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canBookVisit ? (
            <button
              type="button"
              onClick={onBookVisit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/25"
            >
              <CalendarCheck2 className="h-4 w-4" />
              Book visit
            </button>
          ) : null}
          {canWritePrescription ? (
            <button
              type="button"
              onClick={onWritePrescription}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-600"
            >
              <FileText className="h-4 w-4" />
              Prescription
            </button>
          ) : null}
          <button
            type="button"
            onClick={onBookReturnVisit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-400/90 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-300"
          >
            <CalendarCheck2 className="h-4 w-4" />
            Return visit
          </button>
        </div>
      </div>

      <div className="p-4">
        <DataTable
          wide
          columns={columns}
          data={queue}
          loading={loading}
          error={error}
          emptyMessage={
            includeCompleted
              ? 'No visits today. Book a visit or check All visits.'
              : 'No active visits today. Book a visit or check All visits for past entries.'
          }
          rowClassName="hover:bg-teal-50/40"
        />
      </div>
    </section>
  )
}
