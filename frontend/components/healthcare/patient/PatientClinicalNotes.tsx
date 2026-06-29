'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { apiPut } from '@/lib/api-client'

type Props = {
  projectId: string
  patientId: string
  initialNotes?: string | null
  canEdit: boolean
  onSaved?: (notes: string) => void
}

export function PatientClinicalNotes({ projectId, patientId, initialNotes, canEdit, onSaved }: Props) {
  const [notes, setNotes] = useState(initialNotes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    setNotes(initialNotes || '')
  }, [initialNotes, patientId])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      await apiPut(`/healthcare/patients/${encodeURIComponent(patientId)}?projectId=${encodeURIComponent(projectId)}`, {
        notes: notes.trim(),
      })
      setSavedFlash(true)
      onSaved?.(notes.trim())
      setTimeout(() => setSavedFlash(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save notes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="hc-patient-card hc-tab-panel border-indigo-500 space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-indigo-900">Internal notes</h2>
        {savedFlash ? <span className="text-xs font-medium text-emerald-700">Saved</span> : null}
      </div>
      <p className="text-xs text-indigo-700/80">
        For clinic staff only — not printed on prescription and not sent to the patient on WhatsApp.
      </p>

      {canEdit ? (
        <>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="Internal reminders for your team (e.g. behaviour, billing preference, follow-up context)…"
            className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save notes'}
          </button>
        </>
      ) : (
        <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
          {notes || 'No notes yet.'}
        </p>
      )}
    </section>
  )
}
