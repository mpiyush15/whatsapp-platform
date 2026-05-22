'use client'

import { Eye } from 'lucide-react'
import DataTable from '@/components/DataTable'
import { formatVisitStatus } from '@/lib/healthcarePatientUi'

export type PatientVisitHistoryMedicine = {
  medicineName: string
  dosage?: string
  frequency?: string
  durationDays?: number
  instructions?: string
}

export type PatientVisitHistoryPrescription = {
  prescriptionId: string
  issuedAt?: string | null
  diagnosis?: string | null
  followUpAt?: string | null
  notes?: string | null
  medicines?: PatientVisitHistoryMedicine[]
  doctorSnapshot?: { fullName?: string | null } | null
}

export type PatientVisitHistoryRow = {
  visitId: string
  kind: 'visit' | 'prescription' | 'bill'
  visitDate: string
  visitStatus?: string | null
  visitReason?: string | null
  doctorName?: string | null
  appointmentId?: string | null
  diagnosis?: string | null
  medicines?: PatientVisitHistoryMedicine[]
  followUpAt?: string | null
  notes?: string | null
  prescription?: PatientVisitHistoryPrescription | null
  prescriptions?: PatientVisitHistoryPrescription[]
  paymentStatus?: 'paid' | 'due' | 'none'
}

type Props = {
  visits: PatientVisitHistoryRow[]
  loading?: boolean
  onOpenPrescription?: (prescription: PatientVisitHistoryPrescription) => void
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(value)
  }
}

function formatShortDate(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(value)
  }
}

function formatMedicine(m: PatientVisitHistoryMedicine) {
  const bits = [
    m.medicineName,
    m.dosage,
    m.frequency,
    m.durationDays ? `${m.durationDays}d` : '',
  ].filter(Boolean)
  return bits.join(' · ')
}

function isActiveTodayQueue(row: PatientVisitHistoryRow) {
  const active = ['scheduled', 'confirmed', 'checked-in'].includes(String(row.visitStatus || ''))
  if (!active) return false
  try {
    return new Date(row.visitDate).toDateString() === new Date().toDateString()
  } catch {
    return false
  }
}

function isFutureScheduled(row: PatientVisitHistoryRow) {
  const scheduled = ['scheduled', 'confirmed'].includes(String(row.visitStatus || ''))
  if (!scheduled || row.kind !== 'visit') return false
  try {
    return new Date(row.visitDate).getTime() > Date.now()
  } catch {
    return false
  }
}

function PaymentBadge({ status }: { status?: 'paid' | 'due' | 'none' }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
        Paid
      </span>
    )
  }
  if (status === 'due') {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
        Due
      </span>
    )
  }
  return <span className="text-xs text-slate-400">—</span>
}

function ClinicalBlock({ row }: { row: PatientVisitHistoryRow }) {
  const meds = row.medicines || []

  if (!row.diagnosis && !meds.length && !row.followUpAt && !row.notes) {
    return <span className="text-slate-400">—</span>
  }

  return (
    <div className="space-y-1 text-xs leading-snug text-slate-800">
      {row.diagnosis ? (
        <p>
          <span className="font-semibold text-slate-600">Dx: </span>
          {row.diagnosis}
        </p>
      ) : null}
      {meds.length ? (
        <ul className="list-none space-y-0.5">
          {meds.map((m, i) => (
            <li key={`${m.medicineName}-${i}`} className="text-slate-700">
              {formatMedicine(m)}
            </li>
          ))}
        </ul>
      ) : null}
      {row.followUpAt ? (
        <p className="text-violet-800">
          <span className="font-semibold">Next: </span>
          {formatShortDate(row.followUpAt)}
        </p>
      ) : null}
      {row.notes ? (
        <p className="text-slate-500">
          <span className="font-semibold">Note: </span>
          {row.notes}
        </p>
      ) : null}
    </div>
  )
}

export function PatientPastActivitySection({ visits, loading = false, onOpenPrescription }: Props) {
  const tableRows = visits
    .filter((row) => !isActiveTodayQueue(row) && !isFutureScheduled(row))
    .map((row) => ({
      ...row,
      id: row.visitId,
      when: formatDate(row.visitDate),
      doctor: row.doctorName || '—',
      visitLabel: row.visitReason?.trim() || 'Visit',
      visitStatusLabel: formatVisitStatus(row.visitStatus),
      hasPrescription: Boolean(row.prescription?.prescriptionId),
      paymentStatus: row.paymentStatus || 'none',
    }))

  const columns = [
    {
      key: 'when',
      label: 'Date',
      minWidth: '9rem',
      render: (value: string, row: (typeof tableRows)[0]) => (
        <div>
          <p className="font-medium text-slate-900">{value}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{row.doctor}</p>
        </div>
      ),
    },
    {
      key: 'visitLabel',
      label: 'Visit',
      minWidth: '7rem',
      render: (value: string, row: (typeof tableRows)[0]) => (
        <div>
          <p className="font-medium text-slate-800">{value}</p>
          <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-900">
            {row.visitStatusLabel}
          </span>
        </div>
      ),
    },
    {
      key: 'clinical',
      label: 'Treatment',
      minWidth: '14rem',
      render: (_: unknown, row: (typeof tableRows)[0]) => <ClinicalBlock row={row} />,
    },
    {
      key: 'paymentStatus',
      label: 'Payment',
      minWidth: '5rem',
      render: (_: unknown, row: (typeof tableRows)[0]) => <PaymentBadge status={row.paymentStatus} />,
    },
    {
      key: 'action',
      label: '',
      minWidth: '4.5rem',
      render: (_: unknown, row: (typeof tableRows)[0]) =>
        row.hasPrescription && row.prescription && onOpenPrescription ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenPrescription(row.prescription!)
            }}
            className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-1 text-[11px] font-semibold text-violet-900 hover:bg-violet-200"
          >
            <Eye className="h-3 w-3" />
            Rx
          </button>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
  ]

  return (
    <section className="hc-patient-card hc-tab-panel border-slate-300 space-y-4 p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">History</h2>
        <p className="mt-1 text-xs text-slate-500">One row per visit — treatment and paid/due only. Full bills are on Payment tab.</p>
      </div>

      <DataTable
        wide
        columns={columns}
        data={tableRows}
        loading={loading}
        emptyMessage="No past visits yet."
        rowClassName="align-top hover:bg-slate-50/80"
        onRowClick={
          onOpenPrescription
            ? (row) => {
                if (row.prescription?.prescriptionId) {
                  onOpenPrescription(row.prescription)
                }
              }
            : undefined
        }
      />
    </section>
  )
}
