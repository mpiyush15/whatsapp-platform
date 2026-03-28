'use client';

import { useEffect, useState } from 'react';
import { Users, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import { getJWT } from '@/lib/auth';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getJWT();
        if (!token) return;

        // Fetch metrics
        const metricsRes = await fetch('http://localhost:5050/api/admin/metrics', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setMetrics(data.data);
        }

        // Fetch customers
        const customersRes = await fetch('http://localhost:5050/api/admin/customers?limit=10', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (customersRes.ok) {
          const data = await customersRes.json();
          setCustomers(data.data || []);
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
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Platform Dashboard</h1>
        <p className="text-gray-600">Overview of all customers and platform metrics</p>
      </div>

      {/* KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Total Customers</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{metrics.activeCustomers || 0}</div>
                <div className="text-green-600 text-xs mt-2">↑ {metrics.newCustomers || 0} new</div>
              </div>
              <Users className="text-green-500 opacity-30" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Active Subscriptions</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{metrics.activeSubscriptions || 0}</div>
                <div className="text-gray-600 text-xs mt-2">Paid plans</div>
              </div>
              <TrendingUp className="text-green-500 opacity-30" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Monthly Revenue (MRR)</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">₹{(metrics.mrr || 0).toLocaleString('en-IN')}</div>
                <div className="text-gray-600 text-xs mt-2">This month</div>
              </div>
              <DollarSign className="text-emerald-500 opacity-30" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Churn Rate</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{(metrics.churnRate || 0).toFixed(1)}%</div>
                <div className="text-gray-600 text-xs mt-2">Last 30 days</div>
              </div>
              <AlertCircle className="text-red-500 opacity-30" size={40} />
            </div>
          </div>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Recent Customers</h2>
          <Link
            href="/dashboard/superadmin/customers"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + View All
          </Link>
        </div>

        {customers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Plan</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Created</th>
                </tr>
              </thead>
              <tbody>
                {customers.slice(0, 10).map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{customer.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                        {customer.plan || 'Free'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <Users size={48} className="mx-auto mb-4 opacity-30" />
            <p>No customers found</p>
          </div>
        )}
      </div>
    </div>
  );
}
