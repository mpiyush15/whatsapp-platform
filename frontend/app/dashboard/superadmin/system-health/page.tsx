"use client"

import { Activity, AlertCircle, CheckCircle, Server, Database, Zap, Clock } from "lucide-react"
import { ErrorToast } from "@/components/ErrorToast"
import { useState } from "react"

export default function SystemHealthPage() {
  const [error, setError] = useState("")
  const services = [
    { name: "API Server", status: "Healthy", uptime: "99.9%", responseTime: "45ms", lastCheck: "Just now" },
    { name: "WhatsApp API", status: "Healthy", uptime: "99.7%", responseTime: "120ms", lastCheck: "1 min ago" },
    { name: "Database", status: "Healthy", uptime: "100%", responseTime: "8ms", lastCheck: "Just now" },
    { name: "Redis Cache", status: "Healthy", uptime: "99.8%", responseTime: "2ms", lastCheck: "Just now" },
    { name: "Message Queue", status: "Warning", uptime: "98.5%", responseTime: "230ms", lastCheck: "2 min ago" },
  ]

  const recentErrors = [
    { time: "2 mins ago", service: "WhatsApp API", error: "Rate limit exceeded for org: fashion-store", severity: "Warning" },
    { time: "15 mins ago", service: "Message Queue", error: "High latency detected", severity: "Warning" },
    { time: "1 hour ago", service: "API Server", error: "Timeout on /api/broadcasts", severity: "Error" },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
        <p className="text-gray-600 mt-1">Monitor platform infrastructure and services</p>
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
              <p className="text-xl font-bold text-green-600">Operational</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Uptime</p>
              <p className="text-xl font-bold text-gray-900">99.8%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Response</p>
              <p className="text-xl font-bold text-gray-900">85ms</p>
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
              <p className="text-xl font-bold text-gray-900">2</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Status</h2>
        <div className="space-y-3">
          {services.map((service, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${
                  service.status === "Healthy" ? "bg-green-500" : "bg-orange-500"
                } animate-pulse`} />
                <div>
                  <p className="font-medium text-gray-900">{service.name}</p>
                  <p className="text-sm text-gray-600">Last check: {service.lastCheck}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Uptime</p>
                  <p className="text-sm font-medium text-gray-900">{service.uptime}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Response Time</p>
                  <p className="text-sm font-medium text-gray-900">{service.responseTime}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  service.status === "Healthy" 
                    ? "bg-green-100 text-green-700" 
                    : "bg-orange-100 text-orange-700"
                }`}>
                  {service.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Errors */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Errors & Warnings</h2>
        <div className="space-y-3">
          {recentErrors.map((error, index) => (
            <div key={index} className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className={`h-5 w-5 flex-shrink-0 ${
                error.severity === "Error" ? "text-red-600" : "text-orange-600"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900">{error.service}</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    error.severity === "Error"
                      ? "bg-red-100 text-red-700"
                      : "bg-orange-100 text-orange-700"
                  }`}>
                    {error.severity}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{error.error}</p>
                <p className="text-xs text-gray-500 mt-1">{error.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
