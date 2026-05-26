"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { apiGet } from "@/lib/api-client"
import { HealthcareTableShell } from "@/components/healthcare/HealthcareTableShell"
import { useHealthcareListLoader } from "@/lib/hooks/useHealthcareListLoader"

interface LabReport {
  reportId: string
  orderId: string
  patientId: string
  reportDate?: string
  status?: string
}

export default function PathologyReportsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [reports, setReports] = useState<LabReport[]>([])
  const { initialLoading, refreshing, run: runListLoad } = useHealthcareListLoader()

  const loadReports = useCallback(async () => {
    const result = await runListLoad(async () => {
      const payload = await apiGet<{ data?: { reports?: LabReport[] } }>(
        `/pathology/reports?projectId=${encodeURIComponent(projectId)}&limit=50`
      )
      return payload?.data?.reports || []
    })
    if (result) setReports(result)
  }, [projectId, runListLoad])

  useEffect(() => {
    void loadReports()
  }, [projectId])

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-600">
          Upload PDFs and send report-ready messages on WhatsApp (delivery workflow coming next).
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <HealthcareTableShell
          initialLoading={initialLoading}
          refreshing={refreshing}
          isEmpty={reports.length === 0}
          emptyMessage="No reports yet."
        >
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Report</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((report) => (
                <tr key={report.reportId}>
                  <td className="px-4 py-3 font-medium">{report.reportId}</td>
                  <td className="px-4 py-3 text-slate-600">{report.orderId}</td>
                  <td className="px-4 py-3 capitalize">{report.status || "draft"}</td>
                  <td className="px-4 py-3">
                    {report.reportDate ? new Date(report.reportDate).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </HealthcareTableShell>
      </div>
    </div>
  )
}
