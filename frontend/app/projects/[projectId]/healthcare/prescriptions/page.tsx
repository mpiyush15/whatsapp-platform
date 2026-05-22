"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Eye, Loader2, Plus, RefreshCw, Search } from "lucide-react"
import { apiGet, apiPost } from "@/lib/api-client"
import { handlePrescriptionAction } from "@/lib/prescriptionActions"
import PrescriptionFormModal, { initialPrescriptionForm } from "../PrescriptionFormModal"

interface PatientRecord {
  patientId: string
  fullName: string
}

interface DoctorRecord {
  doctorId: string
  fullName: string
  specialization?: string | null
}

interface ClinicRecord {
  name?: string
  logoUrl?: string
  enablePrescriptionDesign?: boolean
  prescriptionBlankPdfUrl?: string
  headerColor?: string
  headerTextColor?: string
  headerFontWeight?: string
  footerColor?: string
  footerTextColor?: string
  footerFontWeight?: string
}

interface PrescriptionRecord {
  prescriptionId: string
  patientId: string
  doctorId: string
  diagnosis?: string
  status?: string
  issuedAt?: string | null
  followUpAt?: string | null
  notes?: string
  patientSnapshot?: {
    fullName?: string | null
  }
  doctorSnapshot?: {
    fullName?: string | null
    specialization?: string | null
  }
  medicines?: Array<{
    medicineName: string
    dosage?: string
    frequency?: string
    durationDays?: number
    instructions?: string
    quantity?: number
  }>
}

interface PatientsResponse {
  success: boolean
  data?: {
    patients: PatientRecord[]
  }
}

interface DoctorsResponse {
  success: boolean
  data?: {
    doctors: DoctorRecord[]
  }
}

interface PharmacyProductRecord {
  productId: string
  name: string
  genericName?: string | null
  strength?: string | null
  dosageForm?: string | null
  currentStock?: number
  status?: string
}

interface PharmacyProductsResponse {
  success: boolean
  data?: {
    products: PharmacyProductRecord[]
  }
}

interface PrescriptionsResponse {
  success: boolean
  data?: {
    prescriptions: PrescriptionRecord[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

interface ClinicResponse {
  success: boolean
  data?: ClinicRecord
}

const initialForm = {
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

const statusClassMap: Record<string, string> = {
  issued: "bg-amber-100 text-amber-700",
  dispensed: "bg-emerald-100 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  cancelled: "bg-rose-100 text-rose-700",
}

export default function HealthcarePrescriptionsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params.projectId as string
  const patientIdFromUrl = searchParams.get('patientId')
  const createNewFromUrl = searchParams.get('createNew') === 'true'

  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [doctors, setDoctors] = useState<DoctorRecord[]>([])
  const [medicineCatalog, setMedicineCatalog] = useState<PharmacyProductRecord[]>([])
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([])
  const [clinic, setClinic] = useState<ClinicRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [form, setForm] = useState(initialForm)
  const [total, setTotal] = useState(0)
  const [showModal, setShowModal] = useState(false)

  const loadClinic = useCallback(async () => {
    try {
      const payload = await apiGet<ClinicResponse>(`/healthcare/clinic/${encodeURIComponent(projectId)}`)
      setClinic(payload?.data || null)
    } catch (err) {
      console.error('Failed to load clinic settings:', err)
    }
  }, [projectId])

  const loadPrescriptions = useCallback(async (query = "") => {
    try {
      setLoading(true)
      setError("")

      const payload = await apiGet<PrescriptionsResponse>(`/healthcare/prescriptions?projectId=${encodeURIComponent(projectId)}&limit=50${query ? `&q=${encodeURIComponent(query)}` : ""}`)
      const list = payload?.data?.prescriptions || []

      setPrescriptions(list)
      setTotal(payload?.data?.pagination?.total || list.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prescriptions")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const openPrescriptionTemplate = async (rx: PrescriptionRecord) => {
    try {
      console.log('👁️ Opening prescription, clinic:', clinic)
      if (!clinic) {
        alert('Clinic settings not loaded yet. Please wait...')
        return
      }
      await handlePrescriptionAction({
        prescription: rx,
        clinic,
        action: 'view',
        projectId,
      })
    } catch (err) {
      console.error('Failed to open prescription:', err)
    }
  }

  const printPrescriptionTemplate = async (rx: PrescriptionRecord) => {
    try {
      console.log('🖨️  Printing prescription, clinic:', clinic)
      if (!clinic) {
        alert('Clinic settings not loaded yet. Please wait...')
        return
      }
      await handlePrescriptionAction({
        prescription: rx,
        clinic,
        action: 'print',
        projectId,
      })
    } catch (err) {
      console.error('Failed to print prescription:', err)
    }
  }

  const loadReferenceData = useCallback(async () => {
    try {
      const [patientsPayload, doctorsPayload, productsPayload] = await Promise.all([
        apiGet<PatientsResponse>(`/healthcare/patients?projectId=${encodeURIComponent(projectId)}&limit=200`),
        apiGet<DoctorsResponse>(`/healthcare/doctors?projectId=${encodeURIComponent(projectId)}&limit=200`),
        apiGet<PharmacyProductsResponse>(`/healthcare/pharmacy-products?projectId=${encodeURIComponent(projectId)}&status=active&limit=500`),
      ])

      setPatients(patientsPayload?.data?.patients || [])
      setDoctors(doctorsPayload?.data?.doctors || [])
      setMedicineCatalog(productsPayload?.data?.products || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load healthcare references")
    }
  }, [projectId])

  useEffect(() => {
    loadClinic()
    loadReferenceData()
    loadPrescriptions("")
    
    // Auto-open form if createNew param is true and patientId is provided
    if (createNewFromUrl && patientIdFromUrl) {
      setForm((prev) => ({ ...prev, patientId: patientIdFromUrl }))
      setShowModal(true)
    }
  }, [loadClinic, loadPrescriptions, loadReferenceData, createNewFromUrl, patientIdFromUrl])

  const metrics = useMemo(() => {
    return {
      issued: prescriptions.filter((prescription) => prescription.status === "issued").length,
      dispensed: prescriptions.filter((prescription) => prescription.status === "dispensed").length,
      followUps: prescriptions.filter((prescription) => {
        if (!prescription.followUpAt) return false
        return new Date(prescription.followUpAt).getTime() >= Date.now()
      }).length,
    }
  }, [prescriptions])

  const handleCreatePrescription = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError("")
      setSuccessMessage("")

      const payload = await apiPost<{ data?: { prescription: PrescriptionRecord } }>("/healthcare/prescriptions", {
        projectId,
        patientId: form.patientId,
        doctorId: form.doctorId,
        diagnosis: form.diagnosis,
        status: form.status,
        followUpAt: form.followUpAt ? new Date(form.followUpAt).toISOString() : null,
        notes: form.notes,
        medicines: [
          {
            medicineName: form.medicineName,
            dosage: form.dosage,
            frequency: form.frequency,
            durationDays: Number(form.durationDays || 0),
            quantity: Number(form.quantity || 1),
            instructions: form.instructions,
          },
        ],
      })

      if (payload?.data?.prescription) {
        setPrescriptions((current) => [payload.data!.prescription, ...current])
        setTotal((current) => current + 1)
      }

      setForm(initialForm)
      setSuccessMessage("Prescription created")
      setShowModal(false)
      loadPrescriptions(search)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create prescription")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Issued</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{metrics.issued}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Dispensed</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{metrics.dispensed}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Follow-ups due</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{metrics.followUps}</p>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Prescriptions</h2>
            <p className="text-sm text-slate-500">Doctor-issued medication records</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadPrescriptions(search)}
                placeholder="Patient, doctor, diagnosis…"
                className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={() => loadPrescriptions(search)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => { setShowModal(true); setError(""); setSuccessMessage("") }}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
            >
              <Plus className="h-4 w-4" /> New prescription
            </button>
          </div>
        </div>

        {error ? <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {successMessage ? <div className="mx-5 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Patient</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Diagnosis</th>
                <th className="px-4 py-3">Medicine(s)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Follow-up</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : prescriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-500">
                    No prescriptions yet. Click <span className="font-medium text-amber-600">New prescription</span> to start.
                  </td>
                </tr>
              ) : (
                prescriptions.map((rx) => (
                  <tr key={rx.prescriptionId} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-800">{rx.patientSnapshot?.fullName || rx.patientId}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {rx.doctorSnapshot?.fullName || rx.doctorId}
                      {rx.doctorSnapshot?.specialization ? (
                        <span className="ml-1 text-xs text-slate-400">({rx.doctorSnapshot.specialization})</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{rx.diagnosis || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {rx.medicines?.length ? rx.medicines.map((m) => m.medicineName).join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusClassMap[rx.status || ""] || "bg-slate-100 text-slate-600"}`}>
                        {rx.status || "issued"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{rx.issuedAt ? new Date(rx.issuedAt).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{rx.followUpAt ? new Date(rx.followUpAt).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void openPrescriptionTemplate(rx)
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void printPrescriptionTemplate(rx)
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          🖨️ Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PrescriptionFormModal
        show={showModal}
        onClose={() => setShowModal(false)}
        form={form}
        setForm={setForm}
        onSubmit={handleCreatePrescription}
        submitting={submitting}
        error={error}
        successMessage={successMessage}
        patients={patients}
        doctors={doctors}
        medicineCatalog={medicineCatalog}
      />
    </div>
  )
}
