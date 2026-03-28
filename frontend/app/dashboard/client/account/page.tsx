'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, UserRole } from '@/lib/auth';
import { CreditCard, MessageSquare, TrendingUp, Zap, Download, Plus, Eye, EyeOff } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface OrgInfo {
  _id: string;
  name: string;
  email: string;
  accountId: string;
  phone?: string;
  company?: string;
}

interface Subscription {
  subscriptionId: string;
  planName: string;
  status: 'active' | 'inactive' | 'expired';
  startDate: string;
  endDate: string | null;
  monthlyPrice?: number;
  monthlyAmount?: number;
  billingCycle: 'monthly' | 'annual' | 'quarterly' | 'lifetime';
  isLifetime?: boolean;
  validity?: 'lifetime';
}

interface Bill {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  date: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  paidAmount: number;
}

interface UsageMetrics {
  messagesSent: number;
  messagesLimit: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
  storageUsed: number;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'wallet';
  last4: string;
  holderName: string;
  isDefault: boolean;
  expiryMonth?: number;
  expiryYear?: number;
}

interface Transaction {
  transactionId: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  date: string;
  status: 'success' | 'pending' | 'failed';
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'bills' | 'subscriptions' | 'usage' | 'payments' | 'transactions'>('overview');
  const [showCardNumbers, setShowCardNumbers] = useState(false);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);

    // ✅ ALLOW: Clients (USER role) can access their subscription details
    // Check access - ADMIN, MANAGER, and USER roles can view account/billing
    if (!currentUser || ![UserRole.ADMIN, UserRole.MANAGER, UserRole.USER].includes(currentUser?.role)) {
      router.push('/dashboard');
      return;
    }

    fetchAllData();
  }, [router]);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch org info
      const orgRes = await fetch(`${API_URL}/accounts/me`, { headers });
      if (orgRes.ok) {
        const data = await orgRes.json();
        setOrgInfo(data.data);
      }

      // Fetch subscriptions
      const subRes = await fetch(`${API_URL}/billing/subscriptions`, { headers });
      if (subRes.ok) {
        const data = await subRes.json();
        setSubscriptions(data.data || []);
      }

      // Fetch bills
      const billRes = await fetch(`${API_URL}/billing/invoices`, { headers });
      if (billRes.ok) {
        const data = await billRes.json();
        setBills(data.data || []);
      }

      // Fetch usage
      const usageRes = await fetch(`${API_URL}/billing/usage`, { headers });
      if (usageRes.ok) {
        const data = await usageRes.json();
        setUsage(data.data);
      }

      // Fetch payment methods
      const pmRes = await fetch(`${API_URL}/billing/payment-methods`, { headers });
      if (pmRes.ok) {
        const data = await pmRes.json();
        setPaymentMethods(data.data || []);
      }

      // Fetch transactions
      const txRes = await fetch(`${API_URL}/billing/transactions`, { headers });
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching account data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalMonthlySpend = () => {
    return subscriptions.reduce((sum, sub) => sum + (sub.monthlyAmount || sub.monthlyPrice || 0), 0);
  };

  const getUnpaidBills = () => {
    return bills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + (b.amount - b.paidAmount), 0);
  };

  const downloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
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
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'paid':
      case 'success':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'failed':
      case 'overdue':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'inactive':
      case 'expired':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const value = amount || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading your account...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Mobile Optimized */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">My Account</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">{orgInfo?.name || 'Loading...'}</p>
            </div>
          </div>

          {/* Tab Navigation - Mobile Scrollable */}
          <div className="mt-4 sm:mt-6 border-t border-gray-200 pt-3 sm:pt-4">
            <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-2 -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 scrollbar-hide">
              {[
                { key: 'overview', label: 'Overview', icon: '📊' },
                { key: 'bills', label: 'Bills', icon: '📄' },
                { key: 'subscriptions', label: 'Plans', icon: '📅' },
                { key: 'usage', label: 'Usage', icon: '📈' },
                { key: 'payments', label: 'Payments', icon: '💳' },
                { key: 'transactions', label: 'History', icon: '💰' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="hidden sm:inline">{tab.icon} </span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Monthly Spend */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <span className="text-xs sm:text-sm text-gray-600 font-medium">Monthly Spend</span>
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(getTotalMonthlySpend())}</p>
                <p className="text-xs text-gray-500 mt-1 sm:mt-2">Active subs</p>
              </div>

              {/* Unpaid Bills */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <span className="text-xs sm:text-sm text-gray-600 font-medium">Unpaid Bills</span>
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                </div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(getUnpaidBills())}</p>
                <p className="text-xs text-gray-500 mt-1 sm:mt-2">{bills.filter(b => b.status !== 'paid').length} pending</p>
              </div>

              {/* Messages Sent */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <span className="text-xs sm:text-sm text-gray-600 font-medium">Messages</span>
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{usage?.messagesSent.toLocaleString('en-IN') || '0'}</p>
                <p className="text-xs text-gray-500 mt-1 sm:mt-2">This month</p>
              </div>

              {/* Active Plans */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <span className="text-xs sm:text-sm text-gray-600 font-medium">Plans</span>
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                </div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{subscriptions.filter(s => s.status === 'active').length}</p>
                <p className="text-xs text-gray-500 mt-1 sm:mt-2">Active plans</p>
              </div>
            </div>

            {/* Recent Bills & Subscriptions - Mobile Card Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Recent Bills */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Recent Bills</h3>
                {bills.slice(0, 3).length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {bills.slice(0, 3).map((bill) => (
                      <div key={bill.invoiceId} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{bill.invoiceNumber}</p>
                          <p className="text-xs text-gray-500">{formatDate(bill.date)}</p>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <p className="text-xs sm:text-sm font-bold text-gray-900">{formatCurrency(bill.amount)}</p>
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded border ${getStatusColor(bill.status)}`}>
                            {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs sm:text-sm">No bills found</p>
                )}
              </div>

              {/* Active Subscriptions */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Active Subscriptions</h3>
                {subscriptions.filter(s => s.status === 'active').length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {subscriptions.filter(s => s.status === 'active').slice(0, 3).map((sub) => (
                      <div key={sub.subscriptionId} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{sub.planName}</p>
                          <p className="text-xs text-gray-500">{sub.billingCycle === 'monthly' ? 'Monthly' : 'Annual'}</p>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <p className="text-xs sm:text-sm font-bold text-gray-900">{formatCurrency(sub.monthlyAmount || sub.monthlyPrice)}</p>
                          <p className="text-xs text-green-600">Active</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs sm:text-sm">No subscriptions found</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BILLS TAB */}
        {activeTab === 'bills' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">My Bills</h2>
              <p className="text-sm text-gray-600 mt-1">View and download all your invoices</p>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {bills.length > 0 ? (
                bills.map((bill) => (
                  <div key={bill.invoiceId} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                    {/* Mobile: Stacked layout, Desktop: Grid */}
                    <div className="sm:flex sm:items-center sm:justify-between">
                      <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                        <p className="text-xs sm:text-sm font-mono font-bold text-gray-900">{bill.invoiceNumber}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-600">
                          <span>Date: {formatDate(bill.date)}</span>
                          <span>Due: {formatDate(bill.dueDate)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                        <div>
                          <p className="text-xs text-gray-600">Amount</p>
                          <p className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(bill.amount)}</p>
                        </div>
                        <span className={`inline-block px-2 py-1 text-xs font-bold rounded border ${getStatusColor(bill.status)}`}>
                          {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 sm:pt-4 border-t border-gray-200 flex items-center justify-between">
                      <p className="text-xs sm:text-sm text-gray-600">Paid: <span className="font-bold text-green-600">{formatCurrency(bill.paidAmount)}</span></p>
                      <button
                        onClick={() => downloadInvoice(bill.invoiceId, bill.invoiceNumber)}
                        className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 text-xs sm:text-sm"
                      >
                        <Download className="w-4 h-4" /> Download
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
                  <p className="text-gray-600 text-sm">No bills found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBSCRIPTIONS TAB */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-3 sm:space-y-4">
            {subscriptions.length > 0 ? (
              subscriptions.map((sub) => (
                <div key={sub.subscriptionId} className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">{sub.planName}</h3>
                        {(sub.isLifetime || sub.validity === 'lifetime') && (
                          <span className="inline-block px-2 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border border-purple-300">
                            ∞ Lifetime
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {sub.billingCycle === 'lifetime' ? 'Lifetime Plan - Never expires' : 
                         sub.billingCycle === 'monthly' ? 'Monthly Plan' : 'Annual Plan'}
                      </p>
                    </div>
                    <span className={`inline-block px-3 py-1 text-xs sm:text-sm font-bold rounded-lg border whitespace-nowrap ${getStatusColor(sub.status)}`}>
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </span>
                  </div>

                  <div className={`grid ${sub.isLifetime || sub.validity === 'lifetime' ? 'grid-cols-2 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-3 sm:gap-4 mb-4 sm:mb-6`}>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Price</p>
                      <p className="text-base sm:text-xl font-bold text-gray-900">
                        {(sub.isLifetime || sub.validity === 'lifetime') ? 'Free Forever' : formatCurrency(sub.monthlyAmount || sub.monthlyPrice)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Start</p>
                      <p className="text-sm sm:text-base text-gray-900">{formatDate(sub.startDate)}</p>
                    </div>
                    {!(sub.isLifetime || sub.validity === 'lifetime') && (
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-xs text-gray-600 uppercase font-semibold mb-1">End</p>
                        <p className="text-sm sm:text-base text-gray-900">{sub.endDate ? formatDate(sub.endDate) : 'N/A'}</p>
                      </div>
                    )}
                  </div>

                  <div className={`rounded-lg p-3 sm:p-4 text-xs sm:text-sm border ${(sub.isLifetime || sub.validity === 'lifetime') 
                    ? 'bg-purple-50 text-purple-700 border-purple-100' 
                    : 'bg-blue-50 text-gray-700 border-blue-100'}`}>
                    <p>
                      {(sub.isLifetime || sub.validity === 'lifetime') 
                        ? '✅ Your lifetime subscription is active and never expires. Enjoy unlimited access forever.'
                        : `Next renewal on ${sub.endDate ? formatDate(sub.endDate) : 'TBD'}`}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
                <p className="text-gray-600 text-sm">No subscriptions found</p>
              </div>
            )}
          </div>
        )}

        {/* USAGE TAB */}
        {activeTab === 'usage' && (
          <div className="space-y-4 sm:space-y-6">
            {usage && (
              <>
                {/* Messages */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">WhatsApp Messages</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">Messages sent this billing cycle</p>
                    </div>
                    <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 opacity-50 flex-shrink-0" />
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">{usage.messagesSent.toLocaleString('en-IN')} / {usage.messagesLimit.toLocaleString('en-IN')}</span>
                      <span className="text-xs sm:text-sm font-bold text-gray-900">
                        {((usage.messagesSent / usage.messagesLimit) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
                      <div
                        className="bg-green-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (usage.messagesSent / usage.messagesLimit) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-600">
                    {usage.messagesLimit - usage.messagesSent > 0
                      ? `${(usage.messagesLimit - usage.messagesSent).toLocaleString('en-IN')} messages remaining`
                      : 'Limit exceeded - overage charges may apply'}
                  </p>
                </div>

                {/* API Calls */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">API Calls</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">API requests made this billing cycle</p>
                    </div>
                    <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 opacity-50 flex-shrink-0" />
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">{usage.apiCallsUsed.toLocaleString('en-IN')} / {usage.apiCallsLimit.toLocaleString('en-IN')}</span>
                      <span className="text-xs sm:text-sm font-bold text-gray-900">
                        {((usage.apiCallsUsed / usage.apiCallsLimit) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (usage.apiCallsUsed / usage.apiCallsLimit) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-600">
                    {usage.apiCallsLimit - usage.apiCallsUsed > 0
                      ? `${(usage.apiCallsLimit - usage.apiCallsUsed).toLocaleString('en-IN')} API calls remaining`
                      : 'Limit exceeded'}
                  </p>
                </div>

                {/* Storage */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">Storage Used</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">Database and file storage</p>
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{usage.storageUsed.toLocaleString('en-IN')} MB</p>
                  <p className="text-xs sm:text-sm text-gray-600">Unlimited storage included</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* PAYMENT METHODS TAB */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            {/* Add New Button */}
            <div className="flex justify-end">
              <button className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4" /> Add Payment
              </button>
            </div>

            {/* Payment Methods List */}
            {paymentMethods.length > 0 ? (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {method.type === 'card' && <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                            {method.type === 'card' ? 'Card' : 'Payment Method'}
                          </h3>
                          {method.isDefault && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded whitespace-nowrap">Default</span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                          {method.holderName} • {showCardNumbers ? `****${method.last4}` : '••••'}
                        </p>
                        {method.expiryMonth && method.expiryYear && (
                          <p className="text-xs text-gray-500 mt-1">
                            Expires {String(method.expiryMonth).padStart(2, '0')}/{method.expiryYear}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setShowCardNumbers(!showCardNumbers)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          {showCardNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button className="text-red-600 hover:text-red-700 font-medium text-xs p-1.5">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <CreditCard className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 text-sm mb-4">No payment methods added</p>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  <Plus className="w-4 h-4" /> Add Payment Method
                </button>
              </div>
            )}
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Transaction History</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">All your account transactions</p>
            </div>

            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.transactionId} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                        <p className="text-xs text-gray-500">{formatDate(tx.date)}</p>
                      </div>
                      <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded border whitespace-nowrap flex-shrink-0 ${getStatusColor(tx.status)}`}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        {tx.type === 'credit' ? 'Credit' : 'Debit'}
                      </span>
                      <p className={`text-sm sm:text-base font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-gray-900'}`}>
                        {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-600 text-sm">No transactions found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
