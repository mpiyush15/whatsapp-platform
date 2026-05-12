"use client"

import { AlertCircle, TrendingUp } from "lucide-react"

interface UsageMeterProps {
  label: string
  used: number
  limit: number | null
  unit?: string
  warningThreshold?: number
}

export function UsageMeterCard({ label, used, limit, unit = "", warningThreshold = 80 }: UsageMeterProps) {
  if (limit === null || limit === undefined) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-sm font-semibold text-green-900">{label}</p>
          <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">UNLIMITED</span>
        </div>
        <p className="text-2xl font-bold text-green-900">∞</p>
      </div>
    )
  }

  const percentage = Math.round((used / limit) * 100)
  const isWarning = percentage >= warningThreshold
  const isExceeded = percentage >= 100

  const bgColor = isExceeded ? "bg-red-50" : isWarning ? "bg-yellow-50" : "bg-blue-50"
  const borderColor = isExceeded ? "border-red-200" : isWarning ? "border-yellow-200" : "border-blue-200"
  const barColor = isExceeded ? "bg-red-500" : isWarning ? "bg-yellow-500" : "bg-blue-500"
  const textColor = isExceeded ? "text-red-900" : isWarning ? "text-yellow-900" : "text-blue-900"

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-4`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className={`text-sm font-semibold ${textColor}`}>{label}</p>
          <p className={`text-2xl font-bold ${textColor} mt-1`}>
            {used.toLocaleString()} <span className="text-sm font-normal">{unit}</span>
          </p>
        </div>
        {isWarning && (
          <div className="flex-shrink-0">
            <AlertCircle className={`h-5 w-5 ${isExceeded ? "text-red-600" : "text-yellow-600"}`} />
          </div>
        )}
      </div>

      <div className="mb-2">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className={`text-xs font-medium ${textColor}`}>
          {percentage}% of {limit.toLocaleString()} {unit}
        </p>
        {isWarning && (
          <a href="/dashboard/features/billing" className="text-xs font-semibold text-blue-600 hover:underline">
            {isExceeded ? "Upgrade now" : "View plans"}
          </a>
        )}
      </div>

      {isExceeded && (
        <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700 font-semibold">
          ⚠️ Limit exceeded. Upgrade to continue.
        </div>
      )}
    </div>
  )
}
