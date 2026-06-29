"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { FileText, RefreshCw } from "lucide-react"
import { API_URL } from "@/lib/config/api"

type InvoiceRow = {
  _id: string
  invoiceId?: string | null
  invoiceNumber?: string | null
  amount?: number
  status?: string
  orderId?: string
  createdAt?: string
}

function formatDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatAmount(value?: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`
}

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])

  const totalInvoiced = useMemo(() => {
    return invoices.reduce((sum, row) => sum + Number(row.amount || 0), 0)
  }, [invoices])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem("token") || localStorage.getItem("authToken")
      const response = await fetch(`${API_URL}/subscriptions/payments?status=completed`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || payload?.error || "Failed to fetch invoices")
      }

      setInvoices(Array.isArray(payload?.data?.payments) ? payload.data.payments : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch invoices")
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-600">Canonical invoice feed derived from completed lifecycle payments.</p>
          </div>

          <button
            onClick={loadInvoices}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Invoice count</p>
            <p className="mt-1 text-3xl font-bold text-violet-900">{loading ? "..." : invoices.length}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Total invoiced</p>
            <p className="mt-1 text-3xl font-bold text-blue-900">{loading ? "..." : formatAmount(totalInvoiced)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-500">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="mx-auto mb-3 h-10 w-10 opacity-50" />
              No invoices available yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Invoice</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Order</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((row, idx) => (
                    <tr key={row._id || `${row.orderId || "invoice"}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{row.invoiceNumber || row.invoiceId || `INV-${String(idx + 1).padStart(5, "0")}`}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.orderId || "-"}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatAmount(row.amount)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold capitalize text-emerald-800">
                          {row.status || "completed"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/features/billing" className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            Open Billing Center
          </Link>
          <Link href="/dashboard/features/subscriptions" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
            Open Subscription
          </Link>
        </div>
      </div>
    </div>
  )
}
