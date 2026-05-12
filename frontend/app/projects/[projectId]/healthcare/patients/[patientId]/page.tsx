"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, ArrowLeft, FileText, Receipt, Save, X, Plus, Eye, Calendar, Pencil } from "lucide-react"
import { apiGet, apiPost, apiPut } from "@/lib/api-client"
import { handlePrescriptionAction } from "@/lib/prescriptionActions"
import PrescriptionFormModal, {
  initialPrescriptionForm,
  PrescriptionFormState,
  PrescriptionDoctorOption,
  PrescriptionProductOption,
} from "../../PrescriptionFormModal"

type MaybeString = string | null | undefined

interface HistoryEvent {
  eventType: "appointment" | "prescription" | "invoice" | "payment"
  eventId: string
  eventAt: string
  title: string
  subtitle?: string
  meta?: Record<string, any>
}

interface AppointmentRecord {
  appointmentId: string
  patientId: string
  doctorId?: string | null
  scheduledAt: string
  status?: string
  reason?: string | null
  patientSnapshot?: {
    fullName?: string | null
    phoneNumber?: string | null
  }
  doctorSnapshot?: {
    fullName?: string | null
    specialization?: string | null
  } | null
}

interface PrescriptionRecord {
  prescriptionId: string
  patientId: string
  doctorId?: string | null
  appointmentId?: string | null
  issuedAt?: string | null
  status?: string
  diagnosis?: string | null
  followUpAt?: string | null
  notes?: string | null
  medicines?: Array<{
    medicineName: string
    dosage?: string
    frequency?: string
    durationDays?: number
    quantity?: number
    instructions?: string
  }>
  doctorSnapshot?: {
    fullName?: string | null
    specialization?: string | null
  } | null
}

interface PatientInvoiceRecord {
  patientInvoiceId: string
  invoiceNumber: string
  patientId: string
  appointmentId?: string | null
  status?: string
  subtotal?: number
  tax?: number
  total?: number
  amountPaid?: number
  balanceDue?: number
  issuedAt?: string | null
  dueAt?: string | null
  items?: Array<{ description: string; quantity: number; unitPrice: number; total?: number }>
}

interface FollowUpRecord {
  followUpId: string
  patientId: string
  prescriptionId?: string | null
  doctorId?: string | null
  diagnosis?: string | null
  followUpDate: string
  followUpTime?: string | null
  treatmentType?: string | null
  notes?: string | null
  status?: string
  createdAt?: string | null
  doctorSnapshot?: {
    fullName?: string | null
    specialization?: string | null
  } | null
}

interface PatientHistoryResponse {
  success: boolean
  data?: {
    patient: {
      patientId: string
      fullName: string
      firstName?: string | null
      lastName?: string | null
      phoneNumber?: string | null
      whatsappNumber?: string | null
      email?: string | null
      medicalRecordNumber?: string | null
      status?: string
      gender?: string
      dateOfBirth?: string | null
      bloodGroup?: string | null
      allergies?: string[]
      chronicConditions?: string[]
      tags?: string[]
      notes?: string | null
      lastVisitAt?: string | null
      createdAt?: string | null
      updatedAt?: string | null
      address?: {
        line1?: string | null
        line2?: string | null
        city?: string | null
        state?: string | null
        postalCode?: string | null
        country?: string | null
      } | null
      emergencyContact?: {
        name?: string | null
        relation?: string | null
        phoneNumber?: string | null
      } | null
      communicationPreferences?: {
        whatsapp?: boolean
        sms?: boolean
        email?: boolean
        calls?: boolean
      } | null
      consentSummary?: {
        privacyAccepted?: boolean
        treatmentAccepted?: boolean
        whatsappOptIn?: boolean
        marketingOptIn?: boolean
        consentUpdatedAt?: string | null
      } | null
    }
    summary: {
      appointments: number
      prescriptions: number
      invoices: number
      payments: number
      totalBilled: number
      totalCollected: number
    }
    followUps: {
      total: number
      overdue: number
      upcoming: number
      items: Array<{
        prescriptionId: string
        followUpAt: string
        status: "overdue" | "upcoming"
        doctorName?: string | null
        diagnosis?: string | null
      }>
    }
    timeline: HistoryEvent[]
  }
}

interface PatientEditForm {
  fullName: string
  firstName: string
  lastName: string
  phoneNumber: string
  whatsappNumber: string
  email: string
  status: string
  gender: string
  dateOfBirth: string
  bloodGroup: string
  allergies: string
  chronicConditions: string
  tags: string
  notes: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  country: string
  emergencyName: string
  emergencyRelation: string
  emergencyPhoneNumber: string
  communicationWhatsapp: boolean
  communicationSms: boolean
  communicationEmail: boolean
  communicationCalls: boolean
  privacyAccepted: boolean
  treatmentAccepted: boolean
  whatsappOptIn: boolean
  marketingOptIn: boolean
}

const emptyEditForm: PatientEditForm = {
  fullName: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
  whatsappNumber: "",
  email: "",
  status: "active",
  gender: "unknown",
  dateOfBirth: "",
  bloodGroup: "",
  allergies: "",
  chronicConditions: "",
  tags: "",
  notes: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  emergencyName: "",
  emergencyRelation: "",
  emergencyPhoneNumber: "",
  communicationWhatsapp: true,
  communicationSms: false,
  communicationEmail: false,
  communicationCalls: true,
  privacyAccepted: false,
  treatmentAccepted: false,
  whatsappOptIn: false,
  marketingOptIn: false,
}

function InfoGroup({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{title}</p>
      <dl className="mt-3 space-y-2 text-sm text-slate-700">
        {items.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-slate-900 sm:text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

function formatList(values?: string[] | null) {
  return values && values.length > 0 ? values.join(", ") : "—"
}

function formatAddress(address?: PatientHistoryResponse["data"]["patient"]["address"]) {
  if (!address) return "—"
  const parts = [address.line1, address.line2, address.city, address.state, address.postalCode, address.country]
    .map((item) => item?.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : "—"
}

function getAge(dateOfBirth?: MaybeString) {
  if (!dateOfBirth) return "—"
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return "—"

  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDelta = today.getMonth() - dob.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
    age -= 1
  }
  return age >= 0 ? String(age) : "—"
}

function toInputDate(value?: MaybeString) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function toCsv(values?: string[] | null) {
  return values && values.length > 0 ? values.join(", ") : ""
}

function toList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildEditForm(patient?: PatientHistoryResponse["data"]["patient"] | null): PatientEditForm {
  if (!patient) return emptyEditForm

  return {
    fullName: patient.fullName || "",
    firstName: patient.firstName || "",
    lastName: patient.lastName || "",
    phoneNumber: patient.phoneNumber || "",
    whatsappNumber: patient.whatsappNumber || "",
    email: patient.email || "",
    status: patient.status || "active",
    gender: patient.gender || "unknown",
    dateOfBirth: toInputDate(patient.dateOfBirth),
    bloodGroup: patient.bloodGroup || "",
    allergies: toCsv(patient.allergies),
    chronicConditions: toCsv(patient.chronicConditions),
    tags: toCsv(patient.tags),
    notes: patient.notes || "",
    addressLine1: patient.address?.line1 || "",
    addressLine2: patient.address?.line2 || "",
    city: patient.address?.city || "",
    state: patient.address?.state || "",
    postalCode: patient.address?.postalCode || "",
    country: patient.address?.country || "India",
    emergencyName: patient.emergencyContact?.name || "",
    emergencyRelation: patient.emergencyContact?.relation || "",
    emergencyPhoneNumber: patient.emergencyContact?.phoneNumber || "",
    communicationWhatsapp: patient.communicationPreferences?.whatsapp ?? true,
    communicationSms: patient.communicationPreferences?.sms ?? false,
    communicationEmail: patient.communicationPreferences?.email ?? false,
    communicationCalls: patient.communicationPreferences?.calls ?? true,
    privacyAccepted: patient.consentSummary?.privacyAccepted ?? false,
    treatmentAccepted: patient.consentSummary?.treatmentAccepted ?? false,
    whatsappOptIn: patient.consentSummary?.whatsappOptIn ?? false,
    marketingOptIn: patient.consentSummary?.marketingOptIn ?? false,
  }
}

export default function OptimizedHealthcarePatientWorkspace() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const patientId = params.patientId as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<PatientEditForm>(emptyEditForm)
  const [payload, setPayload] = useState<PatientHistoryResponse["data"] | null>(null)

  const [patientAppointments, setPatientAppointments] = useState<AppointmentRecord[]>([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(false)
  const [appointmentsError, setAppointmentsError] = useState("")
  const [patientPrescriptions, setPatientPrescriptions] = useState<PrescriptionRecord[]>([])
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false)
  const [prescriptionsError, setPrescriptionsError] = useState("")
  const [patientInvoices, setPatientInvoices] = useState<PatientInvoiceRecord[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [invoicesError, setInvoicesError] = useState("")
  const [patientFollowUps, setPatientFollowUps] = useState<FollowUpRecord[]>([])
  const [followUpsLoading, setFollowUpsLoading] = useState(false)
  const [followUpsError, setFollowUpsError] = useState("")
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [followUpForm, setFollowUpForm] = useState({
    diagnosis: "",
    followUpDate: "",
    followUpTime: "",
    treatmentType: "consultation",
    notes: "",
  })
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false)
  const [followUpError, setFollowUpError] = useState("")
  const [followUpSuccessMessage, setFollowUpSuccessMessage] = useState("")
  const [workflowBusyId, setWorkflowBusyId] = useState<string | null>(null)
  const [clinic, setClinic] = useState<any>(null)
  const [prescriptionForm, setPrescriptionForm] = useState<PrescriptionFormState>(initialPrescriptionForm)
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [prescriptionSubmitting, setPrescriptionSubmitting] = useState(false)
  const [prescriptionError, setPrescriptionError] = useState("")
  const [prescriptionSuccessMessage, setPrescriptionSuccessMessage] = useState("")
  const [prescriptionDoctors, setPrescriptionDoctors] = useState<PrescriptionDoctorOption[]>([])
  const [prescriptionMedicineCatalog, setPrescriptionMedicineCatalog] = useState<PrescriptionProductOption[]>([])
  const pharmacyEnabled = Array.isArray(clinic?.enabledModules) && clinic.enabledModules.includes("pharmacy")
  const billingEnabled = !Array.isArray(clinic?.enabledModules) || clinic.enabledModules.includes("billing")
  /** Stock-linked / in-app medicine invoices from Rx (integrated dispensary). Consultation+catalog clinics keep this off unless explicitly enabled. */
  const pharmacyRxInvoicingEnabled =
    pharmacyEnabled &&
    billingEnabled &&
    (clinic?.billingSettings?.pharmacyBillingEnabled === true ||
      (clinic?.billingSettings?.pharmacyBillingEnabled == null && clinic?.clinicType !== "consultation"))

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      setSuccessMessage("")
      const response = await apiGet<PatientHistoryResponse>(`/healthcare/clinical/patients/${encodeURIComponent(patientId)}/history?projectId=${encodeURIComponent(projectId)}`)
      setPayload(response?.data || null)
      setEditForm(buildEditForm(response?.data?.patient || null))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patient history")
    } finally {
      setLoading(false)
    }
  }, [projectId, patientId])

  const loadClinic = useCallback(async () => {
    try {
      const response = await apiGet<{ success: boolean; data?: any }>(`/healthcare/clinic/${encodeURIComponent(projectId)}`)
      setClinic(response?.data || null)
    } catch (err) {
      console.error('Failed to load clinic settings:', err)
    }
  }, [projectId])

  const loadPrescriptionFormReferences = useCallback(async () => {
    try {
      const [doctorsPayload, productsPayload] = await Promise.all([
        apiGet<{ success: boolean; data?: { doctors: PrescriptionDoctorOption[] } }>(`/healthcare/doctors?projectId=${encodeURIComponent(projectId)}&limit=200`),
        apiGet<{ success: boolean; data?: { products: PrescriptionProductOption[] } }>(`/healthcare/pharmacy-products?projectId=${encodeURIComponent(projectId)}&status=active&limit=500`),
      ])
      setPrescriptionDoctors(doctorsPayload?.data?.doctors || [])
      setPrescriptionMedicineCatalog(productsPayload?.data?.products || [])
    } catch (err) {
      console.error('Failed to load prescription form references:', err)
    }
  }, [projectId])

  const openPrescriptionModal = useCallback(async () => {
    if (!payload?.patient) {
      return
    }

    try {
      setPrescriptionError("")
      setPrescriptionSuccessMessage("")
      if (prescriptionDoctors.length === 0 || prescriptionMedicineCatalog.length === 0) {
        await loadPrescriptionFormReferences()
      }
      setPrescriptionForm((prev) => ({ ...initialPrescriptionForm, patientId, doctorId: prev.doctorId }))
      setShowPrescriptionModal(true)
    } catch (err) {
      console.error('Failed to open prescription modal:', err)
      setPrescriptionError(err instanceof Error ? err.message : 'Failed to open prescription form')
    }
  }, [payload?.patient, patientId, prescriptionDoctors.length, prescriptionMedicineCatalog.length, loadPrescriptionFormReferences])

  const handleCreatePrescription = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setPrescriptionSubmitting(true)
      setPrescriptionError("")
      setPrescriptionSuccessMessage("")

      const payload = await apiPost<{ data?: { prescription: PrescriptionRecord } }>("/healthcare/prescriptions", {
        projectId,
        patientId: prescriptionForm.patientId,
        doctorId: prescriptionForm.doctorId,
        appointmentId: patientAppointments.find((appointment) => ["checked-in", "confirmed", "scheduled"].includes(String(appointment.status || "")))?.appointmentId || null,
        diagnosis: prescriptionForm.diagnosis,
        status: prescriptionForm.status,
        followUpAt: prescriptionForm.followUpAt ? new Date(prescriptionForm.followUpAt).toISOString() : null,
        notes: prescriptionForm.notes,
        medicines: [
          {
            medicineName: prescriptionForm.medicineName,
            dosage: prescriptionForm.dosage,
            frequency: prescriptionForm.frequency,
            durationDays: Number(prescriptionForm.durationDays || 0),
            quantity: Number(prescriptionForm.quantity || 1),
            instructions: prescriptionForm.instructions,
          },
        ],
      })

      if (payload?.data?.prescription) {
        setPatientPrescriptions((current) => [payload.data!.prescription, ...current])
        if (pharmacyRxInvoicingEnabled) {
          await createInvoiceFromPrescription(payload.data.prescription, { silent: true })
        }
        setPrescriptionSuccessMessage("Prescription created successfully")
      }

      setPrescriptionForm(initialPrescriptionForm)
      setShowPrescriptionModal(false)
      await loadHistory()
      await loadPatientPrescriptions()
    } catch (err) {
      setPrescriptionError(err instanceof Error ? err.message : "Failed to create prescription")
    } finally {
      setPrescriptionSubmitting(false)
    }
  }

  const loadPatientAppointments = useCallback(async () => {
    try {
      setAppointmentsLoading(true)
      setAppointmentsError("")

      const response = await apiGet<{ success: boolean; data?: { appointments: AppointmentRecord[] } }>(
        `/healthcare/appointments?projectId=${encodeURIComponent(projectId)}&patientId=${encodeURIComponent(patientId)}&limit=100`
      )

      const list = response?.data?.appointments || []
      setPatientAppointments(list)
    } catch (err) {
      setAppointmentsError(err instanceof Error ? err.message : "Failed to load appointments")
    } finally {
      setAppointmentsLoading(false)
    }
  }, [projectId, patientId])

  const loadPatientPrescriptions = useCallback(async () => {
    try {
      setPrescriptionsLoading(true)
      setPrescriptionsError("")
      const response = await apiGet<{ success: boolean; data?: { prescriptions: PrescriptionRecord[] } }>(
        `/healthcare/prescriptions?projectId=${encodeURIComponent(projectId)}&patientId=${encodeURIComponent(patientId)}&limit=100`
      )
      const list = response?.data?.prescriptions || []
      setPatientPrescriptions(list)
    } catch (err) {
      setPrescriptionsError(err instanceof Error ? err.message : "Failed to load prescriptions")
    } finally {
      setPrescriptionsLoading(false)
    }
  }, [projectId, patientId])

  const loadPatientInvoices = useCallback(async () => {
    try {
      setInvoicesLoading(true)
      setInvoicesError("")
      const response = await apiGet<{ success: boolean; data?: { invoices: PatientInvoiceRecord[] } }>(
        `/healthcare/invoices?projectId=${encodeURIComponent(projectId)}&patientId=${encodeURIComponent(patientId)}&limit=100`
      )
      setPatientInvoices(response?.data?.invoices || [])
    } catch (err) {
      setInvoicesError(err instanceof Error ? err.message : "Failed to load invoices")
    } finally {
      setInvoicesLoading(false)
    }
  }, [projectId, patientId])

  const loadPatientFollowUps = useCallback(async () => {
    try {
      setFollowUpsLoading(true)
      setFollowUpsError("")
      const response = await apiGet<{ success: boolean; data?: { followUps: FollowUpRecord[] } }>(
        `/healthcare/follow-ups?projectId=${encodeURIComponent(projectId)}&patientId=${encodeURIComponent(patientId)}&limit=100`
      )
      setPatientFollowUps(response?.data?.followUps || [])
    } catch (err) {
      setFollowUpsError(err instanceof Error ? err.message : "Failed to load follow-ups")
    } finally {
      setFollowUpsLoading(false)
    }
  }, [projectId, patientId])

  const createInvoice = useCallback(async ({
    appointmentId,
    items,
    notes,
  }: {
    appointmentId?: string | null
    items: Array<{ description: string; quantity: number; unitPrice: number; total?: number }>
    notes?: string
  }) => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.total ?? Number(item.quantity || 1) * Number(item.unitPrice || 0)), 0)
    const response = await apiPost<{ data?: { invoice: PatientInvoiceRecord } }>("/healthcare/invoices", {
      projectId,
      patientId,
      appointmentId: appointmentId || null,
      status: "issued",
      subtotal,
      tax: 0,
      discount: 0,
      total: subtotal,
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes,
      items,
    })

    if (response?.data?.invoice) {
      setPatientInvoices((current) => [response.data!.invoice, ...current.filter((invoice) => invoice.patientInvoiceId !== response.data!.invoice.patientInvoiceId)])
    }

    await loadHistory()
    return response?.data?.invoice
  }, [projectId, patientId, loadHistory])

  const createInvoiceFromPrescription = useCallback(async (prescription: PrescriptionRecord, options?: { silent?: boolean }) => {
    if (!pharmacyEnabled) {
      if (!options?.silent) setSuccessMessage("Pharmacy is disabled. Prescription medicines are clinical only, no medicine invoice created.")
      return null
    }
    if (!billingEnabled || !pharmacyRxInvoicingEnabled) {
      if (!options?.silent) {
        setSuccessMessage("Integrated pharmacy billing is off for this clinic. Use the pharmacy counter or enable pharmacy billing in Clinic setup.")
      }
      return null
    }

    const catalogByName = new Map(prescriptionMedicineCatalog.map((item) => [item.name.toLowerCase(), item]))
    const items = (prescription.medicines || [])
      .map((medicine) => {
        const product = catalogByName.get(String(medicine.medicineName || "").toLowerCase())
        if (!product) return null
        const quantity = Number(medicine.quantity || 1)
        const unitPrice = Number(product.unitPrice || product.mrp || 0)
        return {
          description: `${medicine.medicineName}${medicine.dosage ? ` - ${medicine.dosage}` : ""}`,
          quantity,
          unitPrice,
          total: quantity * unitPrice,
        }
      })
      .filter(Boolean) as Array<{ description: string; quantity: number; unitPrice: number; total: number }>

    if (!items.length) {
      if (!options?.silent) setSuccessMessage("No priced pharmacy medicines matched this prescription.")
      return null
    }

    const invoice = await createInvoice({
      appointmentId: prescription.appointmentId || null,
      items,
      notes: `Auto-created from prescription ${prescription.prescriptionId}`,
    })

    if (!options?.silent) {
      setSuccessMessage(`Medicine invoice ${invoice?.invoiceNumber || ""} created`)
      scrollToSection("section-billing")
    }
    return invoice
  }, [createInvoice, pharmacyEnabled, billingEnabled, pharmacyRxInvoicingEnabled, prescriptionMedicineCatalog])

  const completeAppointmentAndCreateInvoice = useCallback(async (appointment: AppointmentRecord) => {
    const feeValue = window.prompt("Consultation fee amount", "500")
    if (feeValue === null) return
    const fee = Number(feeValue || 0)
    if (Number.isNaN(fee) || fee < 0) {
      setAppointmentsError("Invalid consultation fee")
      return
    }

    try {
      setWorkflowBusyId(appointment.appointmentId)
      setAppointmentsError("")
      setSuccessMessage("")

      await apiPut(`/healthcare/appointments/${encodeURIComponent(appointment.appointmentId)}?projectId=${encodeURIComponent(projectId)}`, {
        projectId,
        patientId,
        doctorId: appointment.doctorId || null,
        scheduledAt: appointment.scheduledAt,
        reason: appointment.reason || "",
        status: "completed",
      })

      if (billingEnabled && fee > 0) {
        await createInvoice({
          appointmentId: appointment.appointmentId,
          items: [
            {
              description: `Consultation fee${appointment.doctorSnapshot?.fullName ? ` - ${appointment.doctorSnapshot.fullName}` : ""}`,
              quantity: 1,
              unitPrice: fee,
              total: fee,
            },
          ],
          notes: `Auto-created after appointment completion ${appointment.appointmentId}`,
        })
      }

      setSuccessMessage("Appointment completed and billing updated")
      await loadPatientAppointments()
      await loadPatientInvoices()
      scrollToSection("section-billing")
    } catch (err) {
      setAppointmentsError(err instanceof Error ? err.message : "Failed to complete appointment workflow")
    } finally {
      setWorkflowBusyId(null)
    }
  }, [projectId, patientId, billingEnabled, createInvoice, loadPatientAppointments, loadPatientInvoices])

  const viewPrescription = async (prescription: PrescriptionRecord) => {
    try {
      if (!clinic) {
        alert('Clinic settings not loaded yet. Please wait...')
        return
      }
      await handlePrescriptionAction({
        prescription,
        clinic,
        action: 'view'
      })
    } catch (err) {
      console.error('Failed to view prescription:', err)
    }
  }

  const printPrescription = async (prescription: PrescriptionRecord) => {
    try {
      if (!clinic) {
        alert('Clinic settings not loaded yet. Please wait...')
        return
      }
      await handlePrescriptionAction({
        prescription,
        clinic,
        action: 'print'
      })
    } catch (err) {
      console.error('Failed to print prescription:', err)
    }
  }

  const handleCreateFollowUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setFollowUpSubmitting(true)
      setFollowUpError("")
      setFollowUpSuccessMessage("")

      const response = await apiPost<{ data?: { followUp: FollowUpRecord } }>("/healthcare/follow-ups", {
        projectId,
        patientId,
        diagnosis: followUpForm.diagnosis,
        followUpDate: followUpForm.followUpDate,
        followUpTime: followUpForm.followUpTime || "10:00",
        treatmentType: followUpForm.treatmentType,
        notes: followUpForm.notes,
        status: "scheduled",
      })

      if (response?.data?.followUp) {
        setPatientFollowUps((current) => [response.data!.followUp, ...current])
        setFollowUpSuccessMessage("Follow-up scheduled successfully")
        setShowFollowUpModal(false)
        setFollowUpForm({
          diagnosis: "",
          followUpDate: "",
          followUpTime: "",
          treatmentType: "consultation",
          notes: "",
        })
        await loadHistory()
        await loadPatientFollowUps()
      }
    } catch (err) {
      setFollowUpError(err instanceof Error ? err.message : "Failed to create follow-up")
    } finally {
      setFollowUpSubmitting(false)
    }
  }

  useEffect(() => {
    loadHistory()
    loadClinic()
    loadPatientAppointments()
    loadPatientPrescriptions()
    loadPatientInvoices()
    loadPatientFollowUps()
  }, [loadHistory, loadClinic, loadPatientAppointments, loadPatientPrescriptions, loadPatientInvoices, loadPatientFollowUps])

  const timeline = useMemo(() => payload?.timeline || [], [payload?.timeline])
  const patient = payload?.patient
  const communicationPreferences = patient?.communicationPreferences
  const consentSummary = patient?.consentSummary

  const activityTimeline = useMemo(() => {
    return timeline.slice(0, 20).map((item) => ({
      title: item.title,
      subtitle: item.subtitle || "",
      type: item.eventType.charAt(0).toUpperCase() + item.eventType.slice(1),
      date: new Date(item.eventAt).toLocaleDateString("en-IN"),
      id: item.eventId,
    }))
  }, [timeline])

  const isUnderConsultation = useMemo(() => {
    if (!patientAppointments.length) return false
    const today = new Date().toDateString()
    return patientAppointments.some(apt => ['scheduled', 'confirmed', 'checked-in'].includes(String(apt.status || '')) && new Date(apt.scheduledAt).toDateString() === today)
  }, [patientAppointments])

  const handleSavePatient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setSaving(true)
      setError("")
      setSuccessMessage("")

      const updatePayload = {
        fullName: editForm.fullName,
        firstName: editForm.firstName || undefined,
        lastName: editForm.lastName || undefined,
        phoneNumber: editForm.phoneNumber || undefined,
        whatsappNumber: editForm.whatsappNumber || undefined,
        email: editForm.email || undefined,
        status: editForm.status,
        gender: editForm.gender,
        dateOfBirth: editForm.dateOfBirth || null,
        bloodGroup: editForm.bloodGroup || undefined,
        allergies: toList(editForm.allergies),
        chronicConditions: toList(editForm.chronicConditions),
        tags: toList(editForm.tags),
        notes: editForm.notes,
        address: {
          line1: editForm.addressLine1 || undefined,
          line2: editForm.addressLine2 || undefined,
          city: editForm.city || undefined,
          state: editForm.state || undefined,
          postalCode: editForm.postalCode || undefined,
          country: editForm.country || undefined,
        },
        emergencyContact: {
          name: editForm.emergencyName || undefined,
          relation: editForm.emergencyRelation || undefined,
          phoneNumber: editForm.emergencyPhoneNumber || undefined,
        },
        communicationPreferences: {
          whatsapp: editForm.communicationWhatsapp,
          sms: editForm.communicationSms,
          email: editForm.communicationEmail,
          calls: editForm.communicationCalls,
        },
        consentSummary: {
          privacyAccepted: editForm.privacyAccepted,
          treatmentAccepted: editForm.treatmentAccepted,
          whatsappOptIn: editForm.whatsappOptIn,
          marketingOptIn: editForm.marketingOptIn,
          consentUpdatedAt: new Date().toISOString(),
        },
      }

      await apiPut(`/healthcare/patients/${encodeURIComponent(patientId)}?projectId=${encodeURIComponent(projectId)}`, updatePayload)
      setSuccessMessage("Patient details updated successfully")
      setShowEditModal(false)
      await loadHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update patient")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full w-full bg-white pb-16 pt-1 text-slate-800">
      <div className="mx-auto w-full max-w-[min(100%,1600px)] space-y-8 px-4 py-6 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={() => router.push(`/projects/${projectId}/healthcare/patients`)}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Patients
        </button>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
        {successMessage ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{successMessage}</div> : null}

        {loading && !patient ? (
          <div className="flex justify-center py-16 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" />
          </div>
        ) : (
          <>
            <header className="border-b border-slate-200 pb-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900 lg:text-3xl">{patient?.fullName ?? "Patient"}</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {patient?.medicalRecordNumber ? `MRN ${patient.medicalRecordNumber} · ` : ""}
                    {patient?.patientId || "—"} · {getAge(patient?.dateOfBirth)} yrs · <span className="capitalize">{patient?.gender || "—"}</span>
                    {patient?.bloodGroup ? ` · ${patient.bloodGroup}` : ""}
                    <span className="text-slate-300"> · </span>
                    <span className={patient?.status === "active" ? "text-emerald-700" : "text-slate-600"}>
                      {patient?.status ? `${patient.status.charAt(0).toUpperCase()}${patient.status.slice(1)}` : "Active"}
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {payload?.summary.appointments ?? 0} visits · {payload?.summary.prescriptions ?? 0} prescriptions
                    {billingEnabled
                      ? ` · ₹${Math.max(Number(payload?.summary.totalBilled || 0) - Number(payload?.summary.totalCollected || 0), 0).toLocaleString("en-IN")} outstanding`
                      : ""}
                    {typeof payload?.followUps?.upcoming === "number" ? ` · ${payload.followUps.upcoming} follow-up(s)` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void openPrescriptionModal()}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    <FileText className="h-4 w-4 shrink-0" aria-hidden />
                    Rx
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFollowUpModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                    Follow-up
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/projects/${projectId}/healthcare/appointments?patientId=${encodeURIComponent(patientId)}`)}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Schedule
                  </button>
                  {billingEnabled ? (
                    <button
                      type="button"
                      onClick={() => scrollToSection("section-billing")}
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Billing
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => router.push(`/projects/${projectId}/contacts?patientId=${encodeURIComponent(patientId)}`)}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                    aria-label="Edit patient"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </header>

            <nav
              aria-label="Sections"
              className="sticky top-0 z-10 -mx-4 flex flex-wrap gap-1 border-b border-slate-200 bg-white/95 px-4 py-2 text-xs font-medium text-slate-500 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10"
            >
              {(
                [
                  ["section-clinical", "Clinical"],
                  ["section-visit", "Visits"],
                  ["section-rx", "Rx"],
                  ["section-followups", "Follow-ups"],
                  ...(billingEnabled ? ([["section-billing", "Billing"]] as const) : []),
                  ["section-record", "Contact"],
                  ["section-history", "Activity"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToSection(id)}
                  className="rounded-md px-2 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="space-y-10">
            <section id="section-clinical" className="scroll-mt-24 space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">Clinical</h2>
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">Today: </span>
                  {isUnderConsultation ? "Active visit scheduled for today." : "No active visit flagged for today."}
                </p>
                {patient?.allergies?.length || patient?.chronicConditions?.length ? (
                  <div className="space-y-2 border-t border-slate-100 pt-3 text-sm">
                    {patient?.allergies?.length ? (
                      <p>
                        <span className="font-medium text-amber-900">Allergies: </span>
                        {formatList(patient.allergies)}
                      </p>
                    ) : null}
                    {patient?.chronicConditions?.length ? (
                      <p>
                        <span className="font-medium text-slate-800">Chronic: </span>
                        {formatList(patient.chronicConditions)}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="border-t border-slate-100 pt-3 text-sm text-slate-500">No allergies or chronic conditions on file.</p>
                )}
                {patient?.notes ? (
                  <p className="border-t border-slate-100 pt-3 text-sm text-slate-600">
                    <span className="font-medium text-slate-800">Notes: </span>
                    {patient.notes}
                  </p>
                ) : null}
              </div>
            </section>

            <section id="section-visit" className="scroll-mt-24 space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">Visits</h2>
                <button
                  type="button"
                  onClick={() => router.push(`/projects/${projectId}/healthcare/appointments?patientId=${encodeURIComponent(patientId)}`)}
                  className="text-sm text-emerald-700 hover:text-emerald-800"
                >
                  Open calendar
                </button>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                {appointmentsError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{appointmentsError}</div>
                ) : appointmentsLoading ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : patientAppointments.length === 0 ? (
                  <p className="text-sm text-slate-500">No appointments yet. Use Schedule to book.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-2">When</th>
                          <th className="px-3 py-2">Doctor</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Reason</th>
                          <th className="px-3 py-2"> </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {patientAppointments.map((appointment) => (
                          <tr key={appointment.appointmentId}>
                            <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{new Date(appointment.scheduledAt).toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-slate-700">{appointment.doctorSnapshot?.fullName || appointment.doctorId || "—"}</td>
                            <td className="px-3 py-2.5 capitalize text-slate-700">{appointment.status || "scheduled"}</td>
                            <td className="min-w-0 max-w-md px-3 py-2.5 text-slate-600">{appointment.reason || "—"}</td>
                            <td className="px-3 py-2.5">
                              {appointment.status === "completed" ? (
                                <span className="text-xs font-medium text-emerald-700">Done</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    void completeAppointmentAndCreateInvoice(appointment)
                                  }}
                                  disabled={workflowBusyId === appointment.appointmentId}
                                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                                >
                                  {workflowBusyId === appointment.appointmentId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Receipt className="h-3 w-3" />}
                                  Complete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            <section id="section-rx" className="scroll-mt-24 space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">Prescriptions</h2>
                <button type="button" onClick={() => void openPrescriptionModal()} className="text-sm text-emerald-700 hover:text-emerald-800">
                  New prescription
                </button>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                {prescriptionsError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{prescriptionsError}</div>
                ) : prescriptionsLoading ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : patientPrescriptions.length === 0 ? (
                  <p className="text-sm text-slate-500">No prescriptions yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Doctor</th>
                          <th className="px-3 py-2">Diagnosis</th>
                          <th className="px-3 py-2"> </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {patientPrescriptions.map((prescription) => (
                          <tr key={prescription.prescriptionId}>
                            <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">
                              {prescription.issuedAt ? new Date(prescription.issuedAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">{prescription.doctorSnapshot?.fullName || prescription.doctorId || "—"}</td>
                            <td className="min-w-0 max-w-lg px-3 py-2.5 text-slate-600">{prescription.diagnosis || "—"}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    void viewPrescription(prescription)
                                  }}
                                  className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  <Eye className="h-3 w-3" /> View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void printPrescription(prescription)
                                  }}
                                  className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  Print
                                </button>
                                {pharmacyRxInvoicingEnabled ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void createInvoiceFromPrescription(prescription)
                                    }}
                                    className="inline-flex items-center gap-0.5 rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
                                  >
                                    <Receipt className="h-3 w-3" /> Invoice
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            <section id="section-followups" className="scroll-mt-24 space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">Follow-ups</h2>
                <button type="button" onClick={() => setShowFollowUpModal(true)} className="text-sm text-emerald-700 hover:text-emerald-800">
                  Schedule
                </button>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                {followUpsError ? (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{followUpsError}</div>
                ) : null}
                {followUpsLoading ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : patientFollowUps.length === 0 ? (
                  <p className="text-sm text-slate-500">No follow-ups scheduled.</p>
                ) : (
                  <ul className="space-y-2">
                    {patientFollowUps.map((followUp) => {
                      const followUpDateTime = new Date(followUp.followUpDate)
                      const isOverdue = followUpDateTime < new Date() && followUp.status !== "completed"
                      return (
                        <li
                          key={followUp.followUpId}
                          className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{followUp.diagnosis || "Follow-up"}</p>
                            <p className="text-slate-500">
                              {followUpDateTime.toLocaleDateString("en-IN")}
                              {followUp.followUpTime ? ` · ${followUp.followUpTime}` : ""}
                              {followUp.doctorSnapshot?.fullName ? ` · ${followUp.doctorSnapshot.fullName}` : ""}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                              isOverdue
                                ? "bg-red-100 text-red-800"
                                : followUp.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            {isOverdue ? "Overdue" : followUp.status === "completed" ? "Done" : "Upcoming"}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </section>

            {billingEnabled ? (
              <section id="section-billing" className="scroll-mt-24 space-y-2">
                <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">Billing</h2>
                <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Billed </span>
                      <span className="font-medium text-slate-900">₹{(payload?.summary.totalBilled ?? 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Collected </span>
                      <span className="font-medium text-slate-900">₹{(payload?.summary.totalCollected ?? 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Due </span>
                      <span className="font-medium text-rose-700">
                        ₹{Math.max(Number(payload?.summary.totalBilled || 0) - Number(payload?.summary.totalCollected || 0), 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                  {invoicesError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{invoicesError}</div>
                  ) : invoicesLoading ? (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Loading…</span>
                    </div>
                  ) : patientInvoices.length === 0 ? (
                    <p className="text-sm text-slate-500">No invoices yet.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-slate-100">
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead>
                          <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                            <th className="px-3 py-2">Invoice</th>
                            <th className="px-3 py-2">Issued</th>
                            <th className="px-3 py-2">Total</th>
                            <th className="px-3 py-2">Due</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {patientInvoices.map((invoice) => (
                            <tr key={invoice.patientInvoiceId}>
                              <td className="px-3 py-2 font-medium text-slate-900">{invoice.invoiceNumber}</td>
                              <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                                {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString("en-IN") : "—"}
                              </td>
                              <td className="px-3 py-2 text-slate-700">₹{Number(invoice.total || 0).toLocaleString("en-IN")}</td>
                              <td className="px-3 py-2 text-rose-600">₹{Number(invoice.balanceDue || 0).toLocaleString("en-IN")}</td>
                              <td className="px-3 py-2 capitalize text-slate-600">{invoice.status || "draft"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            <section id="section-record" className="scroll-mt-24 space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">Contact</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoGroup
                  title="Contact"
                  items={[
                    ["Phone", patient?.phoneNumber || "—"],
                    ["WhatsApp", patient?.whatsappNumber || "—"],
                    ["Email", patient?.email || "—"],
                    ["Address", formatAddress(patient?.address) || "—"],
                  ]}
                />
                <InfoGroup
                  title="Consent"
                  items={[
                    ["WhatsApp opt-in", consentSummary?.whatsappOptIn ? "Yes" : "No"],
                    ["Privacy", consentSummary?.privacyAccepted ? "Yes" : "No"],
                    ["SMS", communicationPreferences?.sms ? "Yes" : "No"],
                  ]}
                />
              </div>
            </section>

            <section id="section-history" className="scroll-mt-24 space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">Activity</h2>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                {activityTimeline.length === 0 ? (
                  <p className="text-sm text-slate-500">No events yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {activityTimeline.map((item) => (
                      <li key={item.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-slate-900">{item.title}</p>
                          <time className="shrink-0 text-xs text-slate-400">{item.date}</time>
                        </div>
                        {item.subtitle ? <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p> : null}
                        <span className="mt-2 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{item.type}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
            </div>
          </>
        )}
      </div>

      {showEditModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Edit patient details</h2>
                <p className="text-sm text-slate-600">Update profile, contact, consent, and clinical details from this page.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePatient} className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Basic profile</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
                      <input value={editForm.fullName} onChange={(e) => setEditForm((c) => ({ ...c, fullName: e.target.value }))} required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Gender</label>
                      <select value={editForm.gender} onChange={(e) => setEditForm((c) => ({ ...c, gender: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400">
                        <option value="unknown">Unknown</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                      <select value={editForm.status} onChange={(e) => setEditForm((c) => ({ ...c, status: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Date of birth</label>
                      <input type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm((c) => ({ ...c, dateOfBirth: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Blood group</label>
                      <select value={editForm.bloodGroup} onChange={(e) => setEditForm((c) => ({ ...c, bloodGroup: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400">
                        <option value="">—</option>
                        <option value="A+">A+</option><option value="A-">A-</option>
                        <option value="B+">B+</option><option value="B-">B-</option>
                        <option value="O+">O+</option><option value="O-">O-</option>
                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Contact</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Phone number</label>
                      <input value={editForm.phoneNumber} onChange={(e) => setEditForm((c) => ({ ...c, phoneNumber: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">WhatsApp number</label>
                      <input value={editForm.whatsappNumber} onChange={(e) => setEditForm((c) => ({ ...c, whatsappNumber: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                      <input type="email" value={editForm.email} onChange={(e) => setEditForm((c) => ({ ...c, email: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Address</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2"><input placeholder="Line 1" value={editForm.addressLine1} onChange={(e) => setEditForm((c) => ({ ...c, addressLine1: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" /></div>
                    <div className="sm:col-span-2"><input placeholder="Line 2" value={editForm.addressLine2} onChange={(e) => setEditForm((c) => ({ ...c, addressLine2: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" /></div>
                    <div><input placeholder="City" value={editForm.city} onChange={(e) => setEditForm((c) => ({ ...c, city: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" /></div>
                    <div><input placeholder="State" value={editForm.state} onChange={(e) => setEditForm((c) => ({ ...c, state: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" /></div>
                    <div><input placeholder="Postal code" value={editForm.postalCode} onChange={(e) => setEditForm((c) => ({ ...c, postalCode: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" /></div>
                    <div><input placeholder="Country" value={editForm.country} onChange={(e) => setEditForm((c) => ({ ...c, country: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" /></div>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Emergency contact</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2"><input placeholder="Name" value={editForm.emergencyName} onChange={(e) => setEditForm((c) => ({ ...c, emergencyName: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" /></div>
                    <div><input placeholder="Relation" value={editForm.emergencyRelation} onChange={(e) => setEditForm((c) => ({ ...c, emergencyRelation: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" /></div>
                    <div><input placeholder="Phone number" value={editForm.emergencyPhoneNumber} onChange={(e) => setEditForm((c) => ({ ...c, emergencyPhoneNumber: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" /></div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Clinical details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Allergies</label>
                      <input value={editForm.allergies} onChange={(e) => setEditForm((c) => ({ ...c, allergies: e.target.value }))} placeholder="Comma separated" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Chronic conditions</label>
                      <input value={editForm.chronicConditions} onChange={(e) => setEditForm((c) => ({ ...c, chronicConditions: e.target.value }))} placeholder="Comma separated" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Tags</label>
                      <input value={editForm.tags} onChange={(e) => setEditForm((c) => ({ ...c, tags: e.target.value }))} placeholder="Comma separated" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                      <textarea rows={5} value={editForm.notes} onChange={(e) => setEditForm((c) => ({ ...c, notes: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Communication & consent</h3>
                  <div className="grid gap-3 sm:grid-cols-2 text-sm text-slate-700">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={editForm.communicationWhatsapp} onChange={(e) => setEditForm((c) => ({ ...c, communicationWhatsapp: e.target.checked }))} /> WhatsApp preferred</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={editForm.communicationSms} onChange={(e) => setEditForm((c) => ({ ...c, communicationSms: e.target.checked }))} /> SMS preferred</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={editForm.communicationEmail} onChange={(e) => setEditForm((c) => ({ ...c, communicationEmail: e.target.checked }))} /> Email preferred</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={editForm.communicationCalls} onChange={(e) => setEditForm((c) => ({ ...c, communicationCalls: e.target.checked }))} /> Calls preferred</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={editForm.privacyAccepted} onChange={(e) => setEditForm((c) => ({ ...c, privacyAccepted: e.target.checked }))} /> Privacy accepted</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={editForm.treatmentAccepted} onChange={(e) => setEditForm((c) => ({ ...c, treatmentAccepted: e.target.checked }))} /> Treatment accepted</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={editForm.whatsappOptIn} onChange={(e) => setEditForm((c) => ({ ...c, whatsappOptIn: e.target.checked }))} /> WhatsApp opt-in</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={editForm.marketingOptIn} onChange={(e) => setEditForm((c) => ({ ...c, marketingOptIn: e.target.checked }))} /> Marketing opt-in</label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showFollowUpModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Schedule Follow-up</h2>
                <p className="text-sm text-slate-600">Follow-ups have lower consultation fees and help maintain continuity of care.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFollowUpModal(false)}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {followUpError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{followUpError}</div>
            )}

            {followUpSuccessMessage && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{followUpSuccessMessage}</div>
            )}

            <form onSubmit={handleCreateFollowUp} className="space-y-4">
              <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Diagnosis / Reason for follow-up</label>
                  <input
                    type="text"
                    value={followUpForm.diagnosis}
                    onChange={(e) => setFollowUpForm((c) => ({ ...c, diagnosis: e.target.value }))}
                    required
                    placeholder="e.g., Post-surgery checkup, Blood pressure monitoring"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Follow-up Date</label>
                    <input
                      type="date"
                      value={followUpForm.followUpDate}
                      onChange={(e) => setFollowUpForm((c) => ({ ...c, followUpDate: e.target.value }))}
                      required
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Time (optional)</label>
                    <input
                      type="time"
                      value={followUpForm.followUpTime}
                      onChange={(e) => setFollowUpForm((c) => ({ ...c, followUpTime: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Treatment Type</label>
                  <select
                    value={followUpForm.treatmentType}
                    onChange={(e) => setFollowUpForm((c) => ({ ...c, treatmentType: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400"
                  >
                    <option value="consultation">Consultation</option>
                    <option value="checkup">Checkup</option>
                    <option value="test">Test</option>
                    <option value="vaccination">Vaccination</option>
                    <option value="physical-therapy">Physical Therapy</option>
                    <option value="medication-review">Medication Review</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
                  <textarea
                    value={followUpForm.notes}
                    onChange={(e) => setFollowUpForm((c) => ({ ...c, notes: e.target.value }))}
                    placeholder="Additional notes for this follow-up..."
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFollowUpModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={followUpSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {followUpSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {followUpSubmitting ? "Scheduling..." : "Schedule Follow-up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <PrescriptionFormModal
        show={showPrescriptionModal}
        onClose={() => setShowPrescriptionModal(false)}
        form={prescriptionForm}
        setForm={setPrescriptionForm}
        onSubmit={handleCreatePrescription}
        submitting={prescriptionSubmitting}
        error={prescriptionError}
        successMessage={prescriptionSuccessMessage}
        patients={patient ? [{ patientId: patient.patientId, fullName: patient.fullName }] : []}
        doctors={prescriptionDoctors}
        medicineCatalog={prescriptionMedicineCatalog}
      />
    </div>
  )
}
