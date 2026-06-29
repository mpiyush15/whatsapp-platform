'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface AnalyticsTabProps {
  projectId: string;
  accountId?: string;
}

export default function AnalyticsTab({ projectId, accountId }: AnalyticsTabProps) {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [filterPeriod, setFilterPeriod] = useState('last7');
  const [agentFilter, setAgentFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);

  const handleDateRangeChange = (period: string) => {
    setFilterPeriod(period);
    const now = new Date();
    let from = new Date();

    switch (period) {
      case 'last7':
        from.setDate(from.getDate() - 7);
        break;
      case 'last30':
        from.setDate(from.getDate() - 30);
        break;
      case 'last90':
        from.setDate(from.getDate() - 90);
        break;
      case 'all':
        from = new Date('2020-01-01');
        break;
      default:
        from.setDate(from.getDate() - 7);
    }

    setDateRange({
      from: from.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0],
    });
  };

  const handleCustomDateChange = (type: 'from' | 'to', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">
          <BarChart3 className="w-8 h-8 text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900">Analytics</h3>
        <p className="text-gray-600 mt-1">View your conversation and performance metrics</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={filterPeriod}
          onChange={(e) => handleDateRangeChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="last7">Last 7 days</option>
          <option value="last30">Last 30 days</option>
          <option value="last90">Last 90 days</option>
          <option value="all">All time</option>
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => handleCustomDateChange('from', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => handleCustomDateChange('to', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Chat Metrics Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Chats (per day)</h3>
          <div className="text-sm text-gray-600 space-x-4">
            <span>User Messages: <span className="font-bold text-gray-900">0</span></span>
            <span>Chatbot Messages: <span className="font-bold text-gray-900">0</span></span>
            <span>Business Messages: <span className="font-bold text-gray-900">0</span></span>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="h-64 bg-gray-50 rounded-md flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Chart visualization - Ready for Recharts integration</p>
              <p className="text-gray-600 text-xs mt-2">Displays: User Messages, Business Messages, Chatbot Messages</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Activity Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Agent Activity (per day)</h3>
          </div>
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option>ALL</option>
            <option>Agent 1</option>
            <option>Agent 2</option>
            <option>Agent 3</option>
          </select>
        </div>

        {/* Agent Metrics Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-2">Total Closed</p>
            <p className="text-3xl font-bold text-gray-900">0</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-2">Total Intervened</p>
            <p className="text-3xl font-bold text-gray-900">0</p>
          </div>
        </div>

        {/* Agent Chart Placeholder */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="h-64 bg-gray-50 rounded-md flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Chart visualization - Ready for Recharts integration</p>
              <p className="text-gray-600 text-xs mt-2">Displays: Closed conversations, Intervened conversations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Total Conversations</p>
          <p className="text-3xl font-bold text-teal-700">0</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Avg Response Time</p>
          <p className="text-3xl font-bold text-teal-700">-- mins</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Avg Rating</p>
          <p className="text-3xl font-bold text-teal-700">-- /5</p>
        </div>
      </div>
    </div>
  );
}
