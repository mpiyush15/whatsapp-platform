'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { authService, UserRole } from '@/lib/auth'
import { API_URL } from '@/lib/config/api'

type StuckPayment = {
  _id?: string
  accountId?: string
  orderId?: string
  status?: string
  lifecycleState?: string
  lifecycleLastError?: string | null
  amount?: number
  billingCycle?: string
  updatedAt?: string
  createdAt?: string
}

export default function StuckPaymentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stuckPayments, setStuckPayments] = useState<StuckPayment[]>([])

  const totals = useMemo(() => {
    const totalAmount = stuckPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return {
      count: stuckPayments.length,
      totalAmount,
    }
  }, [stuckPayments])

  const fetchStuckPayments = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/admin/billing/reconciliation/stuck-payments?olderThanMinutes=30&limit=200`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to load stuck payments (${response.status})`)
      }

      const payload = await response.json()
      setStuckPayments(payload?.data?.payments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stuck payments')
      setStuckPayments([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const user = authService.getCurrentUser()
    if (!user || user.role !== UserRole.SUPERADMIN || user.type !== 'internal') {
      router.replace('/dashboard')
      return
    }

    fetchStuckPayments()
  }, [router])

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Stuck Payments Report</h1>
          <p className="text-sm text-gray-600 mt-1">Payments pending/processing beyond threshold that need manual reconciliation.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/superadmin/billing/reconciliation/overview"
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Back to Overview
          </Link>
          <button
            type="button"
            onClick={() => fetchStuckPayments(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">Total stuck payments</p>
          <p className="text-3xl font-bold text-amber-900 mt-1">{loading ? '...' : totals.count}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs uppercase tracking-wide text-blue-700">Amount impacted (sample)</p>
          <p className="text-3xl font-bold text-blue-900 mt-1">₹{loading ? '...' : totals.totalAmount.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : stuckPayments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-50" />
            No stuck payments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Order</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Account</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Lifecycle</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Last Update</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Error</th>
                </tr>
              </thead>
              <tbody>
                {stuckPayments.map((item, idx) => (
                  <tr key={item._id || `${item.orderId || 'no-order'}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-800">{item.orderId || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-800">{item.accountId || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full px-2 py-1 text-xs bg-gray-100 text-gray-700">{item.status || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full px-2 py-1 text-xs bg-indigo-100 text-indigo-700">{item.lifecycleState || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-800">₹{Number(item.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleString('en-IN') : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-600 max-w-xs truncate" title={item.lifecycleLastError || ''}>
                      {item.lifecycleLastError || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
