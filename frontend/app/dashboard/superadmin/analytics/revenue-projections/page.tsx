"use client"

import { useEffect, useMemo, useState } from "react"
import { API_URL } from "@/lib/config/api"
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react"

type Scenario = "base" | "optimistic" | "conservative"

type ProjectionPoint = {
  month: number
  projectedMrr: number
  projectedArr: number
  growthImpact: number
  churnImpact: number
}

type RevenuePayload = {
  scenario: Scenario
  generatedAt: string
  summary: {
    mrrCurrent: number
    arrCurrent: number
    activeSubscriptions: number
    churnRiskAccounts: number
  }
  renewalPipeline: {
    next30Days: number
    next60Days: number
    next90Days: number
  }
  projection: ProjectionPoint[]
}

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export default function RevenueProjectionsPage() {
  const [scenario, setScenario] = useState<Scenario>("base")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<RevenuePayload | null>(null)

  const load = async (nextScenario: Scenario) => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem("token") || localStorage.getItem("authToken")
      const response = await fetch(`${API_URL}/admin/analytics/revenue-projections?scenario=${nextScenario}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || payload?.error || "Failed to load projections")
      }
      setData(payload?.data || null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projections")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(scenario)
  }, [scenario])

  const projectedSixMonthMrr = useMemo(() => {
    if (!data?.projection?.length) return 0
    return data.projection[data.projection.length - 1]?.projectedMrr || 0
  }, [data])

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Revenue Projections</h1>
            <p className="text-sm text-gray-600 mt-1">MRR/ARR forecast with renewal pipeline and churn-risk signal.</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1">
            {(["base", "optimistic", "conservative"] as Scenario[]).map((item) => (
              <button
                key={item}
                onClick={() => setScenario(item)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${scenario === item ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current MRR</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{formatINR(data?.summary?.mrrCurrent || 0)}</div>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current ARR</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{formatINR(data?.summary?.arrCurrent || 0)}</div>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">6M Forecast MRR</div>
            <div className="mt-1 text-2xl font-bold text-indigo-700">{formatINR(projectedSixMonthMrr)}</div>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Churn Risk Accounts</div>
            <div className="mt-1 text-2xl font-bold text-amber-700">{data?.summary?.churnRiskAccounts || 0}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border bg-white p-4 lg:col-span-2">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <BarChart3 className="h-4 w-4" />
              6-Month Projection
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Month</th>
                    <th className="px-3 py-2">Projected MRR</th>
                    <th className="px-3 py-2">Projected ARR</th>
                    <th className="px-3 py-2">Growth Impact</th>
                    <th className="px-3 py-2">Churn Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.projection || []).map((row) => (
                    <tr key={row.month} className="border-t">
                      <td className="px-3 py-2">M+{row.month}</td>
                      <td className="px-3 py-2 font-semibold text-gray-900">{formatINR(row.projectedMrr)}</td>
                      <td className="px-3 py-2 text-gray-700">{formatINR(row.projectedArr)}</td>
                      <td className="px-3 py-2 text-emerald-700">+{formatINR(row.growthImpact)}</td>
                      <td className="px-3 py-2 text-red-700">-{formatINR(row.churnImpact)}</td>
                    </tr>
                  ))}
                  {!loading && (data?.projection || []).length === 0 && (
                    <tr>
                      <td className="px-3 py-8 text-center text-gray-500" colSpan={5}>No projection data</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">Renewal Pipeline</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Next 30 days</span><span className="font-semibold">{data?.renewalPipeline?.next30Days || 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">31-60 days</span><span className="font-semibold">{data?.renewalPipeline?.next60Days || 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">61-90 days</span><span className="font-semibold">{data?.renewalPipeline?.next90Days || 0}</span></div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">Scenario Notes</div>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                {scenario === "optimistic" ? (
                  <p className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Assumes stronger expansion and lower churn.</p>
                ) : scenario === "conservative" ? (
                  <p className="inline-flex items-center gap-2"><TrendingDown className="h-4 w-4 text-amber-600" /> Assumes slower growth and higher churn.</p>
                ) : (
                  <p>Base assumes steady growth with moderate churn pressure.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
