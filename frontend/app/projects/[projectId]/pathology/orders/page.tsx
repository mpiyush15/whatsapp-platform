"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { apiGet } from "@/lib/api-client"
import { HealthcareTableShell } from "@/components/healthcare/HealthcareTableShell"
import { useHealthcareListLoader } from "@/lib/hooks/useHealthcareListLoader"

interface LabOrder {
  orderId: string
  patientSnapshot?: { fullName?: string | null }
  status?: string
  bookingSource?: string
  queueStatus?: string
  collectionAt?: string | null
  createdAt?: string
}

export default function PathologyOrdersPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [orders, setOrders] = useState<LabOrder[]>([])
  const { initialLoading, refreshing, run: runListLoad } = useHealthcareListLoader()

  const loadOrders = useCallback(async () => {
    const result = await runListLoad(async () => {
      const payload = await apiGet<{ data?: { orders?: LabOrder[] } }>(
        `/pathology/orders?projectId=${encodeURIComponent(projectId)}&limit=50`
      )
      return payload?.data?.orders || []
    })
    if (result) setOrders(result)
  }, [projectId, runListLoad])

  useEffect(() => {
    void loadOrders()
  }, [projectId])

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Lab orders</h1>
        <p className="text-sm text-slate-600">Collection requests and processing status.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <HealthcareTableShell
          initialLoading={initialLoading}
          refreshing={refreshing}
          isEmpty={orders.length === 0}
          emptyMessage="No lab orders yet."
        >
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Queue</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.orderId}>
                  <td className="px-4 py-3 font-medium">{order.patientSnapshot?.fullName || order.orderId}</td>
                  <td className="px-4 py-3 capitalize">{order.status || "requested"}</td>
                  <td className="px-4 py-3">
                    {order.bookingSource === "whatsapp_bot" ? "WhatsApp" : "Manual"}
                  </td>
                  <td className="px-4 py-3">{order.queueStatus === "queued" ? "Queued" : "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
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
