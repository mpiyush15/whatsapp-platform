'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Users, TrendingUp } from 'lucide-react';
import { getJWT } from '@/lib/auth';

export default function ClientDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getJWT();
        if (!token) return;

        const res = await fetch('http://localhost:5050/api/client/analytics/dashboard', {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-2">WhatsApp Dashboard</h1>
        <p className="text-gray-600">Your messaging metrics and customer insights</p>
      </div>

      {/* KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Total Messages</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{(metrics.totalMessages || 0).toLocaleString()}</div>
                <div className="text-green-600 text-xs mt-2">↑ {metrics.todayMessages || 0} today</div>
              </div>
              <MessageCircle className="text-green-500 opacity-30" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Total Contacts</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{(metrics.totalContacts || 0).toLocaleString()}</div>
                <div className="text-gray-600 text-xs mt-2">All time</div>
              </div>
              <Users className="text-green-500 opacity-30" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Active Conversations</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{metrics.activeConversations || 0}</div>
                <div className="text-gray-600 text-xs mt-2">Open chats</div>
              </div>
              <TrendingUp className="text-green-500 opacity-30" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Response Rate</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">95%</div>
                <div className="text-gray-600 text-xs mt-2">Average</div>
              </div>
              <TrendingUp className="text-green-500 opacity-30" size={40} />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm text-center">
        <p className="text-gray-600">Client dashboard metrics loading...</p>
      </div>
    </div>
  );
}
