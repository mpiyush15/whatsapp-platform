'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { apiPost } from '@/lib/api-client'

export type BookVisitDoctorOption = {
  doctorId: string
  fullName: string
  specialization?: string | null
}

export type BookVisitFormState = {
  patientId: string
  doctorId: string
  scheduledAt: string
  durationMinutes: string
  visitType: string
  channel: string
  reason: string
}

export type BookVisitAppointment = {
  appointmentId: string
  patientId: string
  doctorId?: string | null
  scheduledAt: string
  status?: string
  reason?: string | null
  visitType?: string
  doctorSnapshot?: { fullName?: string | null } | null
}

const defaultForm = (patientId: string, visitType = 'consultation'): BookVisitFormState => ({
  patientId,
  doctorId: '',
  scheduledAt: '',
  durationMinutes: '30',
  visitType,
  channel: 'clinic',
  reason: '',
})

type Props = {
  show: boolean
  onClose: () => void
  projectId: string
  patientId: string
  patientName: string
  doctors: BookVisitDoctorOption[]
  defaultDoctorId?: string
  defaultVisitType?: string
  title?: string
  onCreated: (appointment: BookVisitAppointment) => void
}

export function BookVisitModal({
  show,
  onClose,
  projectId,
  patientId,
  patientName,
  doctors,
  defaultDoctorId = '',
  defaultVisitType = 'consultation',
  title = 'Book visit',
  onCreated,
}: Props) {
  const [form, setForm] = useState<BookVisitFormState>(() => defaultForm(patientId, defaultVisitType))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!show) return
    setForm({
      ...defaultForm(patientId, defaultVisitType),
      doctorId: defaultDoctorId,
    })
    setError('')
  }, [show, patientId, defaultDoctorId, defaultVisitType])

  if (!show) return null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setSubmitting(true)
      setError('')
      const payload = await apiPost<{ data?: { appointment: BookVisitAppointment } }>('/healthcare/appointments', {
        projectId,
        patientId: form.patientId,
        doctorId: form.doctorId || null,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes || 30),
        visitType: form.visitType,
        channel: form.channel,
        reason: form.reason,
      })
      if (payload?.data?.appointment) {
        onCreated(payload.data.appointment)
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not book visit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-blue-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">{title}</h3>
            <p className="text-sm text-slate-600">
              Booking for <span className="font-medium text-slate-900">{patientName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Doctor</label>
              <select
                value={form.doctorId}
                onChange={(e) => setForm((c) => ({ ...c, doctorId: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              >
                <option value="">Any doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.doctorId} value={doctor.doctorId}>
                    {doctor.fullName}
                    {doctor.specialization ? ` · ${doctor.specialization}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date & time</label>
              <input
                required
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((c) => ({ ...c, scheduledAt: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Visit type</label>
              <select
                value={form.visitType}
                onChange={(e) => setForm((c) => ({ ...c, visitType: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              >
                <option value="consultation">Consultation</option>
                <option value="follow-up">Return visit</option>
                <option value="procedure">Procedure</option>
                <option value="lab">Lab test</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Duration (minutes)</label>
              <input
                type="number"
                min={5}
                step={5}
                value={form.durationMinutes}
                onChange={(e) => setForm((c) => ({ ...c, durationMinutes: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Reason (optional)</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm((c) => ({ ...c, reason: e.target.value }))}
              rows={3}
              placeholder="Why is the patient coming?"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {submitting ? 'Booking…' : 'Book visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
