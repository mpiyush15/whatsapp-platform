"use client"

import { AlertCircle, Zap } from "lucide-react"
import Link from "next/link"

interface QuotaExceededProps {
  resourceType: "message" | "contact" | "phone"
  limit: number
  used: number
  onDismiss?: () => void
}

export function QuotaExceededModal({
  resourceType,
  limit,
  used,
  onDismiss,
}: QuotaExceededProps) {
  const getResourceLabel = () => {
    switch (resourceType) {
      case "message":
        return "daily messages"
      case "contact":
        return "contacts"
      case "phone":
        return "phone numbers"
      default:
        return "resources"
    }
  }

  const getUpgradeLink = () => {
    return "/dashboard/features/billing"
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        {/* Header with red background */}
        <div className="bg-red-50 border-b border-red-200 p-6 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-lg font-bold text-red-900">Quota Exceeded</h2>
            <p className="text-sm text-red-700 mt-1">
              You've reached the limit for {getResourceLabel()} on your current plan
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Usage stats */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Current Usage</span>
              <span className="text-2xl font-bold text-gray-900">
                {used}/{limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full"
                style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Action items */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Quick fix options:</p>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  <li>• Upgrade to a higher plan</li>
                  <li>• Purchase additional credits</li>
                  <li>• Contact support for custom limits</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with actions */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 flex gap-3">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
            >
              Dismiss
            </button>
          )}
          <Link
            href={getUpgradeLink()}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition text-center"
          >
            Upgrade Plan
          </Link>
        </div>
      </div>
    </div>
  )
}
