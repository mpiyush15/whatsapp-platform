interface ClinicSettings {
  clinicName: string
  address: string
  doctorName: string
  clinicLogo?: string
  uploadPrescriptionPDF?: boolean
  prescriptionPDFUrl?: string
  prescriptionPDFName?: string
}

interface Props {
  settings: ClinicSettings
}

export default function PrescriptionPreview({ settings }: Props) {
  return (
    <div className="sticky top-6 h-fit space-y-4">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Prescription preview</h2>
            <p className="text-xs text-slate-500">Updates as you edit clinic details</p>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Sample</span>
        </div>

        <div className="bg-slate-50 p-4">
          {/* Show PDF preview if "Upload Existing Prescription PDF" is enabled AND has PDF URL */}
          {settings.uploadPrescriptionPDF && settings.prescriptionPDFUrl ? (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border">
              <div className="bg-slate-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Custom Prescription Template</p>
                  <p className="text-xs text-slate-500 mt-1">{settings.prescriptionPDFName || 'Prescription PDF'}</p>
                </div>
                <a
                  href={settings.prescriptionPDFUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition"
                >
                  Open PDF
                </a>
              </div>
              <iframe
                src={`${settings.prescriptionPDFUrl}#toolbar=0`}
                className="w-full aspect-[0.72] rounded-b-2xl"
                title="Prescription PDF Preview"
              />
            </div>
          ) : (
            <div className="bg-white aspect-[0.72] rounded-2xl shadow-lg overflow-hidden border">
            
              {/* PRESCRIPTION HEADER */}
              <div className="bg-emerald-600 text-white px-7 py-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{settings.clinicName}</h2>
                  <p className="text-sm text-emerald-100 mt-2">{settings.address}</p>
                </div>
                <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl overflow-hidden">
                  {settings.clinicLogo ? (
                    <img src={settings.clinicLogo} alt="Clinic Logo" className="w-full h-full object-cover" />
                  ) : (
                    "🏥"
                  )}
                </div>
              </div>

              {/* PATIENT INFO */}
              <div className="px-7 py-5 border-b border-slate-200 flex items-center justify-between text-sm text-slate-600">
                <span>Patient: Rahul Sharma</span>
                <span>Date: 09 May 2026</span>
              </div>

              {/* PRESCRIPTION CONTENT */}
              <div className="p-7 space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Diagnosis</h3>
                  <p className="text-sm text-slate-600">Viral fever with throat infection.</p>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Medicines</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Paracetamol 650mg</span>
                      <span>1–0–1 – 5 Days</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Azithromycin 500mg</span>
                      <span>0–1–0 – 3 Days</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500">Doctor: {settings.doctorName}</p>
                </div>
              </div>

              {/* FOOTER */}
              <div className="bg-slate-800 px-7 py-3 text-center text-[11px] text-slate-300">
                Footer / contact line from clinic setup
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

