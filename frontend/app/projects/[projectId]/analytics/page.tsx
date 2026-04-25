'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

export default function AnalyticsPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    const initPage = async () => {
      try {
        const response = await fetch(`${API_URL}/analytics?projectId=${projectId}`);

        if (response.ok) {
          const data = await response.json();
          setStats(data.data?.stats || {});
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }

      setLoading(false);
    };

    if (projectId) {
      initPage();
    }
  }, [projectId]);

  if (loading) {
    return <div className="p-6 text-gray-600">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-2">View your performance metrics and insights</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-medium">Total Messages</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalMessages || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-medium">Delivered</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.delivered || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-medium">Read</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.read || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-medium">Failed</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.failed || 0}</p>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Message Trends</h2>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
          <p className="text-gray-500">Chart will be displayed here</p>
        </div>
      </div>
    </div>
  );
}
