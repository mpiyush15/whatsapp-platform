"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { apiGet } from "@/lib/api-client"
import { HealthcareTableShell } from "@/components/healthcare/HealthcareTableShell"
import { useHealthcareListLoader } from "@/lib/hooks/useHealthcareListLoader"

interface Patient {
  patientId: string
  fullName: string
  phoneNumber?: string | null
  whatsappNumber?: string | null
}

export default function PathologyPatientsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [patients, setPatients] = useState<Patient[]>([])
  const { initialLoading, refreshing, run: runListLoad } = useHealthcareListLoader()

  const loadPatients = useCallback(async () => {
    const result = await runListLoad(async () => {
      const payload = await apiGet<{ data?: { patients?: Patient[] } }>(
        `/pathology/patients?projectId=${encodeURIComponent(projectId)}&limit=50`
      )
      return payload?.data?.patients || []
    })
    if (result) setPatients(result)
  }, [projectId, runListLoad])

  useEffect(() => {
    void loadPatients()
  }, [projectId])

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Patients</h1>
        <p className="text-sm text-slate-600">Lab patients — shared registry for this project.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <HealthcareTableShell
          initialLoading={initialLoading}
          refreshing={refreshing}
          isEmpty={patients.length === 0}
          emptyMessage="No patients yet. They are created via WhatsApp bot or manual entry (coming soon)."
        >
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((patient) => (
                <tr key={patient.patientId}>
                  <td className="px-4 py-3 font-medium text-slate-900">{patient.fullName}</td>
                  <td className="px-4 py-3">{patient.phoneNumber || patient.whatsappNumber || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{patient.patientId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </HealthcareTableShell>
      </div>
    </div>
  )
}
