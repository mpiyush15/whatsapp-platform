"use client"

import { Activity, AlertCircle, CheckCircle, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import { API_URL } from "@/lib/config/api"

type ObservabilityResponse = {
  generatedAt: string
  summary: {
    systemStatus: "operational" | "degraded"
    healthScore: number
    activeAlerts: number
    messages24h: number
    failedMessages24h: number
  }
  services: Array<{
    name: string
    status: "healthy" | "warning"
    metricLabel: string
    metricValue: number
  }>
  incidents: Array<{
    severity: "warning" | "error"
    service: string
    detail: string
  }>
}

export default function SystemHealthPage() {
  const [snapshot, setSnapshot] = useState<ObservabilityResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const loadObservability = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/admin/system-health/observability`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      const data = await response.json()
      if (response.ok && data?.success) {
        setSnapshot(data.data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadObservability()
  }, [])

  if (loading) {
    return <div className="p-6">Loading observability...</div>
  }

  const statusOperational = snapshot?.summary.systemStatus === "operational"

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
        <p className="text-gray-600 mt-1">Step 9 observability foundation (API traffic, queue pressure, support and billing risk).</p>
      </div>

      {/* Overall Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">System Status</p>
              <p className={`text-xl font-bold ${statusOperational ? "text-green-600" : "text-orange-600"}`}>
                {statusOperational ? "Operational" : "Degraded"}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Health Score</p>
              <p className="text-xl font-bold text-gray-900">{snapshot?.summary.healthScore ?? 0}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Messages (24h)</p>
              <p className="text-xl font-bold text-gray-900">{snapshot?.summary.messages24h ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Alerts</p>
              <p className="text-xl font-bold text-gray-900">{snapshot?.summary.activeAlerts ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Status</h2>
        <div className="space-y-3">
          {(snapshot?.services || []).map((service, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${
                  service.status === "healthy" ? "bg-green-500" : "bg-orange-500"
                } animate-pulse`} />
                <div>
                  <p className="font-medium text-gray-900">{service.name}</p>
                  <p className="text-sm text-gray-600">{service.metricLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Value</p>
                  <p className="text-sm font-medium text-gray-900">{service.metricValue}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  service.status === "healthy" 
                    ? "bg-green-100 text-green-700" 
                    : "bg-orange-100 text-orange-700"
                }`}>
                  {service.status === "healthy" ? "Healthy" : "Warning"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Errors */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Incidents</h2>
        <div className="space-y-3">
          {(snapshot?.incidents || []).length === 0 ? (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
              No active incidents detected.
            </div>
          ) : (snapshot?.incidents || []).map((incident, index) => (
            <div key={index} className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className={`h-5 w-5 flex-shrink-0 ${
                incident.severity === "error" ? "text-red-600" : "text-orange-600"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900">{incident.service}</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    incident.severity === "error"
                      ? "bg-red-100 text-red-700"
                      : "bg-orange-100 text-orange-700"
                  }`}>
                    {incident.severity === "error" ? "Error" : "Warning"}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{incident.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
