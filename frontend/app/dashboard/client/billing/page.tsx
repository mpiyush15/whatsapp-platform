'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, UserRole } from '@/lib/auth';
import { AccountType, PaymentStatus } from '@/lib/enums';
import BillingBreakdown from '@/components/BillingBreakdown';
import PaymentMethods from '@/components/PaymentMethods';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface AccountInfo {
  _id: string;
  accountId: string;
  name: string;
  email: string;
  plan: string;
  billingCycle: string;
  createdAt: string;
  status: string;
}

interface BillingStats {
  activeSubscriptions: number;
  totalSpent: number;
  nextRenewal: string;
  currency: string;
}

interface Invoice {
  invoiceNumber: string;
  invoiceId: string;
  date: string;
  amount: number;
  status: PaymentStatus;
  dueDate: string;
  paidAmount: number;
  downloadUrl: string;
}

export default function BillingPage() {
  const router = useRouter();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accountAge, setAccountAge] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    
    // Redirect superadmins to admin invoices page
    if (currentUser?.type === AccountType.INTERNAL || currentUser?.role === 'superadmin') {
      router.push('/dashboard/invoices');
      return;
    }

    // For org admins, load their organizations
    if (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER) {
      fetchUserOrganizations();
    }

    fetchAccountInfo();
    fetchBillingStats();
    fetchInvoices();
  }, [router]);

  const fetchUserOrganizations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.data || []);
        // Set first org as default
        if (data.data?.length > 0) {
          setSelectedOrg(data.data[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const fetchAccountInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/accounts/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAccountInfo(data.data);

        // Calculate account age
        if (data.data?.createdAt) {
          const createdDate = new Date(data.data.createdAt);
          const now = new Date();
          const diffTime = now.getTime() - createdDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const diffMonths = Math.floor(diffDays / 30);
          const diffYears = Math.floor(diffMonths / 12);

          if (diffYears > 0) {
            setAccountAge(`${diffYears} year${diffYears > 1 ? 's' : ''} ${diffMonths % 12} month${(diffMonths % 12) !== 1 ? 's' : ''}`);
          } else if (diffMonths > 0) {
            setAccountAge(`${diffMonths} month${diffMonths > 1 ? 's' : ''} ${diffDays % 30} day${(diffDays % 30) !== 1 ? 's' : ''}`);
          } else {
            setAccountAge(`${diffDays} day${diffDays !== 1 ? 's' : ''}`);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching account info:', error);
    }
  };

  const fetchBillingStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/billing/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching billing stats:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/billing/invoices`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/billing/invoices/${invoiceId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.pdfUrl) {
          window.open(data.data.pdfUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Failed to download invoice');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case PaymentStatus.PAID:
      case PaymentStatus.SENT:
        return 'bg-green-100 text-green-800';
      case PaymentStatus.DRAFT:
      case PaymentStatus.PARTIAL:
      case PaymentStatus.OVERDUE:
        return 'bg-yellow-100 text-yellow-800';
      case PaymentStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading && !accountInfo) {
    return (
      <div className="p-3 sm:p-6 flex items-center justify-center min-h-screen">
        <div className="text-xs sm:text-sm text-gray-600">Loading your billing information...</div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Billing & Account</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage your organization and view transaction history</p>
        </div>
      </div>

      {/* Organization Selection for Admins/Managers */}
      {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && organizations.length > 1 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-6">
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-3">Select Organization</label>
          <select
            value={selectedOrg || ''}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose an organization...</option>
            {organizations.map((org) => (
              <option key={org._id} value={org._id}>
                {org.name} ({org.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Account Information Card */}
      {accountInfo && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Account Information</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Organization Name */}
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold mb-2">Organization Name</p>
              <p className="text-lg font-bold text-gray-900">{accountInfo.name || 'N/A'}</p>
            </div>

            {/* Email */}
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold mb-2">Email Address</p>
              <p className="text-sm font-mono text-gray-900">{accountInfo.email || 'N/A'}</p>
            </div>

            {/* Account ID */}
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold mb-2">Account ID</p>
              <p className="text-lg font-mono font-bold text-blue-600">{accountInfo.accountId || 'N/A'}</p>
            </div>

            {/* Plan */}
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold mb-2">Current Plan</p>
              <p className="text-lg font-bold text-gray-900 capitalize">{accountInfo.plan || 'N/A'}</p>
            </div>

            {/* Billing Cycle */}
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold mb-2">Billing Cycle</p>
              <p className="text-lg font-bold text-gray-900 capitalize">{accountInfo.billingCycle || 'Monthly'}</p>
            </div>

            {/* Account Status */}
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold mb-2">Account Status</p>
              <span className="inline-block px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800">
                {accountInfo.status?.charAt(0).toUpperCase() + accountInfo.status?.slice(1) || 'Active'}
              </span>
            </div>

            {/* Created Date */}
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold mb-2">Created On</p>
              <p className="text-sm text-gray-900">
                {new Date(accountInfo.createdAt).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>

            {/* Account Age */}
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold mb-2">Account Age</p>
              <p className="text-sm font-semibold text-gray-900">{accountAge || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Billing Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Spent */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
            <p className="text-xs text-blue-700 uppercase font-semibold mb-2">Total Amount Spent</p>
            <p className="text-3xl font-bold text-blue-900">
              ₹{stats.totalSpent?.toLocaleString('en-IN') || '0'}
            </p>
            <p className="text-xs text-blue-600 mt-2">All time</p>
          </div>

          {/* Active Subscriptions */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
            <p className="text-xs text-green-700 uppercase font-semibold mb-2">Active Subscriptions</p>
            <p className="text-3xl font-bold text-green-900">{stats.activeSubscriptions || 0}</p>
            <p className="text-xs text-green-600 mt-2">Currently active</p>
          </div>

          {/* Next Renewal */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
            <p className="text-xs text-purple-700 uppercase font-semibold mb-2">Next Renewal</p>
            <p className="text-lg font-bold text-purple-900">
              {new Date(stats.nextRenewal).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
            <p className="text-xs text-purple-600 mt-2">
              {Math.ceil((new Date(stats.nextRenewal).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days from now
            </p>
          </div>

          {/* Currency */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
            <p className="text-xs text-orange-700 uppercase font-semibold mb-2">Currency</p>
            <p className="text-3xl font-bold text-orange-900">{stats.currency || 'INR'}</p>
            <p className="text-xs text-orange-600 mt-2">All transactions</p>
          </div>
        </div>
      )}

      {/* Billing Breakdown Component */}
      <BillingBreakdown organizationId={selectedOrg || undefined} />

      {/* Payment Methods Component */}
      <PaymentMethods organizationId={selectedOrg || undefined} />

      {/* Usage Breakdown - Legacy Section */}

      {/* Invoices & Transactions */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Invoices & Transactions</h2>
          <p className="text-sm text-gray-600 mt-1">View and download all your invoices</p>
        </div>

        <div className="overflow-x-auto">
          {invoices.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Paid</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono font-bold text-gray-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(invoice.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                      ₹{invoice.amount?.toLocaleString('en-IN') || '0'}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-green-600 text-right">
                      ₹{invoice.paidAmount?.toLocaleString('en-IN') || '0'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(invoice.status)}`}>
                        {invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDownloadInvoice(invoice.invoiceId)}
                        className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center">
              <p className="text-gray-600">No invoices found</p>
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-3">Need Help?</h3>
        <p className="text-sm text-blue-800 mb-3">
          For billing inquiries, invoice disputes, or to update payment methods, please contact our support team.
        </p>
        <div className="flex gap-4">
          <a
            href="mailto:support@replysys.com"
            className="text-blue-600 hover:text-blue-800 font-semibold underline"
          >
            📧 Email Support
          </a>
          <a
            href="tel:9766504856"
            className="text-blue-600 hover:text-blue-800 font-semibold underline"
          >
            📱 Call Us
          </a>
        </div>
      </div>
    </div>
  );
}
