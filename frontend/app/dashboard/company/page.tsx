'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Users, Send, Clock } from 'lucide-react';
import { getJWT } from '@/lib/auth';

export default function CompanyDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getJWT();
        if (!token) return;

        const res = await fetch('http://localhost:5050/api/company/analytics/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.data);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Your team's WhatsApp business metrics</p>
      </div>

      {/* KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Total Customers</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{metrics.totalCustomers || 0}</div>
              </div>
              <Users className="text-purple-500 opacity-30" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Active Conversations</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{metrics.activeConversations || 0}</div>
              </div>
              <MessageSquare className="text-purple-500 opacity-30" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Messages Sent</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{(metrics.messagesSent || 0).toLocaleString()}</div>
              </div>
              <Send className="text-purple-500 opacity-30" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Avg Response Time</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{metrics.avgResponseTime || 0}m</div>
              </div>
              <Clock className="text-purple-500 opacity-30" size={40} />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm text-center">
        <p className="text-gray-600">Company dashboard metrics loading...</p>
      </div>
    </div>
  );
}
