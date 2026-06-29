'use client'

import { Loader2, Printer, X } from 'lucide-react'

export type PrescriptionDrawerRecord = {
  prescriptionId: string
  issuedAt?: string | null
  diagnosis?: string | null
  notes?: string | null
  doctorSnapshot?: { fullName?: string | null; specialization?: string | null } | null
  patientSnapshot?: { fullName?: string | null } | null
  medicines?: Array<{
    medicineName: string
    dosage?: string
    frequency?: string
    durationDays?: number
    instructions?: string
  }>
}

type Props = {
  isOpen: boolean
  onClose: () => void
  prescription: PrescriptionDrawerRecord | null
  pdfUrl: string | null
  loading?: boolean
  error?: string | null
  printing?: boolean
  onPrint: () => void
}

export function PrescriptionViewDrawer({
  isOpen,
  onClose,
  prescription,
  pdfUrl,
  loading = false,
  error = null,
  printing = false,
  onPrint,
}: Props) {
  if (!isOpen) return null

  const doctorName = prescription?.doctorSnapshot?.fullName
  const doctorLabel = doctorName
    ? doctorName.trim().toLowerCase().startsWith('dr')
      ? doctorName
      : `Dr. ${doctorName}`
    : '—'

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/40" onClick={onClose} aria-hidden />

      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl sm:max-w-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prescription-drawer-title"
      >
        <div className="shrink-0 border-b border-slate-200 bg-violet-50 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Prescription</p>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-1 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 id="prescription-drawer-title" className="truncate text-lg font-semibold text-slate-900">
                {prescription?.patientSnapshot?.fullName || 'Patient'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {doctorLabel}
                {prescription?.issuedAt
                  ? ` · ${new Date(prescription.issuedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
                  : ''}
              </p>
              {prescription?.diagnosis ? (
                <p className="mt-2 text-sm text-slate-800">
                  <span className="font-semibold text-slate-600">Diagnosis: </span>
                  {prescription.diagnosis}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onPrint}
                disabled={loading || printing || Boolean(error) || !pdfUrl}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                {printing ? 'Preparing print…' : 'Print'}
              </button>
              {pdfUrl ? (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Open in new tab
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 bg-slate-100">
          {loading ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              <p className="text-sm">Loading prescription…</p>
            </div>
          ) : error ? (
            <div className="p-5">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
            </div>
          ) : pdfUrl ? (
            <iframe
              title="Prescription preview"
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              className="h-full w-full min-h-[400px] border-0 bg-white"
            />
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-slate-500">
              No preview available
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
