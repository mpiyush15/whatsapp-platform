"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Save, Loader2 } from "lucide-react"
import ClinicInfoSection from "@/components/ClinicSetupSections/ClinicInfoSection"
import ClinicTypeSelector from "@/components/ClinicSetupSections/ClinicTypeSelector"
import PrescriptionSettings from "@/components/ClinicSetupSections/PrescriptionSettings"
import BillingSettings from "@/components/ClinicSetupSections/BillingSettings"
import WhatsAppSettings from "@/components/ClinicSetupSections/WhatsAppSettings"
import HealthcareWhatsAppClinicCard from "@/components/healthcare/HealthcareWhatsAppClinicCard"
import PrescriptionPreview from "@/components/ClinicSetupSections/PrescriptionPreview"
import ToggleRow from "@/components/ClinicSetupSections/ToggleRow"
import { ClinicSetupTabNav } from "@/components/healthcare/clinic/ClinicSetupTabNav"
import {
  CLINIC_MODULE_OPTIONS,
  CLINIC_SETUP_TABS,
  CLINIC_TYPE_PLAIN,
  type ClinicSetupTabId,
} from "@/lib/healthcareClinicSetupUi"
import {
  MODULE_PRESETS,
  clinicTypeForSelector,
  pharmacyBillingDefaultForType,
  type ClinicTypeId,
} from "@/lib/healthcareClinicTypes"

interface ClinicSettings {
  clinicName: string
  doctorName: string
  phoneNumber: string
  email: string
  registrationNumber: string
  website: string
  address: string
  clinicLogo?: string
  clinicType: ClinicTypeId
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

const initialSettings: ClinicSettings = {
  clinicName: "",
  doctorName: "",
  phoneNumber: "",
  email: "",
  registrationNumber: "",
  website: "",
  address: "",
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
  enablePrescriptionDesign:
    settings.uploadPrescriptionPDF && settings.prescriptionPDFUrl
      ? false
      : settings.useReplysysPrescription,
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

const MAIN_MODULES = CLINIC_MODULE_OPTIONS.filter((m) => m.group === "main")
const EXTRA_MODULES = CLINIC_MODULE_OPTIONS.filter((m) => m.group === "extra")

export default function ClinicSetupPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [settings, setSettings] = useState<ClinicSettings>(initialSettings)
  const [activeTab, setActiveTab] = useState<ClinicSetupTabId>("basics")
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

  const handleClinicTypeUpdate = (updates: { clinicType: ClinicTypeId }) => {
    const enabledModules = MODULE_PRESETS[updates.clinicType]
    const pharmacyOn = enabledModules.includes("pharmacy")
    setSettings((prev) => ({
      ...prev,
      clinicType: updates.clinicType,
      enabledModules,
      enableBilling: enabledModules.includes("billing"),
      enablePharmacyBilling: pharmacyBillingDefaultForType(updates.clinicType) && pharmacyOn,
      medicineReminders: pharmacyOn,
    }))
  }

  const toggleModule = (moduleId: string, enabled: boolean) => {
    setSettings((prev) => {
      const nextModules = enabled
        ? Array.from(new Set([...prev.enabledModules, moduleId]))
        : prev.enabledModules.filter((item) => item !== moduleId)

      const consultationLike = prev.clinicType === "consultation"
      let nextPharmacyBilling = prev.enablePharmacyBilling
      if (moduleId === "pharmacy") {
        if (!enabled) nextPharmacyBilling = false
        else if (!consultationLike) nextPharmacyBilling = true
      }

      return {
        ...prev,
        enabledModules: nextModules,
        enableBilling: moduleId === "billing" ? enabled : prev.enableBilling,
        enablePharmacyBilling: nextPharmacyBilling,
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
      setMessage("✓ Saved! Your clinic settings are updated.")
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
      useReplysysPrescription: false,
      prescriptionPDFUrl: pdfUrl,
      prescriptionPDFName: file.name,
    })
    return pdfUrl
  }

  const selectorMode = clinicTypeForSelector(settings.clinicType)
  const typePlain =
    selectorMode === "consultation" ? CLINIC_TYPE_PLAIN.consultation : CLINIC_TYPE_PLAIN.clinic_pharmacy

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <div
        className={`mx-auto max-w-[min(100%,1200px)] ${
          activeTab === "prescription" ? "grid gap-6 xl:grid-cols-[1fr_min(380px,100%)]" : ""
        }`}
      >
        <div className="space-y-5">
          <header className="border-b border-slate-200 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  Clinic setup
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-600">
                  Set up your clinic in 5 simple steps. Pick a tab, fill details, press Save.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-70"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save all
                  </>
                )}
              </button>
            </div>

            {settings.clinicType === "hospital" && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Old hospital type detected. Pick <span className="font-medium">Doctor clinic only</span> or{" "}
                <span className="font-medium">Clinic + medicine counter</span> and save.
              </p>
            )}

            {message && (
              <div
                className={`mt-3 rounded-lg p-3 text-sm font-medium ${
                  message.startsWith("✓") ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                }`}
              >
                {message}
              </div>
            )}
            {loading && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            )}
          </header>

          <ClinicSetupTabNav tabs={CLINIC_SETUP_TABS} activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === "basics" && (
            <div className="space-y-5">
              <ClinicInfoSection settings={settings} onUpdate={updateSettings} onLogoUpload={handleLogoUpload} />
              <ClinicTypeSelector settings={settings} onUpdate={handleClinicTypeUpdate} />
              <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <span className="font-medium text-slate-900">{typePlain.title}</span>
                {" — "}
                {typePlain.description}
              </p>
            </div>
          )}

          {activeTab === "features" && (
            <div className="space-y-5">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">What shows in the left menu</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Turn off anything your staff should not see. Most clinics only need the main options.
                </p>

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Main (recommended)</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {MAIN_MODULES.map((module) => (
                    <ToggleRow
                      key={module.id}
                      title={module.title}
                      description={module.description}
                      enabled={settings.enabledModules.includes(module.id)}
                      onChange={(enabled) => toggleModule(module.id, enabled)}
                    />
                  ))}
                </div>

                <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Extra (optional)</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {EXTRA_MODULES.map((module) => (
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
                  <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Medicine list is off — doctor will type medicine names manually on prescription.
                  </p>
                )}
                {settings.clinicType === "consultation" &&
                  settings.enabledModules.includes("pharmacy") &&
                  !settings.enablePharmacyBilling && (
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      Medicine list is on but counter billing is off. Turn on &quot;Sell medicines at counter&quot; under Payments tab if needed.
                    </p>
                  )}
              </div>
            </div>
          )}

          {activeTab === "prescription" && (
            <PrescriptionSettings
              settings={settings}
              onUpdate={updateSettings}
              onPdfUpload={handlePrescriptionPdfUpload}
            />
          )}

          {activeTab === "billing" && (
            <BillingSettings settings={settings} onUpdate={updateBillingSettings} />
          )}

          {activeTab === "whatsapp" && (
            <HealthcareWhatsAppClinicCard
              projectId={projectId}
              automationToggles={
                <WhatsAppSettings embedded settings={settings} onUpdate={updateWhatsAppSettings} />
              }
            />
          )}
        </div>

        {activeTab === "prescription" && (
          <aside className="xl:sticky xl:top-6 xl:self-start">
            <p className="mb-2 text-xs font-medium text-slate-500">Preview — how print will look</p>
            <PrescriptionPreview settings={settings} />
          </aside>
        )}
      </div>
    </div>
  )
}
