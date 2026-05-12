"use client"

import { Dispatch, FormEvent } from "react"
import { Loader2, Plus, X } from "lucide-react"

export interface PrescriptionFormState {
  patientId: string
  doctorId: string
  diagnosis: string
  medicineName: string
  dosage: string
  frequency: string
  durationDays: string
  quantity: string
  instructions: string
  status: string
  followUpAt: string
  notes: string
}

export interface PrescriptionPatientOption {
  patientId: string
  fullName: string
}

export interface PrescriptionDoctorOption {
  doctorId: string
  fullName: string
  specialization?: string | null
}

export interface PrescriptionProductOption {
  productId: string
  name: string
  genericName?: string | null
  strength?: string | null
  dosageForm?: string | null
  unitPrice?: number
  mrp?: number
  taxPercent?: number
  currentStock?: number
  status?: string
}

export const initialPrescriptionForm: PrescriptionFormState = {
  patientId: "",
  doctorId: "",
  diagnosis: "",
  medicineName: "",
  dosage: "",
  frequency: "",
  durationDays: "5",
  quantity: "1",
  instructions: "",
  status: "issued",
  followUpAt: "",
  notes: "",
}

interface Props {
  show: boolean
  onClose: () => void
  form: PrescriptionFormState
  setForm: Dispatch<React.SetStateAction<PrescriptionFormState>>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  submitting: boolean
  error?: string
  successMessage?: string
  patients: PrescriptionPatientOption[]
  doctors: PrescriptionDoctorOption[]
  medicineCatalog: PrescriptionProductOption[]
  title?: string
}

export default function PrescriptionFormModal({
  show,
  onClose,
  form,
  setForm,
  onSubmit,
  submitting,
  error,
  successMessage,
  patients,
  doctors,
  medicineCatalog,
  title = "New prescription",
}: Props) {
  if (!show) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500">Create a doctor-issued prescription record.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {successMessage ? <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}

        <form onSubmit={onSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Patient</label>
              <select
                required
                value={form.patientId}
                onChange={(e) => setForm((c) => ({ ...c, patientId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
              >
                <option value="">Select patient</option>
                {patients.map((p) => (
                  <option key={p.patientId} value={p.patientId}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Doctor</label>
              <select
                required
                value={form.doctorId}
                onChange={(e) => setForm((c) => ({ ...c, doctorId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
              >
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d.doctorId} value={d.doctorId}>
                    {d.fullName}{d.specialization ? ` • ${d.specialization}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Diagnosis</label>
            <input
              value={form.diagnosis}
              onChange={(e) => setForm((c) => ({ ...c, diagnosis: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
              placeholder="Primary diagnosis"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Medicine</label>
            <input
              required
              list="pharmacy-medicine-options"
              value={form.medicineName}
              onChange={(e) => setForm((c) => ({ ...c, medicineName: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
              placeholder="Select from pharmacy catalog or type manually"
            />
            <datalist id="pharmacy-medicine-options">
              {medicineCatalog.map((medicine) => {
                const meta = [medicine.strength, medicine.dosageForm].filter(Boolean).join(" • ")
                const stock = typeof medicine.currentStock === "number" ? `Stock: ${medicine.currentStock}` : ""
                const labelBits = [medicine.genericName, meta, stock].filter(Boolean).join(" | ")
                return (
                  <option key={medicine.productId} value={medicine.name} label={labelBits || medicine.name} />
                )
              })}
            </datalist>
            <p className="mt-1 text-xs text-slate-500">Loaded {medicineCatalog.length} active medicines from pharmacy catalog.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Dosage</label>
              <input
                value={form.dosage}
                onChange={(e) => setForm((c) => ({ ...c, dosage: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
                placeholder="1 tablet"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Frequency</label>
              <input
                value={form.frequency}
                onChange={(e) => setForm((c) => ({ ...c, frequency: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
                placeholder="Twice daily"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
              >
                <option value="draft">Draft</option>
                <option value="issued">Issued</option>
                <option value="dispensed">Dispensed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Duration (days)</label>
              <input
                type="number"
                min={1}
                value={form.durationDays}
                onChange={(e) => setForm((c) => ({ ...c, durationDays: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Qty</label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((c) => ({ ...c, quantity: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Follow-up date</label>
              <input
                type="datetime-local"
                value={form.followUpAt}
                onChange={(e) => setForm((c) => ({ ...c, followUpAt: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Instructions</label>
            <input
              value={form.instructions}
              onChange={(e) => setForm((c) => ({ ...c, instructions: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
              placeholder="After meals, before bed, etc."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
              placeholder="Optional notes"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-70"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {submitting ? "Creating…" : "Create prescription"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
