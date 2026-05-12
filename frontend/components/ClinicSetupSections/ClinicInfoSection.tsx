import { useState } from "react"
import SectionCard from "./SectionCard"

interface ClinicSettings {
  clinicName: string
  doctorName: string
  phoneNumber: string
  email: string
  registrationNumber: string
  website: string
  address: string
  clinicLogo?: string
}

interface Props {
  settings: ClinicSettings
  onUpdate: (updates: Partial<ClinicSettings>) => void
  onLogoUpload?: (file: File) => Promise<string | undefined>
}

export default function ClinicInfoSection({ settings, onUpdate, onLogoUpload }: Props) {
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [previewLogo, setPreviewLogo] = useState<string | undefined>(settings.clinicLogo)
  const [uploadError, setUploadError] = useState("")

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingLogo(true)
      setUploadError("")

      // Show preview while uploading
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreviewLogo(event.target?.result as string)
      }
      reader.readAsDataURL(file)

      if (!file.type.startsWith("image/")) {
        throw new Error("Please upload an image file")
      }

      if (file.size > 2 * 1024 * 1024) {
        throw new Error("Logo must be 2MB or smaller")
      }

      if (!onLogoUpload) {
        throw new Error("Logo upload is not configured")
      }

      const logoUrl = await onLogoUpload(file)
      onUpdate({ clinicLogo: logoUrl })
      setUploadingLogo(false)
    } catch (error: any) {
      console.error('Error uploading logo:', error)
      setUploadError(error?.message || "Failed to upload logo")
      setUploadingLogo(false)
      // Keep preview even if upload fails
    }
  }

  return (
    <SectionCard
      title="Clinic Information"
      subtitle="Basic clinic and doctor details"
    >
      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Clinic Name</label>
          <input
            type="text"
            value={settings.clinicName}
            onChange={(e) => onUpdate({ clinicName: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Doctor Name</label>
          <input
            type="text"
            value={settings.doctorName}
            onChange={(e) => onUpdate({ doctorName: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
          <input
            type="tel"
            value={settings.phoneNumber}
            onChange={(e) => onUpdate({ phoneNumber: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
          <input
            type="email"
            value={settings.email}
            onChange={(e) => onUpdate({ email: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Registration Number</label>
          <input
            type="text"
            value={settings.registrationNumber}
            onChange={(e) => onUpdate({ registrationNumber: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Website</label>
          <input
            type="text"
            value={settings.website}
            onChange={(e) => onUpdate({ website: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Clinic Address</label>
        <textarea
          value={settings.address}
          onChange={(e) => onUpdate({ address: e.target.value })}
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 h-24 resize-none"
        />
      </div>

      <div className="mt-6 flex items-center gap-5">
        <div className="h-24 w-24 rounded-3xl bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center text-4xl overflow-hidden">
          {previewLogo || settings.clinicLogo ? (
            <img src={previewLogo || settings.clinicLogo} alt="Clinic Logo" className="w-full h-full object-cover" />
          ) : (
            "🏥"
          )}
        </div>
        <div>
          <label htmlFor="logo-upload" className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition cursor-pointer inline-block">
            {uploadingLogo ? "Uploading..." : "Upload Clinic Logo"}
          </label>
          <input
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            disabled={uploadingLogo}
            className="hidden"
          />
          {settings.clinicLogo && (
            <p className="text-xs text-emerald-600 mt-2">✓ Logo saved to S3</p>
          )}
          {uploadError && (
            <p className="text-xs text-red-600 mt-2">{uploadError}</p>
          )}
        </div>
      </div>
    </SectionCard>
  )
}
