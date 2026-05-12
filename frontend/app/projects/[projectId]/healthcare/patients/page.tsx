"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Loader2, Plus, RefreshCw, Search, X } from "lucide-react"
import { apiGet, apiPost } from "@/lib/api-client"

interface PatientRecord {
  patientId: string
  medicalRecordNumber?: string | null
  fullName: string
  gender?: string
  phoneNumber?: string | null
  whatsappNumber?: string | null
  email?: string | null
  status?: string
  updatedAt?: string
}

interface PatientsResponse {
  success: boolean
  data?: {
    patients: PatientRecord[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

const initialForm = {
  fullName: "",
  countryCode: "+91",
  phoneNumber: "",
  email: "",
  gender: "unknown",
  age: "",
  address: "",
}

const statusClassMap: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-amber-100 text-amber-700",
  archived: "bg-slate-200 text-slate-700",
}

export default function HealthcarePatientsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [form, setForm] = useState(initialForm)
  const [total, setTotal] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const loadPatients = useCallback(async (query = "") => {
    try {
      setLoading(true)
      setError("")

      const payload = await apiGet<PatientsResponse>(`/healthcare/patients?projectId=${encodeURIComponent(projectId)}&limit=50${query ? `&q=${encodeURIComponent(query)}` : ""}`)
      const list = payload?.data?.patients || []

      setPatients(list)
      setTotal(payload?.data?.pagination?.total || list.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadPatients("")
  }, [loadPatients])

  const activePatients = useMemo(
    () => patients.filter((patient) => patient.status === "active").length,
    [patients]
  )

  const handleCreatePatient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError("")
      setSuccessMessage("")

      const fullPhone = form.phoneNumber
        ? `${form.countryCode}${form.phoneNumber.replace(/^0+/, "")}`
        : ""

      const patientPayload = {
        fullName: form.fullName,
        phoneNumber: fullPhone,
        whatsappNumber: fullPhone,
        email: form.email || undefined,
        gender: form.gender,
        bloodGroup: (form as typeof initialForm & { bloodGroup?: string }).bloodGroup || undefined,
        address: form.address ? { line1: form.address } : undefined,
        projectId,
      }

      const payload = await apiPost<{ data?: { patient: PatientRecord } }>("/healthcare/patients", patientPayload)

      if (payload?.data?.patient) {
        setPatients((current) => [payload.data!.patient, ...current])
        setTotal((current) => current + 1)
      }

      setForm(initialForm)
      setSuccessMessage("Patient created successfully")
      setShowCreateModal(false)
      loadPatients(search)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create patient")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total patients</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Active in current list</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{activePatients}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Project scope</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{projectId}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Patients</h2>
            <p className="text-sm text-slate-600">Clinic-grade patient registry with quick actions.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, MRN, phone"
                className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={() => loadPatients(search)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => loadPatients(search)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Add patient
            </button>
          </div>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {successMessage ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading patients...
            </div>
          ) : patients.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No patients found for this project yet.</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Gender</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {patients.map((patient) => {
                  const status = String(patient.status || "active").toLowerCase()
                  const statusClass = statusClassMap[status] || "bg-slate-100 text-slate-700"
                  return (
                    <tr key={patient.patientId} className="hover:bg-emerald-50/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{patient.fullName}</p>
                        <p className="text-xs text-slate-500">{patient.patientId}{patient.medicalRecordNumber ? ` • ${patient.medicalRecordNumber}` : ""}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{patient.phoneNumber || patient.whatsappNumber || "—"}</td>
                      <td className="px-4 py-3 capitalize text-slate-700">{patient.gender || "unknown"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${statusClass}`}>{status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{patient.updatedAt ? new Date(patient.updatedAt).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/projects/${projectId}/healthcare/patients/${patient.patientId}`}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Add patient</h3>
                <p className="text-sm text-slate-600">Create a patient record using modal-first workflow.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
                <input
                  required
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                  placeholder="Patient full name"
                />
              </div>

              {/* Phone with country code */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone number (WhatsApp)</label>
                <div className="flex gap-2">
                  <select
                    value={form.countryCode}
                    onChange={(event) => setForm((current) => ({ ...current, countryCode: event.target.value }))}
                    className="w-24 shrink-0 rounded-xl border border-slate-200 px-2 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                  >
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+61">🇦🇺 +61</option>
                    <option value="+65">🇸🇬 +65</option>
                    <option value="+60">🇲🇾 +60</option>
                    <option value="+92">🇵🇰 +92</option>
                    <option value="+880">🇧🇩 +880</option>
                    <option value="+94">🇱🇰 +94</option>
                  </select>
                  <input
                    value={form.phoneNumber}
                    onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value.replace(/\D/g, "") }))}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                    placeholder="10-digit number"
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">Enter 10 digits — country code will be added automatically</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Age</label>
                  <input
                    type="number"
                    min={0}
                    max={150}
                    value={form.age}
                    onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                    placeholder="Years"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Blood group</label>
                  <select
                    value={(form as any).bloodGroup || ""}
                    onChange={(event) => setForm((current) => ({ ...current, bloodGroup: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                  >
                    <option value="">—</option>
                    <option>A+</option><option>A-</option>
                    <option>B+</option><option>B-</option>
                    <option>O+</option><option>O-</option>
                    <option>AB+</option><option>AB-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                  placeholder="Street, city, state (optional)"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                  placeholder="Optional"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {submitting ? "Creating..." : "Create patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
