"use client"

import { BarChart3, TrendingUp, Users, MessageSquare, DollarSign, Target } from "lucide-react"
import { ErrorToast } from "@/components/ErrorToast"
import { useState } from "react"

export default function AnalyticsPage() {
  const [error, setError] = useState("")
  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header - Mobile Optimized */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Track your WhatsApp marketing performance</p>
      </div>

      {/* Key Metrics - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
            <span className="text-xs sm:text-sm text-green-600 font-medium">+12.5%</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600">Total Messages</p>
          <p className="text-lg sm:text-3xl font-bold text-gray-900 mt-1">45,231</p>
          <p className="text-xs text-gray-500 mt-2">Last 30 days</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <span className="text-xs sm:text-sm text-green-600 font-medium">+8.2%</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600">Active Users</p>
          <p className="text-lg sm:text-3xl font-bold text-gray-900 mt-1">8,492</p>
          <p className="text-xs text-gray-500 mt-2">Last 30 days</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Target className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
            </div>
            <span className="text-xs sm:text-sm text-green-600 font-medium">+15.3%</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600">Conversion Rate</p>
          <p className="text-lg sm:text-3xl font-bold text-gray-900 mt-1">23.4%</p>
          <p className="text-xs text-gray-500 mt-2">Last 30 days</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
            </div>
            <span className="text-xs sm:text-sm text-green-600 font-medium">+21.7%</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600">Engagement Rate</p>
          <p className="text-lg sm:text-3xl font-bold text-gray-900 mt-1">67.8%</p>
          <p className="text-xs text-gray-500 mt-2">Last 30 days</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
            <span className="text-xs sm:text-sm text-green-600 font-medium">+18.9%</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600">Revenue Generated</p>
          <p className="text-lg sm:text-3xl font-bold text-gray-900 mt-1">₹2.4L</p>
          <p className="text-xs text-gray-500 mt-2">Last 30 days</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <span className="text-xs sm:text-sm text-green-600 font-medium">+9.4%</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600">Avg Response Time</p>
          <p className="text-lg sm:text-3xl font-bold text-gray-900 mt-1">2.4m</p>
          <p className="text-xs text-gray-500 mt-2">Last 30 days</p>
        </div>
      </div>

      {/* Charts Placeholder - Mobile Optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Message Performance</h3>
          <div className="h-48 sm:h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-500">Chart will be displayed here</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
          <div className="h-48 sm:h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-500">Chart will be displayed here</p>
          </div>
        </div>
      </div>

      {/* Top Performing Campaigns - Mobile Optimized */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Top Performing Campaigns</h3>
        <div className="space-y-2 sm:space-y-3">
          {[
            { name: "Summer Sale 2026", sent: 5420, opened: 4750, clicked: 3890, revenue: "₹89,450" },
            { name: "Product Launch", sent: 3200, opened: 2940, clicked: 2450, revenue: "₹54,200" },
            { name: "Welcome Series", sent: 2100, opened: 1950, clicked: 1680, revenue: "₹32,100" },
          ].map((campaign, index) => (
            <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{campaign.name}</p>
                <p className="text-[10px] sm:text-xs text-gray-600 mt-1 truncate">
                  Sent: {campaign.sent.toLocaleString()} | Opened: {campaign.opened.toLocaleString()} | Clicked: {campaign.clicked.toLocaleString()}
                </p>
              </div>
              <div className="flex-shrink-0 sm:text-right">
                <p className="text-base sm:text-lg font-bold text-green-600">{campaign.revenue}</p>
                <p className="text-[10px] sm:text-xs text-gray-600">Revenue</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
