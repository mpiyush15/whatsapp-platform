"use client"

import { useState, useEffect } from "react"
import { RefreshCw } from "lucide-react"
import { API_URL } from "@/lib/config/api"
import { authService } from "@/lib/auth"
import { UsageMeterCard } from "@/components/UsageMeterCard"

interface Usage {
  messagesPerDay: number | null
  messagesUsedToday: number
  contacts: number | null
  contactsUsed: number
  phoneNumbers: number | null
  phoneNumbersUsed: number
}

export default function UsageLimitsPage() {
  const [usage, setUsage] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsage = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = authService.getToken()
      if (!token) {
        setError("Not authenticated")
        return
      }

      const response = await fetch(`${API_URL}/subscriptions/usage`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data?.message || "Failed to fetch usage")
      }

      setUsage(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load usage limits")
      setUsage(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsage()
    const interval = setInterval(fetchUsage, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-600">Loading usage limits...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Usage Limits</h1>
            <p className="mt-1 text-sm text-gray-600">Monitor your plan usage and upgrade if needed</p>
          </div>
          <button
            onClick={fetchUsage}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Usage Cards */}
        {usage ? (
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
        ) : null}

        {/* CTA */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-semibold text-blue-900">Need more capacity?</h2>
          <p className="mt-2 text-sm text-blue-700">Upgrade your plan to increase messaging limits, contacts, and phone numbers.</p>
          <a
            href="/dashboard/features/billing"
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            View Plans
          </a>
        </div>
      </div>
    </div>
  )
}
