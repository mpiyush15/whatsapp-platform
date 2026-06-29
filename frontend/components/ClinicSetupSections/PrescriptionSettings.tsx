import { useState } from "react"
import SectionCard from "./SectionCard"
import ToggleRow from "./ToggleRow"

interface Props {
  settings: { 
    useReplysysPrescription: boolean
    uploadPrescriptionPDF: boolean
    prescriptionPDFUrl?: string
    prescriptionPDFName?: string
  }
  onUpdate: (updates: any) => void
  onPdfUpload?: (file: File) => Promise<string | undefined>
}

export default function PrescriptionSettings({ settings, onUpdate, onPdfUpload }: Props) {
  const [uploadingPDF, setUploadingPDF] = useState(false)
  const [previewPDFUrl, setPreviewPDFUrl] = useState<string | undefined>(settings.prescriptionPDFUrl)
  const [uploadError, setUploadError] = useState("")

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate PDF
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      alert('Please upload a valid PDF file')
      return
    }

    try {
      setUploadingPDF(true)
      setUploadError("")

      // Create preview URL
      const objectUrl = URL.createObjectURL(file)
      setPreviewPDFUrl(objectUrl)

      if (file.size > 10 * 1024 * 1024) {
        throw new Error("PDF must be 10MB or smaller")
      }

      if (!onPdfUpload) {
        throw new Error("PDF upload is not configured")
      }

      const pdfUrl = await onPdfUpload(file)

      // Update with S3 URL and filename
      onUpdate({ 
        prescriptionPDFUrl: pdfUrl,
        prescriptionPDFName: file.name
      })
      setUploadingPDF(false)
    } catch (error: any) {
      console.error('Error uploading PDF:', error)
      setUploadError(error?.message || "Failed to upload PDF")
      setUploadingPDF(false)
    }
  }
  return (
    <SectionCard
      title="How prescriptions look on paper"
      subtitle="Use Replysys layout — best for View and Print on patient page"
    >
      <div className="space-y-4">
        <ToggleRow
          title="Use Replysys prescription layout"
          description="Ready-made print format (recommended)"
          enabled={settings.useReplysysPrescription}
          onChange={(value) =>
            onUpdate({
              useReplysysPrescription: value,
              ...(value ? { uploadPrescriptionPDF: false } : {}),
            })
          }
        />

        <ToggleRow
          title="Use my own letterhead PDF"
          description="Medicines print on your uploaded clinic paper"
          enabled={settings.uploadPrescriptionPDF}
          onChange={(value) =>
            onUpdate({
              uploadPrescriptionPDF: value,
              ...(value ? { useReplysysPrescription: false } : {}),
            })
          }
        />

        {settings.uploadPrescriptionPDF && (
          <div className="border-2 rounded-3xl p-5 bg-slate-50">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div>
                <h3 className="font-bold text-slate-900">Your letterhead PDF</h3>
                <p className="text-sm text-slate-500 mt-2">
                  {settings.prescriptionPDFName || 'No PDF uploaded yet'}
                </p>
                {settings.prescriptionPDFUrl && (
                  <p className="text-xs text-emerald-600 mt-1">✓ Saved to S3</p>
                )}
                {uploadError && (
                  <p className="text-xs text-red-600 mt-1">{uploadError}</p>
                )}
              </div>
              <label htmlFor="pdf-upload" className="px-5 py-3 rounded-2xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition whitespace-nowrap cursor-pointer inline-block">
                {uploadingPDF ? "Uploading..." : "Upload PDF"}
              </label>
              <input
                id="pdf-upload"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handlePDFUpload}
                disabled={uploadingPDF}
                className="hidden"
              />
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}
