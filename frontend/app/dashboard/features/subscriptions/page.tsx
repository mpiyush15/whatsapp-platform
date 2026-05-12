"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AlertCircle, Building2, Calendar, CreditCard, RefreshCw, Zap } from "lucide-react"
import { API_URL } from "@/lib/config/api"
import { UsageMeterCard } from "@/components/UsageMeterCard"
import { BuyCreditModal } from "@/components/BuyCreditModal"

type SubscriptionRecord = {
  _id: string
  subscriptionId?: string
  planName?: string
  status?: string
  billingCycle?: string
  startDate?: string
  renewalDate?: string
  createdAt?: string
}

type PaymentRecord = {
  _id: string
  amount?: number
  status?: string
  planName?: string
  billingCycle?: string
  orderId?: string
  createdAt?: string
}

type UsageStats = {
  messagesPerDay: number | null
  messagesUsedToday: number
  contacts: number | null
  contactsUsed: number
  phoneNumbers: number | null
  phoneNumbersUsed: number
}

type BillingTriggers = {
  lowCredit?: {
    threshold: number
    currentBalance: number
    isLow: boolean
    severity: "warning" | "high" | "critical"
    cta?: string
    message?: string
  }
  renewal?: {
    renewalDate: string | null
    daysToRenewal: number | null
    currentStage: number | null
    timeline: Array<{ day: number; label: string; status: "upcoming" | "current" | "completed" }>
    cta?: string
  }
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

function normalizeCycle(value?: string) {
  if (!value) return "monthly"
  const cycle = value.toLowerCase()
  if (cycle === "annual") return "yearly"
  return cycle
}

function getStatusBadge(status?: string) {
  const normalized = (status || "inactive").toLowerCase()
  if (normalized === "active") return "bg-green-100 text-green-800"
  if (normalized === "paused") return "bg-yellow-100 text-yellow-800"
  if (normalized === "cancelled") return "bg-red-100 text-red-800"
  if (normalized === "expired") return "bg-gray-100 text-gray-800"
  return "bg-blue-100 text-blue-800"
}

export default function SubscriptionsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null)
  const [latestPayment, setLatestPayment] = useState<PaymentRecord | null>(null)
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [triggers, setTriggers] = useState<BillingTriggers | null>(null)
  const [buyCreditModalOpen, setBuyCreditModalOpen] = useState(false)
  const [currentCredits, setCurrentCredits] = useState(0)
  const [isInternal, setIsInternal] = useState(false)

  const fetchJson = async (path: string) => {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken")
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const payload = await response.json()
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message || payload?.error || "Request failed")
    }
    return payload?.data
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [subscriptionData, paymentData, usageData, triggerData] = await Promise.all([
        fetchJson("/subscriptions/my-subscriptions"),
        fetchJson("/subscriptions/payments?status=completed"),
        fetchJson("/subscriptions/usage").catch(() => null),
        fetchJson("/subscriptions/triggers").catch(() => null),
      ])

      const subscriptions = Array.isArray(subscriptionData?.subscriptions)
        ? subscriptionData.subscriptions
        : []

      const payments = Array.isArray(paymentData?.payments)
        ? paymentData.payments
        : []

      setSubscription(subscriptions[0] || null)
      setLatestPayment(payments[0] || null)
      setUsage(
        usageData?.metrics
          ? {
              messagesPerDay: usageData.metrics.messagesPerDay?.limit ?? null,
              messagesUsedToday: usageData.metrics.messagesPerDay?.used ?? 0,
              contacts: usageData.metrics.contacts?.limit ?? null,
              contactsUsed: usageData.metrics.contacts?.used ?? 0,
              phoneNumbers: usageData.metrics.phoneNumbers?.limit ?? null,
              phoneNumbersUsed: usageData.metrics.phoneNumbers?.used ?? 0,
            }
          : null
      )
      setTriggers(triggerData || null)
      setCurrentCredits(subscriptionData?.currentCredits || 0)
      setIsInternal(usageData?.isInternal === true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subscriptions")
      setSubscription(null)
      setLatestPayment(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center text-gray-600">Loading subscription details...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
            <p className="text-sm text-gray-600">Canonical lifecycle state from subscription and payment contracts.</p>
          </div>
          <div className="flex items-center gap-2">
            {!isInternal && (
              <Link
                href="/dashboard/features/change-plan"
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
              >
                Change Plan
              </Link>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {isInternal && (
          <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4">
            <Building2 className="h-5 w-5 shrink-0 text-indigo-600" />
            <div>
              <p className="text-sm font-semibold text-indigo-900">Internal account — billing not applicable</p>
              <p className="text-xs text-indigo-700 mt-0.5">This organisation is marked internal. All resource limits are unlimited and billing actions are disabled.</p>
            </div>
          </div>
        )}

        {triggers?.lowCredit?.isLow ? (
          <div
            className={`rounded-lg border p-4 ${
              triggers.lowCredit.severity === "critical"
                ? "border-red-300 bg-red-50"
                : triggers.lowCredit.severity === "high"
                  ? "border-orange-300 bg-orange-50"
                  : "border-amber-300 bg-amber-50"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Low credit warning</p>
                <p className="mt-1 text-sm text-gray-700">
                  {triggers.lowCredit.message || "Your credit balance is below the configured warning threshold."}
                </p>
                <p className="mt-2 text-xs text-gray-600">
                  Balance: {triggers.lowCredit.currentBalance} · Threshold: {triggers.lowCredit.threshold}
                </p>
              </div>
              <button
                onClick={() => setBuyCreditModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
              >
                <Zap className="h-3.5 w-3.5" />
                Buy Credits
              </button>
            </div>
          </div>
        ) : null}

        {!subscription ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-8 text-center">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">No active subscription</h2>
            <p className="mt-2 text-sm text-gray-700">Start checkout to activate a plan and billing lifecycle.</p>
            <Link
              href="/checkout"
              className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Start Checkout
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current plan</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">{subscription.planName || "Plan"}</h2>
                <div className="mt-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusBadge(subscription.status)}`}>
                    {subscription.status || "inactive"}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Billing cycle</p>
                <p className="text-lg font-semibold capitalize text-gray-900">{normalizeCycle(subscription.billingCycle)}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Calendar className="h-4 w-4" />
                  Renewal date
                </div>
                <p className="mt-1 text-lg font-semibold text-gray-900">{formatDate(subscription.renewalDate)}</p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <CreditCard className="h-4 w-4" />
                  Latest payment
                </div>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {latestPayment ? `₹${Number(latestPayment.amount || 0).toLocaleString("en-IN")}` : "No payment yet"}
                </p>
                {latestPayment?.orderId ? (
                  <p className="mt-1 text-xs text-gray-500">Order: {latestPayment.orderId}</p>
                ) : null}
              </div>
            </div>

            {triggers?.renewal?.timeline?.length ? (
              <div className="mt-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-indigo-900">Renewal reminder timeline</p>
                    <p className="text-xs text-indigo-700">
                      {typeof triggers.renewal.daysToRenewal === "number"
                        ? `${triggers.renewal.daysToRenewal} day(s) to renewal`
                        : "Renewal schedule unavailable"}
                    </p>
                  </div>
                  {typeof triggers.renewal.currentStage === "number" ? (
                    <span className="rounded-full bg-indigo-600 px-2 py-1 text-xs font-semibold text-white">
                      D-{triggers.renewal.currentStage}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {triggers.renewal.timeline.map((item) => (
                    <span
                      key={item.day}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.status === "current"
                          ? "bg-indigo-600 text-white"
                          : item.status === "completed"
                            ? "bg-indigo-200 text-indigo-800"
                            : "bg-white text-indigo-700 border border-indigo-200"
                      }`}
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Usage Meters */}
            {usage && (
              <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Usage & Limits</h3>
                  <button
                    onClick={() => setBuyCreditModalOpen(true)}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700"
                  >
                    <Zap className="h-4 w-4" />
                    Buy Credits
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <UsageMeterCard
                    label="Messages Today"
                    used={usage.messagesUsedToday}
                    limit={usage.messagesPerDay}
                    unit="messages"
                    warningThreshold={80}
                  />
                  <UsageMeterCard
                    label="Contacts"
                    used={usage.contactsUsed}
                    limit={usage.contacts}
                    unit="contacts"
                    warningThreshold={80}
                  />
                  <UsageMeterCard
                    label="Phone Numbers"
                    used={usage.phoneNumbersUsed}
                    limit={usage.phoneNumbers}
                    unit="numbers"
                    warningThreshold={80}
                  />
                </div>
              </div>
            )}

            {subscription.subscriptionId ? (
              <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500">Subscription ID</p>
                <p className="mt-1 break-all font-mono text-sm text-gray-900">{subscription.subscriptionId}</p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/features/billing" className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
                Open Billing Center
              </Link>
              <Link href="/dashboard/features/invoices" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
                View Invoices
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Buy Credit Modal */}
      <BuyCreditModal
        isOpen={buyCreditModalOpen}
        onClose={() => setBuyCreditModalOpen(false)}
        onSuccess={(credits) => {
          setCurrentCredits(currentCredits + credits)
          loadData() // Refresh data
        }}
        currentCredits={currentCredits}
      />
    </div>
  )
}
