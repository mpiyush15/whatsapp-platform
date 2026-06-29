"use client"

import { useEffect, useMemo, useState } from "react"
import { API_URL } from "@/lib/config/api"
import { ArrowRightLeft, Calendar, RefreshCw } from "lucide-react"

type Plan = {
  _id: string
  planId?: string
  name: string
  monthlyPrice: number
  yearlyPrice: number
  description?: string
  features?: { included?: string[] }
}

type SubscriptionRecord = {
  _id: string
  planName?: string
  billingCycle?: string
  amount?: number
  renewalDate?: string
  status?: string
}

type ChangePreview = {
  currentPlan: {
    planName: string
    billingCycle: string
    amount: number
    renewalDate: string
  }
  targetPlan: {
    planId: string
    planName: string
    billingCycle: string
    amount: number
  }
  proration: {
    daysRemaining: number
    unusedCredit: number
    proratedCharge: number
  }
  effectiveDate: string
}

function formatCurrency(value?: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`
}

function formatDate(value?: string) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
}

export default function ChangePlanPage() {
  const [loading, setLoading] = useState(true)
  const [sub, setSub] = useState<SubscriptionRecord | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlanName, setSelectedPlanName] = useState("")
  const [selectedCycle, setSelectedCycle] = useState<"monthly" | "annual">("monthly")
  const [effectiveDate, setEffectiveDate] = useState<"renewal" | "immediate">("renewal")
  const [preview, setPreview] = useState<ChangePreview | null>(null)
  const [message, setMessage] = useState("")
  const [working, setWorking] = useState(false)

  const token = typeof window !== "undefined" ? (localStorage.getItem("token") || localStorage.getItem("authToken")) : null

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.name.toLowerCase() === selectedPlanName.toLowerCase()) || null,
    [plans, selectedPlanName]
  )

  const fetchJson = async (path: string, init?: RequestInit) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    })

    const payload = await response.json()
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message || "Request failed")
    }
    return payload.data
  }

  const load = async () => {
    if (!token) return

    try {
      setLoading(true)
      setMessage("")
      const [subscriptionData, plansData] = await Promise.all([
        fetchJson("/subscriptions/my-subscriptions"),
        fetch(`${API_URL}/pricing/plans/public`, { cache: "no-store" }).then((r) => r.json()),
      ])

      const subscriptions = Array.isArray(subscriptionData?.subscriptions) ? subscriptionData.subscriptions : []
      const planList = plansData?.data?.data || plansData?.data || []

      setSub(subscriptions[0] || null)
      setPlans(Array.isArray(planList) ? planList : [])

      if (subscriptions[0]?.planName) {
        setSelectedPlanName(subscriptions[0].planName)
      } else if (Array.isArray(planList) && planList[0]?.name) {
        setSelectedPlanName(planList[0].name)
      }

      const currentCycle = String(subscriptions[0]?.billingCycle || "monthly").toLowerCase()
      setSelectedCycle(currentCycle === "yearly" ? "annual" : "monthly")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load plan data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getPreview = async () => {
    if (!selectedPlanName) return
    setWorking(true)
    setMessage("")
    try {
      const data = await fetchJson("/subscriptions/change-plan", {
        method: "POST",
        body: JSON.stringify({
          newPlanName: selectedPlanName,
          billingCycle: selectedCycle,
          effectiveDate,
          applyChange: false,
        }),
      })
      setPreview(data?.preview || null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to generate preview")
      setPreview(null)
    } finally {
      setWorking(false)
    }
  }

  const applyChange = async () => {
    if (!selectedPlanName) return
    setWorking(true)
    setMessage("")
    try {
      const data = await fetchJson("/subscriptions/change-plan", {
        method: "POST",
        body: JSON.stringify({
          newPlanName: selectedPlanName,
          billingCycle: selectedCycle,
          effectiveDate,
          applyChange: true,
        }),
      })
      setPreview(data?.preview || null)
      setMessage(data?.mode === "applied" ? "Plan updated successfully." : "Plan change scheduled at renewal.")
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to apply plan change")
    } finally {
      setWorking(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading plan options...</div>
  }

  if (!sub) {
    return <div className="p-6 text-sm text-gray-700">No active subscription found. Please activate a plan first.</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Change Plan</h1>
            <p className="text-sm text-gray-600">Compare plans, review proration preview, and apply immediately or on renewal.</p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-gray-500">Current subscription</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-800">
            <span className="font-semibold">{sub.planName || "-"}</span>
            <span>•</span>
            <span className="capitalize">{sub.billingCycle || "monthly"}</span>
            <span>•</span>
            <span>{formatCurrency(sub.amount)}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Renews {formatDate(sub.renewalDate)}</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Target Plan</h2>
            <select
              value={selectedPlanName}
              onChange={(e) => setSelectedPlanName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {plans.map((plan) => (
                <option key={plan._id} value={plan.name}>{plan.name}</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedCycle("monthly")}
                className={`rounded-lg border px-3 py-2 text-sm ${selectedCycle === "monthly" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setSelectedCycle("annual")}
                className={`rounded-lg border px-3 py-2 text-sm ${selectedCycle === "annual" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"}`}
              >
                Annual
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEffectiveDate("renewal")}
                className={`rounded-lg border px-3 py-2 text-sm ${effectiveDate === "renewal" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-300 bg-white text-gray-700"}`}
              >
                On Renewal
              </button>
              <button
                type="button"
                onClick={() => setEffectiveDate("immediate")}
                className={`rounded-lg border px-3 py-2 text-sm ${effectiveDate === "immediate" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-300 bg-white text-gray-700"}`}
              >
                Immediate
              </button>
            </div>

            {selectedPlan ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <p className="font-medium text-gray-900">{selectedPlan.name}</p>
                <p className="mt-1">{selectedPlan.description || "No description"}</p>
                <p className="mt-2 text-xs">Monthly: {formatCurrency(selectedPlan.monthlyPrice)} • Annual: {formatCurrency(selectedPlan.yearlyPrice)}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={getPreview}
                disabled={working}
                className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                Preview Change
              </button>
              <button
                type="button"
                onClick={applyChange}
                disabled={working || !preview}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Apply Change
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-900">Proration Preview</h2>
            {!preview ? (
              <p className="mt-3 text-sm text-gray-600">Run preview to see effective date and prorated charge.</p>
            ) : (
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <div className="flex items-center justify-between"><span>Current plan amount</span><span className="font-medium">{formatCurrency(preview.currentPlan.amount)}</span></div>
                <div className="flex items-center justify-between"><span>Target plan amount</span><span className="font-medium">{formatCurrency(preview.targetPlan.amount)}</span></div>
                <div className="flex items-center justify-between"><span>Days remaining</span><span className="font-medium">{preview.proration.daysRemaining}</span></div>
                <div className="flex items-center justify-between"><span>Unused credit</span><span className="font-medium">{formatCurrency(preview.proration.unusedCredit)}</span></div>
                <div className="flex items-center justify-between"><span>Prorated charge</span><span className="font-semibold text-gray-900">{formatCurrency(preview.proration.proratedCharge)}</span></div>
                <div className="flex items-center justify-between"><span>Effective date</span><span className="font-medium">{formatDate(preview.effectiveDate)}</span></div>
              </div>
            )}
          </div>
        </div>

        {message ? <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div> : null}
      </div>
    </div>
  )
}
