'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { authService } from '@/lib/auth'

interface MessagingMetrics {
  tier: string
  tierLimit: number
  messageCount: number
  usagePercentage: number
  remainingMessages: number
  phoneNumber?: string
  status: string
}

interface ContactsHeaderProps {
  projectId: string
}

export default function ContactsHeader({ projectId }: ContactsHeaderProps) {
  const [metrics, setMetrics] = useState<MessagingMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [phoneNumberId, setPhoneNumberId] = useState<string>('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"

  const getHeaders = () => {
    const token = authService.getToken()
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    }
  }

  // Fetch phone number ID from conversations first
  useEffect(() => {
    const fetchPhoneNumberId = async () => {
      try {
        const response = await fetch(`${API_URL}/conversations?limit=1`, {
          headers: getHeaders(),
        })
        const data = await response.json()
        const conversations = data.data?.conversations || data.conversations || []
        if (conversations.length > 0 && conversations[0].phoneNumberId) {
          setPhoneNumberId(conversations[0].phoneNumberId)
        }
      } catch (error) {
        console.error('Error fetching phone number ID:', error)
      }
    }
    
    fetchPhoneNumberId()
  }, [projectId])

  const fetchMetrics = async () => {
    if (!phoneNumberId) return

    try {
      setLoading(true)
      const response = await fetch(
        `${API_URL}/messaging-metrics/${phoneNumberId}`,
        { headers: getHeaders() }
      )
      
      const data = await response.json()
      if (data.success) {
        setMetrics(data.data)
      }
    } catch (error) {
      console.error('Error fetching messaging metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    // Refresh every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [phoneNumberId])

  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-600'
    if (percentage < 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="px-6 py-4">
        {/* Top Row: Heading + Refresh */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <p className="text-gray-500 text-xs mt-0.5">Manage your WhatsApp contacts</p>
          </div>
          <button
            onClick={() => {
              fetchMetrics()
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "..." : "Refresh"}
          </button>
        </div>

        {/* Bottom Row: Metrics */}
        {metrics && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Tier:</span>
              <span className="font-bold text-gray-900">{metrics.tier}</span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Usage:</span>
              <span className="font-bold text-gray-900">{metrics.messageCount}/{metrics.tierLimit}</span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Remaining:</span>
              <span className={`font-bold ${metrics.remainingMessages > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.remainingMessages}
              </span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <span className={`text-base font-bold ${getUsageColor(metrics.usagePercentage)}`}>
                {metrics.usagePercentage}%
              </span>
              <span className="text-gray-500 text-xs">used</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
