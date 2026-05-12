'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, FileWarning, RefreshCw, ShieldAlert, Unlink } from 'lucide-react'
import { authService, UserRole } from '@/lib/auth'
import { API_URL } from '@/lib/config/api'

type ReconciliationOverview = {
  summary: {
    stuckPayments: number
    missingInvoices: number
    missingSubscriptions: number
    creditMismatches: number
  }
  samples: {
    stuckPayments: Array<{
      orderId?: string
      accountId?: string
      status?: string
      lifecycleState?: string
      updatedAt?: string
    }>
    missingInvoices: Array<{
      orderId?: string
      accountId?: string
      status?: string
      invoiceId?: string | null
      updatedAt?: string
    }>
    missingSubscriptions: Array<{
      orderId?: string
      accountId?: string
      status?: string
      subscriptionId?: string | null
      updatedAt?: string
    }>
    creditMismatches: Array<{
      accountId?: string
      email?: string
      cachedBalance?: number
      derivedBalance?: number
      delta?: number
    }>
  }
}

const EMPTY_OVERVIEW: ReconciliationOverview = {
  summary: {
    stuckPayments: 0,
    missingInvoices: 0,
    missingSubscriptions: 0,
    creditMismatches: 0,
  },
  samples: {
    stuckPayments: [],
    missingInvoices: [],
    missingSubscriptions: [],
    creditMismatches: [],
  },
}

export default function BillingReconciliationOverviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<ReconciliationOverview>(EMPTY_OVERVIEW)

  const cards = useMemo(() => {
    return [
      {
        key: 'stuckPayments',
        title: 'Stuck Payments',
        icon: AlertTriangle,
        value: overview.summary.stuckPayments,
        color: 'text-amber-700 bg-amber-50 border-amber-200',
      },
      {
        key: 'missingInvoices',
        title: 'Missing Invoices',
        icon: FileWarning,
        value: overview.summary.missingInvoices,
        color: 'text-rose-700 bg-rose-50 border-rose-200',
      },
      {
        key: 'missingSubscriptions',
        title: 'Missing Subscriptions',
        icon: Unlink,
        value: overview.summary.missingSubscriptions,
        color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      },
      {
        key: 'creditMismatches',
        title: 'Credit Mismatches',
        icon: ShieldAlert,
        value: overview.summary.creditMismatches,
        color: 'text-purple-700 bg-purple-50 border-purple-200',
      },
    ]
  }, [overview])

  const fetchOverview = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/admin/billing/reconciliation/overview?sampleLimit=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to load reconciliation overview (${response.status})`)
      }

      const payload = await response.json()
      setOverview(payload?.data || EMPTY_OVERVIEW)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reconciliation overview')
      setOverview(EMPTY_OVERVIEW)
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

    fetchOverview()
  }, [router])

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Billing Reconciliation Overview</h1>
          <p className="text-sm text-gray-600 mt-1">Lifecycle exception snapshot for superadmin operations.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/superadmin/billing/reconciliation/stuck-payments"
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Open Stuck Payments
          </Link>
          <button
            type="button"
            onClick={() => fetchOverview(true)}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.key} className={`rounded-xl border p-4 ${card.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide opacity-80">{card.title}</p>
                <p className="text-3xl font-bold mt-1">{loading ? '...' : card.value}</p>
              </div>
              <card.icon className="h-7 w-7 opacity-80" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Sample: Stuck Payments</h2>
          {overview.samples.stuckPayments.length === 0 ? (
            <p className="text-sm text-gray-500">No stuck payments in sampled data.</p>
          ) : (
            <div className="space-y-2">
              {overview.samples.stuckPayments.slice(0, 6).map((item, idx) => (
                <div key={`${item.orderId || item.accountId || idx}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs">
                  <p className="font-medium text-gray-900">{item.orderId || 'No orderId'} · {item.accountId || 'No accountId'}</p>
                  <p className="text-gray-600 mt-1">{item.status || 'unknown'} / {item.lifecycleState || 'unknown'}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Sample: Credit Mismatches</h2>
          {overview.samples.creditMismatches.length === 0 ? (
            <p className="text-sm text-gray-500">No credit mismatches in sampled data.</p>
          ) : (
            <div className="space-y-2">
              {overview.samples.creditMismatches.slice(0, 6).map((item, idx) => (
                <div key={`${item.accountId || item.email || idx}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs">
                  <p className="font-medium text-gray-900">{item.accountId || 'No accountId'} · {item.email || 'No email'}</p>
                  <p className="text-gray-600 mt-1">
                    cached ₹{Number(item.cachedBalance || 0).toLocaleString('en-IN')} · derived ₹{Number(item.derivedBalance || 0).toLocaleString('en-IN')} · delta ₹{Number(item.delta || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
