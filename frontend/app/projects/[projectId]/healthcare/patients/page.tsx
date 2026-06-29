"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowUpDown, Loader2, Plus, RefreshCw, Search, Tag, X } from "lucide-react"
import { apiGet, apiPost, apiPut } from "@/lib/api-client"
import DataTable from "@/components/DataTable"
import { useHealthcareListLoader } from "@/lib/hooks/useHealthcareListLoader"
import { motion, AnimatePresence } from "framer-motion"

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
  tags?: string[]
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
  const router = useRouter()
  const projectId = params.projectId as string
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const { initialLoading, refreshing, run: runListLoad } = useHealthcareListLoader()
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [form, setForm] = useState(initialForm)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [limit] = useState(20)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [genderFilter, setGenderFilter] = useState("")
  const [sortBy, setSortBy] = useState("updatedAt")
  const [sortOrder, setSortOrder] = useState("desc")
  const [editingTagForPatient, setEditingTagForPatient] = useState<string | null>(null)
  const [newTag, setNewTag] = useState("")
  const [tagSaving, setTagSaving] = useState(false)

  const loadPatients = useCallback(async (query = "", pageNum = 1) => {
    try {
      const result = await runListLoad(async () => {
        setError("")
        const params = new URLSearchParams({
          projectId,
          page: String(pageNum),
          limit: String(limit),
          sortBy,
          sortOrder,
        })
        if (query) params.set("q", query)
        if (genderFilter) params.set("gender", genderFilter)

        const payload = await apiGet<PatientsResponse>(`/healthcare/patients?${params.toString()}`)
        const list = payload?.data?.patients || []
        const pagination = payload?.data?.pagination
        return { list, pagination }
      })

      if (!result) return

      setPatients(result.list)
      setTotal(result.pagination?.total || result.list.length)
      setTotalPages(result.pagination?.totalPages || 1)
      if (result.pagination?.page) {
        setPage(result.pagination.page)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients")
    }
  }, [projectId, limit, runListLoad, genderFilter, sortBy, sortOrder])

  useEffect(() => {
    void loadPatients(search, page)
  }, [page, projectId, genderFilter, sortBy, sortOrder])

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

  const columns = useMemo(() => [
    {
      key: "fullName",
      label: "Patient",
      sortable: true,
      render: (_: any, row: PatientRecord) => (
        <div>
          <p className="font-semibold text-slate-900">{row.fullName}</p>
          <p className="text-xs text-slate-500">{row.patientId}{row.medicalRecordNumber ? ` • ${row.medicalRecordNumber}` : ""}</p>
        </div>
      )
    },
    {
      key: "tags",
      label: "Tags",
      render: (_: any, row: PatientRecord) => (
        <div className="flex flex-wrap gap-1">
          {(row.tags || []).map(tag => (
            <span key={tag} className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">{tag}</span>
          ))}
        </div>
      )
    },
    {
      key: "phoneNumber",
      label: "Phone",
      render: (_: any, row: PatientRecord) => row.phoneNumber || row.whatsappNumber || "—"
    },
    {
      key: "gender",
      label: "Gender",
      sortable: true,
      render: (_: any, row: PatientRecord) => <span className="capitalize">{row.gender || "unknown"}</span>
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (_: any, row: PatientRecord) => {
        const status = String(row.status || "active").toLowerCase()
        const statusClass = statusClassMap[status] || "bg-slate-100 text-slate-700"
        return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${statusClass}`}>{status}</span>
      }
    },
    {
      key: "updatedAt",
      label: "Updated",
      sortable: true,
      render: (_: any, row: PatientRecord) => row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"
    }
  ], [])

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="space-y-6 p-6"
      >
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
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Filters and Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, file no., phone"
                    className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPage(1)
                    loadPatients(search, 1)
                  }}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Search
                </button>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="updatedAt">Last Updated</option>
                  <option value="fullName">Name</option>
                  <option value="createdAt">Created Date</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  <span>{sortOrder === "asc" ? "ASC" : "DESC"}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadPatients(search, page)}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
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

        <div className="mt-5">
          <DataTable
            wide
            columns={columns}
            data={patients}
            loading={initialLoading || refreshing}
            emptyMessage="No patients found for this project yet."
            actions={[
              {
                label: "Open patient",
                variant: "primary",
                onClick: (row) => router.push(`/projects/${projectId}/healthcare/patients/${row.patientId}`)
              }
            ]}
          />
        </div>
        </div>

        {!initialLoading && total > 0 ? (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-slate-600">
              Showing page {page} of {totalPages} ({total} patients)
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
      </motion.div>

      <AnimatePresence>
      {showCreateModal ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
          >
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
          </motion.div>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </>
  )
}
