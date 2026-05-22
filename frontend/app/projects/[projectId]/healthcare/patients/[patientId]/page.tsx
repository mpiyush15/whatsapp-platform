"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, ArrowLeft, FileText, Receipt, Save, X, Plus, Eye, Calendar, Pencil, MessageCircle } from "lucide-react"
import { apiGet, apiPost, apiPut } from "@/lib/api-client"
import { authService } from "@/lib/auth"
import { getPrescriptionPdfBlobUrl, printPrescriptionPdf } from "@/lib/prescriptionActions"
import DataTable from "@/components/DataTable"
import { PrescriptionViewDrawer } from "@/components/healthcare/patient/PrescriptionViewDrawer"
import { computeAgeYears } from "@/lib/prescriptionPdf"
import { BookVisitModal, type BookVisitDoctorOption } from "@/components/healthcare/patient/BookVisitModal"
import { PatientClinicalNotes } from "@/components/healthcare/patient/PatientClinicalNotes"
import { PatientTabNav } from "@/components/healthcare/patient/PatientTabNav"
import {
  PatientPastActivitySection,
  type PatientVisitHistoryPrescription,
  type PatientVisitHistoryRow,
} from "@/components/healthcare/patient/PatientPastActivitySection"
import { PatientTodayVisitsTable } from "@/components/healthcare/patient/PatientTodayVisitsTable"
import {
  PATIENT_TABS,
  canBookVisit,
  canEditPatientNotes,
  canFinishVisitWithFee,
  canViewCompletedTodayVisits,
  canWritePrescription,
  defaultTabForRole,
  resolveClinicStaffRole,
  tabsForStaffRole,
  type PatientTabId,
} from "@/lib/healthcarePatientUi"
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
  updatedAt?: string | null
  frontdesk?: {
    completedAt?: string | null
  } | null
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
  patientSnapshot?: {
    fullName?: string | null
    phoneNumber?: string | null
    ageYears?: number | string | null
    gender?: string | null
  } | null
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

interface PatientPaymentRecord {
  patientPaymentId: string
  patientId: string
  patientInvoiceId?: string | null
  amount: number
  method?: string | null
  status?: string | null
  paidAt?: string | null
  referenceNumber?: string | null
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
    visits?: PatientVisitHistoryRow[]
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
  const [visitHistory, setVisitHistory] = useState<PatientVisitHistoryRow[]>([])
  const [visitHistoryLoading, setVisitHistoryLoading] = useState(false)

  const [patientAppointments, setPatientAppointments] = useState<AppointmentRecord[]>([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(false)
  const [appointmentsError, setAppointmentsError] = useState("")
  const [patientPrescriptions, setPatientPrescriptions] = useState<PrescriptionRecord[]>([])
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false)
  const [prescriptionsError, setPrescriptionsError] = useState("")
  const [patientInvoices, setPatientInvoices] = useState<PatientInvoiceRecord[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [invoicesError, setInvoicesError] = useState("")
  const [patientPayments, setPatientPayments] = useState<PatientPaymentRecord[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
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
  const [activeTab, setActiveTab] = useState<PatientTabId>("today")
  const [sessionUser, setSessionUser] = useState<ReturnType<typeof authService.getCurrentUser>>(null)
  const [completeVisitModal, setCompleteVisitModal] = useState<{
    appointment: AppointmentRecord
    fee: string
  } | null>(null)
  const [showBookVisitModal, setShowBookVisitModal] = useState(false)
  const [bookVisitDefaults, setBookVisitDefaults] = useState({ visitType: "consultation", title: "Book visit" })
  const [visitDoctors, setVisitDoctors] = useState<BookVisitDoctorOption[]>([])
  const [clinic, setClinic] = useState<any>(null)
  const [prescriptionForm, setPrescriptionForm] = useState<PrescriptionFormState>(initialPrescriptionForm)
  const [prescriptionLinkedAppointmentId, setPrescriptionLinkedAppointmentId] = useState<string | null>(null)
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [prescriptionSubmitting, setPrescriptionSubmitting] = useState(false)
  const [prescriptionError, setPrescriptionError] = useState("")
  const [prescriptionSuccessMessage, setPrescriptionSuccessMessage] = useState("")
  const [lastSavedPrescription, setLastSavedPrescription] = useState<PrescriptionRecord | null>(null)
  const [prescriptionActionBusyId, setPrescriptionActionBusyId] = useState<string | null>(null)
  const [rxDrawerOpen, setRxDrawerOpen] = useState(false)
  const [rxDrawerRx, setRxDrawerRx] = useState<PrescriptionRecord | null>(null)
  const [rxDrawerPdfUrl, setRxDrawerPdfUrl] = useState<string | null>(null)
  const [rxDrawerLoading, setRxDrawerLoading] = useState(false)
  const [rxDrawerPrinting, setRxDrawerPrinting] = useState(false)
  const [rxDrawerError, setRxDrawerError] = useState("")
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

  const staffRole = useMemo(
    () => resolveClinicStaffRole(sessionUser, projectId),
    [sessionUser, projectId]
  )
  const visibleTabIds = useMemo(
    () => tabsForStaffRole(staffRole, billingEnabled),
    [staffRole, billingEnabled]
  )
  const visibleTabs = useMemo(
    () => PATIENT_TABS.filter((tab) => visibleTabIds.includes(tab.id)),
    [visibleTabIds]
  )
  const showWritePrescription = canWritePrescription(staffRole)
  const showFinishWithFee = canFinishVisitWithFee(staffRole)
  const showEditNotes = canEditPatientNotes(staffRole)
  const showBookVisit = canBookVisit(staffRole)
  const showCompletedTodayVisits = canViewCompletedTodayVisits(staffRole)
  const linkedDoctorId =
    sessionUser?.healthcareStaffProfileByProject?.[projectId]?.linkedDoctorId || null

  const openBookVisitModal = useCallback(
    async (options?: { visitType?: string; title?: string }) => {
      try {
        if (visitDoctors.length === 0) {
          const doctorsPayload = await apiGet<{ success: boolean; data?: { doctors: BookVisitDoctorOption[] } }>(
            `/healthcare/doctors?projectId=${encodeURIComponent(projectId)}&limit=200`
          )
          setVisitDoctors(doctorsPayload?.data?.doctors || [])
        }
        setBookVisitDefaults({
          visitType: options?.visitType || "consultation",
          title: options?.title || "Book visit",
        })
        setShowBookVisitModal(true)
      } catch (err) {
        setAppointmentsError(err instanceof Error ? err.message : "Could not open booking form")
      }
    },
    [projectId, visitDoctors.length]
  )

  useEffect(() => {
    setSessionUser(authService.getCurrentUser())
  }, [])

  const [tabInitialized, setTabInitialized] = useState(false)
  useEffect(() => {
    if (!sessionUser || tabInitialized) return
    const preferred = defaultTabForRole(staffRole)
    if (visibleTabIds.includes(preferred)) {
      setActiveTab(preferred)
    } else if (visibleTabIds[0]) {
      setActiveTab(visibleTabIds[0])
    }
    setTabInitialized(true)
  }, [sessionUser, staffRole, visibleTabIds, tabInitialized])

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      setSuccessMessage("")
      const response = await apiGet<PatientHistoryResponse>(`/healthcare/clinical/patients/${encodeURIComponent(patientId)}/history?projectId=${encodeURIComponent(projectId)}`)
      setPayload(response?.data || null)
      setVisitHistory(response?.data?.visits || [])
      setEditForm(buildEditForm(response?.data?.patient || null))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patient history")
    } finally {
      setLoading(false)
    }
  }, [projectId, patientId])

  const loadVisitHistory = useCallback(async () => {
    try {
      setVisitHistoryLoading(true)
      const response = await apiGet<PatientHistoryResponse>(
        `/healthcare/clinical/patients/${encodeURIComponent(patientId)}/history?projectId=${encodeURIComponent(projectId)}`
      )
      const data = response?.data || null
      if (data) {
        setPayload((current) => (current ? { ...current, ...data } : data))
        setVisitHistory(data.visits || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load visit history")
    } finally {
      setVisitHistoryLoading(false)
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

  const openPrescriptionModal = useCallback(
    async (appointment?: AppointmentRecord | null) => {
      if (!payload?.patient) {
        return
      }

      try {
        setPrescriptionError("")
        setPrescriptionSuccessMessage("")
        if (prescriptionDoctors.length === 0 || prescriptionMedicineCatalog.length === 0) {
          await loadPrescriptionFormReferences()
        }
        const doctorId =
          appointment?.doctorId ||
          prescriptionDoctors[0]?.doctorId ||
          ""
        setPrescriptionLinkedAppointmentId(appointment?.appointmentId || null)
        setPrescriptionForm({
          ...initialPrescriptionForm,
          patientId,
          doctorId,
          diagnosis: appointment?.reason || "",
        })
        setShowPrescriptionModal(true)
      } catch (err) {
        console.error("Failed to open prescription modal:", err)
        setPrescriptionError(err instanceof Error ? err.message : "Failed to open prescription form")
      }
    },
    [
      payload?.patient,
      patientId,
      prescriptionDoctors,
      prescriptionDoctors.length,
      prescriptionMedicineCatalog.length,
      loadPrescriptionFormReferences,
    ]
  )

  const handleCreatePrescription = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setPrescriptionSubmitting(true)
      setPrescriptionError("")
      setPrescriptionSuccessMessage("")

      const payload = await apiPost<{
        data?: { prescription: PrescriptionRecord; invoice?: PatientInvoiceRecord }
      }>("/healthcare/prescriptions", {
        projectId,
        patientId: prescriptionForm.patientId,
        doctorId: prescriptionForm.doctorId,
        appointmentId:
          prescriptionLinkedAppointmentId ||
          patientAppointments.find((appointment) =>
            ["checked-in", "confirmed", "scheduled"].includes(String(appointment.status || ""))
          )?.appointmentId ||
          null,
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
        const saved = payload.data.prescription
        const autoInvoice = payload.data.invoice
        setPatientPrescriptions((current) => [saved, ...current])
        setLastSavedPrescription(saved)
        if (autoInvoice) {
          setPatientInvoices((current) => [
            autoInvoice,
            ...current.filter((inv) => inv.patientInvoiceId !== autoInvoice.patientInvoiceId),
          ])
          setPrescriptionSuccessMessage(
            `Prescription saved. Bill ${autoInvoice.invoiceNumber || ""} created — reception can record payment.`
          )
        } else if (billingEnabled) {
          setPrescriptionSuccessMessage("Prescription saved. Bill will appear when billing is enabled.")
        } else {
          setPrescriptionSuccessMessage("Prescription saved.")
        }
        await loadPatientInvoices()
        await loadPatientPayments()
        void openPrescriptionDrawer(saved)
      }

      setPrescriptionForm(initialPrescriptionForm)
      setPrescriptionLinkedAppointmentId(null)
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

  const loadPatientPayments = useCallback(async () => {
    try {
      setPaymentsLoading(true)
      const response = await apiGet<{ success: boolean; data?: { payments: PatientPaymentRecord[] } }>(
        `/healthcare/payments?projectId=${encodeURIComponent(projectId)}&patientId=${encodeURIComponent(patientId)}&limit=100`
      )
      setPatientPayments(response?.data?.payments || [])
    } catch (err) {
      console.error("Failed to load patient payments:", err)
      setPatientPayments([])
    } finally {
      setPaymentsLoading(false)
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
      setActiveTab("billing")
    }
    return invoice
  }, [createInvoice, pharmacyEnabled, billingEnabled, pharmacyRxInvoicingEnabled, prescriptionMedicineCatalog])

  const confirmFinishVisit = useCallback(
    async (appointment: AppointmentRecord, fee: number) => {
      try {
        setWorkflowBusyId(appointment.appointmentId)
        setAppointmentsError("")
        setSuccessMessage("")

        await apiPut(
          `/healthcare/appointments/${encodeURIComponent(appointment.appointmentId)}?projectId=${encodeURIComponent(projectId)}`,
          {
            projectId,
            patientId,
            doctorId: appointment.doctorId || null,
            scheduledAt: appointment.scheduledAt,
            reason: appointment.reason || "",
            status: "completed",
          }
        )

        if (billingEnabled && fee > 0 && showFinishWithFee) {
          await createInvoice({
            appointmentId: appointment.appointmentId,
            items: [
              {
                description: `Visit charge${appointment.doctorSnapshot?.fullName ? ` - ${appointment.doctorSnapshot.fullName}` : ""}`,
                quantity: 1,
                unitPrice: fee,
                total: fee,
              },
            ],
            notes: `After visit ${appointment.appointmentId}`,
          })
        }

        setSuccessMessage("Visit marked as finished")
        setCompleteVisitModal(null)
        await loadPatientAppointments()
        await loadPatientInvoices()
        await loadHistory()

        if (showWritePrescription) {
          setActiveTab("prescription")
          await openPrescriptionModal()
        }
      } catch (err) {
        setAppointmentsError(err instanceof Error ? err.message : "Could not finish visit")
      } finally {
        setWorkflowBusyId(null)
      }
    },
    [
      projectId,
      patientId,
      billingEnabled,
      showFinishWithFee,
      showWritePrescription,
      createInvoice,
      loadPatientAppointments,
      loadPatientInvoices,
      loadHistory,
      openPrescriptionModal,
    ]
  )

  const requestFinishVisit = useCallback(
    (appointment: AppointmentRecord) => {
      if (showFinishWithFee && billingEnabled) {
        setCompleteVisitModal({ appointment, fee: "500" })
        return
      }
      void confirmFinishVisit(appointment, 0)
    },
    [showFinishWithFee, billingEnabled, confirmFinishVisit]
  )

  const resolvePrescriptionForPdf = useCallback(
    async (prescription: PrescriptionRecord): Promise<PrescriptionRecord> => {
      let rx = prescription
      const needsFetch = Boolean(rx.prescriptionId) && !rx.medicines?.length

      if (needsFetch && rx.prescriptionId) {
        const detail = await apiGet<{ success?: boolean; data?: { prescription: PrescriptionRecord } }>(
          `/healthcare/prescriptions/${encodeURIComponent(rx.prescriptionId)}?projectId=${encodeURIComponent(projectId)}`
        )
        if (detail?.data?.prescription) {
          rx = detail.data.prescription
        }
      }

      const doctorFromList = prescriptionDoctors.find((d) => d.doctorId === rx.doctorId)
      const patientRecord = payload?.patient
      const ageYears =
        patientRecord?.dateOfBirth != null ? computeAgeYears(patientRecord.dateOfBirth) : null
      return {
        ...rx,
        patientSnapshot: {
          fullName: rx.patientSnapshot?.fullName || patientRecord?.fullName || "Patient",
          phoneNumber: rx.patientSnapshot?.phoneNumber || patientRecord?.phoneNumber || null,
          ageYears: ageYears ?? undefined,
          gender: patientRecord?.gender || undefined,
        },
        doctorSnapshot: {
          fullName: rx.doctorSnapshot?.fullName || doctorFromList?.fullName || "Doctor",
          specialization: rx.doctorSnapshot?.specialization || doctorFromList?.specialization || null,
        },
        medicines: rx.medicines?.length
          ? rx.medicines
          : prescription.medicines?.length
            ? prescription.medicines
            : [],
      }
    },
    [projectId, payload?.patient, prescriptionDoctors]
  )

  const closePrescriptionDrawer = useCallback(() => {
    if (rxDrawerPdfUrl) URL.revokeObjectURL(rxDrawerPdfUrl)
    setRxDrawerPdfUrl(null)
    setRxDrawerRx(null)
    setRxDrawerOpen(false)
    setRxDrawerLoading(false)
    setRxDrawerPrinting(false)
    setRxDrawerError("")
    setPrescriptionActionBusyId(null)
  }, [rxDrawerPdfUrl])

  const buildClinicPdfConfig = useCallback(() => {
    if (!clinic) return null
    return {
      ...clinic,
      name: clinic.name,
      prescriptionBlankPdfUrl: clinic.prescriptionBlankPdfUrl,
      enablePrescriptionDesign: clinic.enablePrescriptionDesign,
    }
  }, [clinic])

  const openPrescriptionDrawer = useCallback(
    async (prescription: PrescriptionRecord) => {
      const clinicConfig = buildClinicPdfConfig()
      if (!clinicConfig) {
        setPrescriptionError("Clinic settings still loading. Wait a moment and try again.")
        return
      }

      if (rxDrawerPdfUrl) URL.revokeObjectURL(rxDrawerPdfUrl)
      setRxDrawerPdfUrl(null)
      setRxDrawerRx(prescription)
      setRxDrawerOpen(true)
      setRxDrawerLoading(true)
      setRxDrawerError("")
      setPrescriptionError("")
      setPrescriptionActionBusyId(prescription.prescriptionId)

      try {
        const rx = await resolvePrescriptionForPdf(prescription)
        if (!rx.medicines?.length) {
          setRxDrawerError("No medicines on this prescription.")
          return
        }
        setRxDrawerRx(rx)
        const url = await getPrescriptionPdfBlobUrl({
          prescription: rx,
          clinic: clinicConfig,
          projectId,
        })
        setRxDrawerPdfUrl(url)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load prescription"
        setRxDrawerError(message)
        console.error("Failed to load prescription preview:", err)
      } finally {
        setRxDrawerLoading(false)
        setPrescriptionActionBusyId(null)
      }
    },
    [buildClinicPdfConfig, projectId, resolvePrescriptionForPdf, rxDrawerPdfUrl]
  )

  const printFromPrescriptionDrawer = useCallback(async () => {
    const clinicConfig = buildClinicPdfConfig()
    if (!rxDrawerRx || !clinicConfig) return
    try {
      setRxDrawerPrinting(true)
      setRxDrawerError("")
      const rx = await resolvePrescriptionForPdf(rxDrawerRx)
      await printPrescriptionPdf({
        prescription: rx,
        clinic: clinicConfig,
        projectId,
      })
    } catch (err) {
      setRxDrawerError(err instanceof Error ? err.message : "Could not print")
    } finally {
      setRxDrawerPrinting(false)
    }
  }, [buildClinicPdfConfig, projectId, resolvePrescriptionForPdf, rxDrawerRx])

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
        setFollowUpSuccessMessage("Return visit booked")
        setActiveTab("followup")
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
    loadPatientPayments()
    loadPatientFollowUps()
  }, [loadHistory, loadClinic, loadPatientAppointments, loadPatientPrescriptions, loadPatientInvoices, loadPatientPayments, loadPatientFollowUps])

  const timeline = useMemo(() => payload?.timeline || [], [payload?.timeline])
  const patient = payload?.patient
  const communicationPreferences = patient?.communicationPreferences
  const consentSummary = patient?.consentSummary

  const invoiceNumberById = useMemo(
    () => new Map(patientInvoices.map((inv) => [inv.patientInvoiceId, inv.invoiceNumber])),
    [patientInvoices]
  )

  const historyPrescriptionToRecord = useCallback(
    (rx: PatientVisitHistoryPrescription): PrescriptionRecord => ({
      prescriptionId: rx.prescriptionId,
      patientId,
      issuedAt: rx.issuedAt,
      diagnosis: rx.diagnosis,
      followUpAt: rx.followUpAt,
      notes: rx.notes,
      medicines: rx.medicines,
      doctorSnapshot: rx.doctorSnapshot,
    }),
    [patientId]
  )

  useEffect(() => {
    if (activeTab === "history") {
      void loadVisitHistory()
    }
  }, [activeTab, loadVisitHistory])

  const isUnderConsultation = useMemo(() => {
    if (!patientAppointments.length) return false
    const today = new Date().toDateString()
    return patientAppointments.some(
      (apt) =>
        ["scheduled", "confirmed", "checked-in"].includes(String(apt.status || "")) &&
        new Date(apt.scheduledAt).toDateString() === today
    )
  }, [patientAppointments])

  const todayAppointments = useMemo(() => {
    const today = new Date().toDateString()
    return patientAppointments
      .filter((apt) => new Date(apt.scheduledAt).toDateString() === today)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  }, [patientAppointments])

  const patchTodayAppointment = useCallback(
    async (
      appointment: AppointmentRecord,
      updates: { status?: string; scheduledAt?: string },
      successMsg: string
    ) => {
      try {
        setWorkflowBusyId(appointment.appointmentId)
        setAppointmentsError("")
        await apiPut(
          `/healthcare/appointments/${encodeURIComponent(appointment.appointmentId)}?projectId=${encodeURIComponent(projectId)}`,
          {
            projectId,
            patientId,
            doctorId: appointment.doctorId || null,
            scheduledAt: updates.scheduledAt ?? appointment.scheduledAt,
            reason: appointment.reason || "",
            status: updates.status ?? appointment.status ?? "scheduled",
          }
        )
        setSuccessMessage(successMsg)
        await loadPatientAppointments()
        await loadHistory()
      } catch (err) {
        setAppointmentsError(err instanceof Error ? err.message : "Could not update visit")
      } finally {
        setWorkflowBusyId(null)
      }
    },
    [projectId, patientId, loadPatientAppointments, loadHistory]
  )

  const handleCancelTodayVisit = useCallback(
    (appointment: AppointmentRecord) => {
      if (!window.confirm("Cancel this visit? It will be removed from today's list.")) return
      void patchTodayAppointment(appointment, { status: "cancelled" }, "Visit cancelled")
    },
    [patchTodayAppointment]
  )

  const handleNoShowTodayVisit = useCallback(
    (appointment: AppointmentRecord) => {
      void patchTodayAppointment(appointment, { status: "no-show" }, "Marked as did not come")
    },
    [patchTodayAppointment]
  )

  const handleDelayTodayVisit = useCallback(
    (appointment: AppointmentRecord) => {
      const next = new Date(appointment.scheduledAt)
      next.setMinutes(next.getMinutes() + 30)
      void patchTodayAppointment(
        appointment,
        { scheduledAt: next.toISOString() },
        `Visit delayed to ${next.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
      )
    },
    [patchTodayAppointment]
  )

  const handleCheckInTodayVisit = useCallback(
    (appointment: AppointmentRecord) => {
      void patchTodayAppointment(appointment, { status: "checked-in" }, "Patient checked in")
    },
    [patchTodayAppointment]
  )

  const handleOpenCompletedTodayVisit = useCallback(
    async (appointment: AppointmentRecord) => {
      const linkedRx = patientPrescriptions.find(
        (rx) => rx.appointmentId && rx.appointmentId === appointment.appointmentId
      )

      setActiveTab("prescription")

      if (linkedRx) {
        void openPrescriptionDrawer(linkedRx)
        return
      }

      if (showWritePrescription) {
        await openPrescriptionModal(appointment)
        return
      }

      setPrescriptionError("No prescription linked to this visit yet.")
    },
    [patientPrescriptions, showWritePrescription, openPrescriptionModal, openPrescriptionDrawer]
  )

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
    <div className="min-h-full w-full pb-16 pt-1 text-slate-800">
      <div className="mx-auto w-full max-w-[min(100%,1600px)] space-y-6 px-4 py-6 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={() => router.push(`/projects/${projectId}/healthcare/patients`)}
          className="inline-flex items-center gap-2 text-sm font-medium text-teal-800 hover:text-teal-950"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Back to patients
        </button>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
        {successMessage ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{successMessage}</div> : null}
        {prescriptionSuccessMessage ? (
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
            <p>{prescriptionSuccessMessage}</p>
            {lastSavedPrescription ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => void openPrescriptionDrawer(lastSavedPrescription)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Open prescription
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {prescriptionError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{prescriptionError}</div>
        ) : null}

        {loading && !patient ? (
          <div className="flex justify-center py-16 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" />
          </div>
        ) : (
          <>
            <header className="hc-patient-card border-l-4 border-l-teal-500 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 lg:text-3xl">{patient?.fullName ?? "Patient"}</h1>
                    {isUnderConsultation ? (
                      <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">In clinic today</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {patient?.medicalRecordNumber ? `File no. ${patient.medicalRecordNumber} · ` : ""}
                    {getAge(patient?.dateOfBirth)} yrs · <span className="capitalize">{patient?.gender || "—"}</span>
                    {patient?.bloodGroup ? ` · ${patient.bloodGroup}` : ""}
                    {patient?.phoneNumber ? ` · ${patient.phoneNumber}` : ""}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {payload?.summary.appointments ?? 0} visits · {payload?.summary.prescriptions ?? 0} prescriptions
                    {billingEnabled && visibleTabIds.includes("billing")
                      ? ` · ₹${Math.max(Number(payload?.summary.totalBilled || 0) - Number(payload?.summary.totalCollected || 0), 0).toLocaleString("en-IN")} due`
                      : ""}
                    {typeof payload?.followUps?.upcoming === "number" && payload.followUps.upcoming > 0
                      ? ` · ${payload.followUps.upcoming} return visit(s)`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {showWritePrescription ? (
                    <button
                      type="button"
                      onClick={() => void openPrescriptionModal()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
                    >
                      <FileText className="h-4 w-4 shrink-0" aria-hidden />
                      Write prescription
                    </button>
                  ) : null}
                  {(staffRole === "doctor" || staffRole === "head_doctor" || staffRole === "owner" || staffRole === "receptionist") ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("followup")
                        setShowFollowUpModal(true)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
                    >
                      <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                      Book return visit
                    </button>
                  ) : null}
                  {visibleTabIds.includes("messages") ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/projects/${projectId}/live-chat-v2`)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-medium text-green-900 hover:bg-green-100"
                    >
                      <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                      WhatsApp
                    </button>
                  ) : null}
                  {(staffRole === "owner" || staffRole === "admin" || staffRole === "receptionist") ? (
                    <button
                      type="button"
                      onClick={() => setShowEditModal(true)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                      aria-label="Edit patient"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </header>

            <PatientTabNav tabs={visibleTabs} activeTab={activeTab} onChange={setActiveTab} />

            <div className="space-y-6">
            {activeTab === "today" ? (
            <div className="space-y-4">
              <PatientTodayVisitsTable
                appointments={todayAppointments}
                loading={appointmentsLoading}
                error={appointmentsError}
                workflowBusyId={workflowBusyId}
                canWritePrescription={showWritePrescription}
                canBookVisit={showBookVisit}
                includeCompleted={showCompletedTodayVisits}
                onComplete={requestFinishVisit}
                onOpenCompleted={handleOpenCompletedTodayVisit}
                onCancel={handleCancelTodayVisit}
                onDelay={handleDelayTodayVisit}
                onNoShow={handleNoShowTodayVisit}
                onCheckIn={handleCheckInTodayVisit}
                onBookVisit={() => void openBookVisitModal({ visitType: "consultation", title: "Book visit" })}
                onWritePrescription={() => void openPrescriptionModal()}
                onBookReturnVisit={() => {
                  void openBookVisitModal({ visitType: "follow-up", title: "Book return visit" })
                }}
              />
            {(patient?.allergies?.length || patient?.chronicConditions?.length) ? (
              <section className="hc-patient-card border-amber-200 bg-amber-50/50 p-4 text-sm">
                {patient?.allergies?.length ? (
                  <p>
                    <span className="font-semibold text-amber-900">Allergies: </span>
                    {formatList(patient.allergies)}
                  </p>
                ) : null}
                {patient?.chronicConditions?.length ? (
                  <p className={patient?.allergies?.length ? "mt-2" : ""}>
                    <span className="font-semibold text-slate-800">Long-term conditions: </span>
                    {formatList(patient.chronicConditions)}
                  </p>
                ) : null}
              </section>
            ) : null}
            </div>
            ) : null}

            {activeTab === "notes" ? (
              <PatientClinicalNotes
                projectId={projectId}
                patientId={patientId}
                initialNotes={patient?.notes}
                canEdit={showEditNotes}
                onSaved={(notes) => {
                  setPayload((current) =>
                    current?.patient ? { ...current, patient: { ...current.patient, notes } } : current
                  )
                  setSuccessMessage("Internal notes saved")
                }}
              />
            ) : null}

            {activeTab === "visits" ? (
            <section className="hc-patient-card hc-tab-panel border-blue-500 space-y-3 p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-sm font-semibold text-blue-900">All visits</h2>
                {showBookVisit ? (
                  <button
                    type="button"
                    onClick={() => void openBookVisitModal({ visitType: "consultation", title: "Book next visit" })}
                    className="text-sm font-medium text-blue-700 hover:text-blue-900"
                  >
                    Book next visit
                  </button>
                ) : null}
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                {appointmentsError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{appointmentsError}</div>
                ) : appointmentsLoading ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : patientAppointments.length === 0 ? (
                  <p className="text-sm text-slate-500">No visits yet. Tap Book new visit.</p>
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
                                  onClick={() => requestFinishVisit(appointment)}
                                  disabled={workflowBusyId === appointment.appointmentId}
                                  className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                                >
                                  {workflowBusyId === appointment.appointmentId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Receipt className="h-3 w-3" />}
                                  Finish visit
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
            ) : null}

            {activeTab === "prescription" && showWritePrescription ? (
            <section className="hc-patient-card hc-tab-panel border-violet-500 space-y-3 p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-violet-900">Prescriptions</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Tap a row to open preview on the right</p>
                </div>
                <button
                  type="button"
                  onClick={() => void openPrescriptionModal()}
                  className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
                >
                  Write new
                </button>
              </div>
              {prescriptionsError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{prescriptionsError}</div>
              ) : null}
              <DataTable
                wide
                columns={[
                  {
                    key: "issuedAt",
                    label: "Date",
                    render: (value: string) =>
                      value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
                  },
                  {
                    key: "doctor",
                    label: "Doctor",
                    render: (_: unknown, row: PrescriptionRecord) =>
                      row.doctorSnapshot?.fullName || row.doctorId || "—",
                  },
                  {
                    key: "diagnosis",
                    label: "Diagnosis",
                    render: (value: string) => value || "—",
                  },
                  {
                    key: "medicines",
                    label: "Medicines",
                    render: (_: unknown, row: PrescriptionRecord) => {
                      const n = row.medicines?.length || 0
                      return n ? `${n} item${n > 1 ? "s" : ""}` : "—"
                    },
                  },
                  {
                    key: "open",
                    label: "",
                    minWidth: "5rem",
                    render: (_: unknown, row: PrescriptionRecord) => (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void openPrescriptionDrawer(row)
                        }}
                        disabled={prescriptionActionBusyId === row.prescriptionId}
                        className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-900 hover:bg-violet-200 disabled:opacity-60"
                      >
                        {prescriptionActionBusyId === row.prescriptionId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                        Open
                      </button>
                    ),
                  },
                ]}
                data={patientPrescriptions.map((rx) => ({
                  ...rx,
                  issuedAt: rx.issuedAt || "",
                  diagnosis: rx.diagnosis || "",
                  doctor: rx.doctorSnapshot?.fullName || "",
                }))}
                loading={prescriptionsLoading}
                error={null}
                emptyMessage="No prescriptions yet. Write one for this patient."
                rowClassName="cursor-pointer hover:bg-violet-50/50"
                onRowClick={(row) => void openPrescriptionDrawer(row as PrescriptionRecord)}
              />
            </section>
            ) : activeTab === "prescription" ? (
              <p className="text-sm text-slate-500">Prescription access is not enabled for your login.</p>
            ) : null}

            {activeTab === "followup" ? (
            <section className="hc-patient-card hc-tab-panel border-amber-500 space-y-3 p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-sm font-semibold text-amber-900">Come back later</h2>
                {showBookVisit ? (
                  <button
                    type="button"
                    onClick={() => void openBookVisitModal({ visitType: "follow-up", title: "Book return visit" })}
                    className="text-sm font-medium text-amber-800 hover:text-amber-950"
                  >
                    Book return visit
                  </button>
                ) : null}
                <button type="button" onClick={() => setShowFollowUpModal(true)} className="text-sm font-medium text-slate-600 hover:text-slate-900">
                  Quick reminder only
                </button>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                {followUpsError ? (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{followUpsError}</div>
                ) : null}
                {followUpsLoading ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : patientFollowUps.length === 0 ? (
                  <p className="text-sm text-slate-500">No return visits booked yet.</p>
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
            ) : null}

            {activeTab === "billing" && billingEnabled ? (
              <section className="hc-patient-card hc-tab-panel border-rose-500 space-y-3 p-4">
                <h2 className="text-sm font-semibold text-rose-900">Payment</h2>
                <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
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

            {activeTab === "messages" ? (
              <section className="hc-patient-card hc-tab-panel border-green-500 space-y-3 p-4">
                <h2 className="text-sm font-semibold text-green-900">WhatsApp</h2>
                <p className="text-sm text-slate-600">
                  Send reminders or reply to this patient on WhatsApp from your clinic inbox.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/projects/${projectId}/live-chat-v2`)}
                    className="hc-action-btn inline-flex items-center gap-2 bg-green-600 px-4 text-sm text-white hover:bg-green-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Open messages
                  </button>
                  {patient?.whatsappNumber || patient?.phoneNumber ? (
                    <p className="w-full text-xs text-slate-500">
                      Number on file: {patient?.whatsappNumber || patient?.phoneNumber}
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}

            {activeTab === "details" ? (
            <section className="hc-patient-card hc-tab-panel border-slate-400 space-y-3 p-4">
              <h2 className="text-sm font-semibold text-slate-800">Patient info</h2>
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
            ) : null}

            {activeTab === "history" ? (
              <PatientPastActivitySection
                visits={visitHistory}
                loading={visitHistoryLoading}
                onOpenPrescription={(rx) => void openPrescriptionDrawer(historyPrescriptionToRecord(rx))}
              />
            ) : null}
            </div>
          </>
        )}
      </div>

      {completeVisitModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">Finish visit</h2>
            <p className="mt-1 text-sm text-slate-600">Add visit charge (optional). Reception can collect payment later.</p>
            <label className="mt-4 block text-sm font-medium text-slate-700">Visit charge (₹)</label>
            <input
              type="number"
              min={0}
              value={completeVisitModal.fee}
              onChange={(e) => setCompleteVisitModal((c) => (c ? { ...c, fee: e.target.value } : c))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompleteVisitModal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const fee = Number(completeVisitModal.fee || 0)
                  if (Number.isNaN(fee) || fee < 0) {
                    setAppointmentsError("Enter a valid amount")
                    return
                  }
                  void confirmFinishVisit(completeVisitModal.appointment, fee)
                }}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Finish visit
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
                <h2 className="text-lg font-semibold text-slate-900">Book return visit</h2>
                <p className="text-sm text-slate-600">Pick when the patient should come back to the clinic.</p>
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
                  {followUpSubmitting ? "Saving..." : "Book return visit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <BookVisitModal
        show={showBookVisitModal}
        onClose={() => setShowBookVisitModal(false)}
        projectId={projectId}
        patientId={patientId}
        patientName={patient?.fullName || "Patient"}
        doctors={visitDoctors}
        defaultDoctorId={linkedDoctorId || ""}
        defaultVisitType={bookVisitDefaults.visitType}
        title={bookVisitDefaults.title}
        onCreated={(appointment) => {
          setPatientAppointments((current) => [appointment as AppointmentRecord, ...current])
          setSuccessMessage("Visit booked")
          setActiveTab("visits")
          void loadPatientAppointments()
          void loadHistory()
        }}
      />

      <PrescriptionFormModal
        show={showPrescriptionModal}
        onClose={() => {
          setShowPrescriptionModal(false)
          setPrescriptionLinkedAppointmentId(null)
        }}
        form={prescriptionForm}
        setForm={setPrescriptionForm}
        onSubmit={handleCreatePrescription}
        submitting={prescriptionSubmitting}
        error={prescriptionError}
        successMessage={prescriptionSuccessMessage}
        patients={patient ? [{ patientId: patient.patientId, fullName: patient.fullName }] : []}
        doctors={prescriptionDoctors}
        medicineCatalog={prescriptionMedicineCatalog}
        title="Write prescription"
      />

      <PrescriptionViewDrawer
        isOpen={rxDrawerOpen}
        onClose={closePrescriptionDrawer}
        prescription={rxDrawerRx}
        pdfUrl={rxDrawerPdfUrl}
        loading={rxDrawerLoading}
        error={rxDrawerError || null}
        printing={rxDrawerPrinting}
        onPrint={() => void printFromPrescriptionDrawer()}
      />
    </div>
  )
}
