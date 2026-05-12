"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Save, Loader2 } from "lucide-react"
import ClinicInfoSection from "@/components/ClinicSetupSections/ClinicInfoSection"
import ClinicTypeSelector from "@/components/ClinicSetupSections/ClinicTypeSelector"
import PrescriptionSettings from "@/components/ClinicSetupSections/PrescriptionSettings"
import BillingSettings from "@/components/ClinicSetupSections/BillingSettings"
import WhatsAppSettings from "@/components/ClinicSetupSections/WhatsAppSettings"
import PrescriptionPreview from "@/components/ClinicSetupSections/PrescriptionPreview"
import SectionCard from "@/components/ClinicSetupSections/SectionCard"
import ToggleRow from "@/components/ClinicSetupSections/ToggleRow"

interface ClinicSettings {
  clinicName: string
  doctorName: string
  phoneNumber: string
  email: string
  registrationNumber: string
  website: string
  address: string
  clinicLogo?: string
  clinicType: "consultation" | "clinic_pharmacy" | "hospital"
  useReplysysPrescription: boolean
  uploadPrescriptionPDF: boolean
  prescriptionPDFUrl?: string
  prescriptionPDFName?: string
  enableBilling: boolean
  enablePharmacyBilling: boolean
  enableGST: boolean
  gstPercentage: string
  currency: string
  sendPrescriptionWhatsApp: boolean
  medicineReminders: boolean
  followUpReminders: boolean
  enabledModules: string[]
}

const MODULE_PRESETS: Record<ClinicSettings["clinicType"], string[]> = {
  consultation: ["patients", "appointments", "doctors", "prescriptions", "whatsapp"],
  clinic_pharmacy: ["patients", "appointments", "doctors", "prescriptions", "pharmacy", "inventory", "billing", "whatsapp"],
  hospital: ["patients", "appointments", "frontdesk", "doctors", "nurses", "prescriptions", "pharmacy", "inventory", "billing", "compliance", "whatsapp", "flow-builder"],
}

const HEALTHCARE_MODULES = [
  { id: "patients", title: "Patients", description: "Patient registry and history" },
  { id: "appointments", title: "Appointments", description: "Booking and schedule flow" },
  { id: "frontdesk", title: "Front Desk", description: "Token queue and check-in" },
  { id: "doctors", title: "Doctors", description: "Doctor profiles and assignment" },
  { id: "nurses", title: "Nurses / Staff", description: "Nurse and staff module" },
  { id: "prescriptions", title: "Prescriptions", description: "Clinical prescription builder" },
  { id: "pharmacy", title: "Pharmacy", description: "Sell medicines from stock" },
  { id: "inventory", title: "Inventory", description: "Stock, price, batch and expiry" },
  { id: "billing", title: "Billing", description: "Invoices and payments" },
  { id: "compliance", title: "Compliance", description: "Consent, audit and retention" },
  { id: "whatsapp", title: "WhatsApp Automation", description: "Reminders and patient updates" },
  { id: "flow-builder", title: "Flow Builder", description: "Healthcare chatbot actions" },
]

const initialSettings: ClinicSettings = {
  clinicName: "Sai Clinic",
  doctorName: "Dr Priyanka Yesankar",
  phoneNumber: "+91 8087131777",
  email: "clinic@gmail.com",
  registrationNumber: "REG-2026-443",
  website: "www.saiclinic.com",
  address: "Hingana Road, Nagpur, Maharashtra",
  clinicType: "consultation",
  useReplysysPrescription: true,
  uploadPrescriptionPDF: false,
  prescriptionPDFUrl: undefined,
  prescriptionPDFName: undefined,
  enableBilling: true,
  enablePharmacyBilling: false,
  enableGST: true,
  gstPercentage: "18%",
  currency: "INR ₹",
  sendPrescriptionWhatsApp: true,
  medicineReminders: false,
  followUpReminders: true,
  enabledModules: MODULE_PRESETS.consultation,
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"

const getAuthToken = () => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("authToken") || localStorage.getItem("token")
}

const getHeaders = () => {
  const token = getAuthToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const mapClinicToSettings = (clinic: any): Partial<ClinicSettings> => ({
  clinicName: clinic?.name || "",
  doctorName: clinic?.doctorName || "",
  phoneNumber: clinic?.phone || "",
  email: clinic?.email || "",
  registrationNumber: clinic?.registrationNumber || "",
  website: clinic?.website || "",
  address: clinic?.address || "",
  clinicLogo: clinic?.logoUrl || undefined,
  useReplysysPrescription: clinic?.enablePrescriptionDesign ?? true,
  uploadPrescriptionPDF: Boolean(clinic?.prescriptionBlankPdfUrl),
  prescriptionPDFUrl: clinic?.prescriptionBlankPdfUrl || undefined,
  clinicType: clinic?.clinicType || "consultation",
  enabledModules: Array.isArray(clinic?.enabledModules) && clinic.enabledModules.length
    ? clinic.enabledModules
    : MODULE_PRESETS[clinic?.clinicType as ClinicSettings["clinicType"]] || MODULE_PRESETS.consultation,
  enableBilling: clinic?.billingSettings?.enabled ?? true,
  enablePharmacyBilling: clinic?.billingSettings?.pharmacyBillingEnabled ?? false,
  enableGST: clinic?.billingSettings?.gstEnabled ?? true,
  gstPercentage: clinic?.billingSettings?.gstPercentage || "18%",
  currency: clinic?.billingSettings?.currency || "INR ₹",
  sendPrescriptionWhatsApp: clinic?.whatsappAutomationSettings?.sendPrescription ?? true,
  medicineReminders: clinic?.whatsappAutomationSettings?.medicineReminders ?? false,
  followUpReminders: clinic?.whatsappAutomationSettings?.followUpReminders ?? true,
})

const mapSettingsToClinicPayload = (settings: ClinicSettings) => ({
  name: settings.clinicName.trim(),
  doctorName: settings.doctorName,
  phone: settings.phoneNumber,
  email: settings.email,
  registrationNumber: settings.registrationNumber,
  website: settings.website,
  address: settings.address,
  logoUrl: settings.clinicLogo || "",
  enablePrescriptionDesign: settings.useReplysysPrescription,
  prescriptionBlankPdfUrl: settings.prescriptionPDFUrl || "",
  clinicType: settings.clinicType,
  enabledModules: settings.enabledModules,
  billingSettings: {
    enabled: settings.enableBilling,
    pharmacyBillingEnabled: settings.enablePharmacyBilling,
    gstEnabled: settings.enableGST,
    gstPercentage: settings.gstPercentage,
    currency: settings.currency,
  },
  whatsappAutomationSettings: {
    sendPrescription: settings.sendPrescriptionWhatsApp,
    medicineReminders: settings.medicineReminders,
    followUpReminders: settings.followUpReminders,
  },
})

export default function ClinicSetupTestPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [settings, setSettings] = useState<ClinicSettings>(initialSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const loadClinic = async () => {
      try {
        setLoading(true)
        setMessage("")

        const response = await fetch(`${API_URL}/healthcare/clinic/${encodeURIComponent(projectId)}`, {
          headers: getHeaders(),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => null)
          throw new Error(error?.message || error?.error || "Failed to load clinic settings")
        }

        const payload = await response.json()
        if (payload?.data) {
          setSettings((prev) => ({ ...prev, ...mapClinicToSettings(payload.data) }))
        }
      } catch (err) {
        setMessage(`✗ ${err instanceof Error ? err.message : "Failed to load clinic settings"}`)
      } finally {
        setLoading(false)
      }
    }

    if (projectId) loadClinic()
  }, [projectId])

  const updateSettings = (updates: Partial<ClinicSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }))
  }

  const handleClinicTypeUpdate = (updates: { clinicType: ClinicSettings["clinicType"] }) => {
    const enabledModules = MODULE_PRESETS[updates.clinicType]
    setSettings((prev) => ({
      ...prev,
      clinicType: updates.clinicType,
      enabledModules,
      enableBilling: enabledModules.includes("billing"),
      enablePharmacyBilling: enabledModules.includes("pharmacy"),
      medicineReminders: enabledModules.includes("pharmacy"),
    }))
  }

  const toggleModule = (moduleId: string, enabled: boolean) => {
    setSettings((prev) => {
      const nextModules = enabled
        ? Array.from(new Set([...prev.enabledModules, moduleId]))
        : prev.enabledModules.filter((item) => item !== moduleId)

      return {
        ...prev,
        enabledModules: nextModules,
        enableBilling: moduleId === "billing" ? enabled : prev.enableBilling,
        enablePharmacyBilling: moduleId === "pharmacy" ? enabled : prev.enablePharmacyBilling,
        medicineReminders: moduleId === "pharmacy" ? enabled : prev.medicineReminders,
      }
    })
  }

  const updateBillingSettings = (updates: Partial<ClinicSettings>) => {
    setSettings((prev) => {
      const nextModules = new Set(prev.enabledModules)
      if (updates.enableBilling !== undefined) {
        updates.enableBilling ? nextModules.add("billing") : nextModules.delete("billing")
      }
      if (updates.enablePharmacyBilling !== undefined) {
        updates.enablePharmacyBilling ? nextModules.add("pharmacy") : nextModules.delete("pharmacy")
        updates.enablePharmacyBilling ? nextModules.add("inventory") : null
      }

      return {
        ...prev,
        ...updates,
        enabledModules: Array.from(nextModules),
      }
    })
  }

  const updateWhatsAppSettings = (updates: Partial<ClinicSettings>) => {
    setSettings((prev) => {
      const nextModules = new Set(prev.enabledModules)
      const anyEnabled = updates.sendPrescriptionWhatsApp ?? updates.medicineReminders ?? updates.followUpReminders
      if (anyEnabled) nextModules.add("whatsapp")

      return {
        ...prev,
        ...updates,
        enabledModules: Array.from(nextModules),
      }
    })
  }

  const saveClinic = async (nextSettings = settings) => {
    if (!nextSettings.clinicName.trim()) {
      throw new Error("Clinic name is required")
    }

    const response = await fetch(`${API_URL}/healthcare/clinic/${encodeURIComponent(projectId)}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(mapSettingsToClinicPayload(nextSettings)),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || "Failed to save clinic settings")
    }

    if (payload?.data) {
      setSettings((prev) => ({ ...prev, ...mapClinicToSettings(payload.data) }))
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("clinic-modules-updated"))
    }

    return payload?.data
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage("")

      await saveClinic()
      setMessage("✓ Clinic settings saved successfully!")
      setTimeout(() => setMessage(""), 3000)
    } catch (err: any) {
      setMessage(`✗ ${err?.message || "Failed to save settings"}`)
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    await saveClinic()

    const token = getAuthToken()
    const formData = new FormData()
    formData.append("logoFile", file)

    const response = await fetch(`${API_URL}/healthcare/clinic/${encodeURIComponent(projectId)}/logo`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || "Failed to upload logo")
    }

    const logoUrl = payload?.data?.logoUrl
    updateSettings({ clinicLogo: logoUrl })
    return logoUrl
  }

  const handlePrescriptionPdfUpload = async (file: File) => {
    await saveClinic()

    const token = getAuthToken()
    const formData = new FormData()
    formData.append("pdfFile", file)
    formData.append("enablePrescriptionDesign", String(settings.useReplysysPrescription))

    const response = await fetch(`${API_URL}/healthcare/clinic/${encodeURIComponent(projectId)}/prescription-design`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || "Failed to upload prescription PDF")
    }

    const pdfUrl = payload?.data?.prescriptionBlankPdfUrl
    updateSettings({
      uploadPrescriptionPDF: true,
      prescriptionPDFUrl: pdfUrl,
      prescriptionPDFName: file.name,
    })
    return pdfUrl
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto grid xl:grid-cols-[1.1fr_0.9fr] gap-6">
        
        {/* LEFT SIDE - FORM SECTIONS */}
        <div className="space-y-6">

          {/* PAGE HEADER */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Replysys Healthcare
            </p>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">
                  Clinic Setup
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Configure your clinic branding, prescription design, billing and WhatsApp automation in one place.
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-70"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save
                  </>
                )}
              </button>
            </div>

            {message && (
              <div className={`mt-4 rounded-xl p-3 text-sm font-medium ${
                message.startsWith("✓") 
                  ? "bg-emerald-100 text-emerald-700" 
                  : "bg-red-100 text-red-700"
              }`}>
                {message}
              </div>
            )}
            {loading && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100 p-3 text-sm font-medium text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading clinic settings...
              </div>
            )}
          </div>

          {/* CLINIC INFO SECTION */}
          <ClinicInfoSection settings={settings} onUpdate={updateSettings} onLogoUpload={handleLogoUpload} />

          {/* CLINIC TYPE SECTION */}
          <ClinicTypeSelector settings={settings} onUpdate={handleClinicTypeUpdate} />

          <SectionCard title="Enabled Modules" subtitle="Choose what this clinic actually uses">
            <div className="grid gap-3 md:grid-cols-2">
              {HEALTHCARE_MODULES.map((module) => (
                <ToggleRow
                  key={module.id}
                  title={module.title}
                  description={module.description}
                  enabled={settings.enabledModules.includes(module.id)}
                  onChange={(enabled) => toggleModule(module.id, enabled)}
                />
              ))}
            </div>
            {!settings.enabledModules.includes("pharmacy") && (
              <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Pharmacy is off: medicines in prescriptions stay clinical/free-text and are not priced or deducted from stock.
              </p>
            )}
          </SectionCard>

          {/* PRESCRIPTION SETTINGS */}
          <PrescriptionSettings settings={settings} onUpdate={updateSettings} onPdfUpload={handlePrescriptionPdfUpload} />

          {/* BILLING SETTINGS */}
          <BillingSettings settings={settings} onUpdate={updateBillingSettings} />

          {/* WHATSAPP AUTOMATION */}
          <WhatsAppSettings settings={settings} onUpdate={updateWhatsAppSettings} />

        </div>

        {/* RIGHT SIDE - LIVE PREVIEW */}
        <PrescriptionPreview settings={settings} />

      </div>
    </div>
  )
}
