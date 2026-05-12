"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2, Plus, RefreshCw } from "lucide-react"
import { apiGet, apiPost } from "@/lib/api-client"
import DataTable from "@/components/DataTable"

interface PatientRecord {
  patientId: string
  fullName: string
}

interface ConsentRecord {
  consentId: string
  patientId: string
  consentType: string
  status: string
  channel?: string
  purpose?: string
  collectedAt?: string
  expiresAt?: string | null
  notes?: string
}

interface PatientsResponse {
  success: boolean
  data?: {
    patients: PatientRecord[]
  }
}

interface ConsentsResponse {
  success: boolean
  data?: {
    consents: ConsentRecord[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

const initialForm = {
  patientId: "",
  consentType: "privacy",
  status: "granted",
  channel: "web",
  purpose: "Routine care communication and operational workflow consent",
  expiresAt: "",
  notes: "",
}

export default function HealthcareCompliancePage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [consents, setConsents] = useState<ConsentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [form, setForm] = useState(initialForm)
  const [total, setTotal] = useState(0)

  const loadConsents = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      const payload = await apiGet<ConsentsResponse>(`/healthcare/consents?projectId=${encodeURIComponent(projectId)}&limit=50`)
      const list = payload?.data?.consents || []

      setConsents(list)
      setTotal(payload?.data?.pagination?.total || list.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load consent records")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const loadPatients = useCallback(async () => {
    try {
      const payload = await apiGet<PatientsResponse>(`/healthcare/patients?projectId=${encodeURIComponent(projectId)}&limit=200`)
      setPatients(payload?.data?.patients || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients")
    }
  }, [projectId])

  useEffect(() => {
    loadPatients()
    loadConsents()
  }, [loadConsents, loadPatients])

  const patientNameMap = useMemo(() => {
    return new Map(patients.map((patient) => [patient.patientId, patient.fullName]))
  }, [patients])

  const metrics = useMemo(() => {
    return {
      granted: consents.filter((consent) => consent.status === "granted").length,
      revoked: consents.filter((consent) => consent.status === "revoked").length,
      expiringSoon: consents.filter((consent) => {
        if (!consent.expiresAt) return false
        const expiresAt = new Date(consent.expiresAt).getTime()
        const now = Date.now()
        const sevenDays = 7 * 24 * 60 * 60 * 1000
        return expiresAt >= now && expiresAt <= now + sevenDays
      }).length,
    }
  }, [consents])

  const consentColumns = useMemo(
    () => [
      {
        key: "patientId",
        label: "Patient",
        render: (value: string) => patientNameMap.get(value) || value,
      },
      {
        key: "consentType",
        label: "Consent type",
        render: (value: string) => (
          <span className="inline-block rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium uppercase text-violet-700">
            {value}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (value: string) => (
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium uppercase ${value === "granted" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            {value}
          </span>
        ),
      },
      { key: "channel", label: "Channel", render: (value: string) => value || "web" },
      {
        key: "expiresAt",
        label: "Expires",
        render: (value: string) => (value ? new Date(value).toLocaleDateString() : "—"),
      },
      { key: "purpose", label: "Purpose", render: (value: string) => value || "—" },
    ],
    [patientNameMap]
  )

  const handleCreateConsent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError("")
      setSuccessMessage("")

      const payload = await apiPost<{ data?: { consent: ConsentRecord } }>("/healthcare/consents", {
        projectId,
        patientId: form.patientId,
        consentType: form.consentType,
        status: form.status,
        channel: form.channel,
        purpose: form.purpose,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        notes: form.notes,
      })

      if (payload?.data?.consent) {
        setConsents((current) => [payload.data!.consent, ...current])
        setTotal((current) => current + 1)
      }

      setForm(initialForm)
      setSuccessMessage("Consent record created successfully")
      loadConsents()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create consent record")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total consent records</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Granted</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{metrics.granted}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Revoked</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{metrics.revoked}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Expiring in 7 days</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{metrics.expiringSoon}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Consent records</h2>
              <p className="text-sm text-slate-600">Maintain consent evidence for privacy, treatment, and messaging use cases.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                loadPatients()
                loadConsents()
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {successMessage ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}

          <div className="mt-5">
            <DataTable
              columns={consentColumns}
              data={consents as any[]}
              loading={loading}
              error={null}
              emptyMessage="No consent records added yet."
              rowClassName="hover:bg-violet-50/30"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add consent record</h2>
            <p className="mt-1 text-sm text-slate-600">Capture auditable consent status before healthcare messaging or data workflows.</p>
          </div>

          <form onSubmit={handleCreateConsent} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Patient</label>
              <select
                required
                value={form.patientId}
                onChange={(event) => setForm((current) => ({ ...current, patientId: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400"
              >
                <option value="">Select patient</option>
                {patients.map((patient) => (
                  <option key={patient.patientId} value={patient.patientId}>{patient.fullName}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Consent type</label>
                <select
                  value={form.consentType}
                  onChange={(event) => setForm((current) => ({ ...current, consentType: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400"
                >
                  <option value="privacy">Privacy</option>
                  <option value="treatment">Treatment</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="marketing">Marketing</option>
                  <option value="reminder">Reminder</option>
                  <option value="telemedicine">Telemedicine</option>
                  <option value="data-sharing">Data sharing</option>
                  <option value="prescription">Prescription</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400"
                >
                  <option value="granted">Granted</option>
                  <option value="revoked">Revoked</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Collection channel</label>
              <select
                value={form.channel}
                onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400"
              >
                <option value="web">Web</option>
                <option value="paper">Paper</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="verbal">Verbal</option>
                <option value="imported">Imported</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Purpose</label>
              <textarea
                value={form.purpose}
                onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}
                className="h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Expiry date</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className="h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400"
                placeholder="Optional compliance or evidence note"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || patients.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {submitting ? "Saving consent..." : "Create consent record"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
