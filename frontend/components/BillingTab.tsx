'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Download, Plus, TrendingUp, AlertCircle } from 'lucide-react';
import { BuyCreditModal } from '@/components/BuyCreditModal';

interface BillingTabProps {
  projectId: string;
  accountId?: string;
}

interface PlanData {
  name: string;
  description: string;
  creditBalance: number;
  freeCreditsRemaining: number;
}

interface CreditUsage {
  bicCount: number;
  bicCreditUsage: number;
  uicCount: number;
  uicCreditUsage: number;
  scCount: number;
  scCreditUsage: number;
  acCount: number;
  acCreditUsage: number;
  mcCount: number;
  mcCreditUsage: number;
  ucCount: number;
  ucCreditUsage: number;
  waPayCount: number;
  waPayCreditUsage: number;
  totalCreditUsage: number;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  downloadUrl: string;
}

export default function BillingTab({ projectId, accountId }: BillingTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [creditUsage, setCreditUsage] = useState<CreditUsage | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [billingAddress, setBillingAddress] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [filterPeriod, setFilterPeriod] = useState('last7');
  const [buyCreditModalOpen, setBuyCreditModalOpen] = useState(false);

  // ✅ CRITICAL: Fetch data with projectId in URL path
  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setIsLoading(true);
        
        const params = accountId ? `?accountId=${accountId}` : '';

        // Fetch billing plan
        const planRes = await fetch(`/api/projects/${projectId}/billing/plan${params}`);
        if (planRes.ok) setPlan(await planRes.json());

        // Fetch credit usage
        const usageRes = await fetch(
          `/api/projects/${projectId}/billing/usage${params}&from=${dateRange.from}&to=${dateRange.to}`
        );
        if (usageRes.ok) setCreditUsage(await usageRes.json());

        // Fetch invoices
        const invoicesRes = await fetch(`/api/projects/${projectId}/billing/invoices${params}`);
        if (invoicesRes.ok) setInvoices(await invoicesRes.json());

        // Fetch payment method
        const paymentRes = await fetch(`/api/projects/${projectId}/billing/payment-method${params}`);
        if (paymentRes.ok) {
          const data = await paymentRes.json();
          setPaymentMethod(data.method || null);
        }

        // Fetch billing address
        const addressRes = await fetch(`/api/projects/${projectId}/billing/address${params}`);
        if (addressRes.ok) {
          const data = await addressRes.json();
          setBillingAddress(data.address || null);
        }
      } catch (error) {
        console.error('Error fetching billing data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillingData();
  }, [projectId, accountId, dateRange]);

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

  const handleBuyCredits = async () => {
    setBuyCreditModalOpen(true);
  };

  const handleAddPaymentMethod = async () => {
    alert('Add payment method modal');
  };

  const handleAddBillingAddress = async () => {
    alert('Add billing address modal');
  };

  const handleGetPlan = async () => {
    alert('Show available plans');
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const params = accountId ? `?accountId=${accountId}` : '';
      const response = await fetch(
        `/api/projects/${projectId}/billing/invoices/${invoice.id}/download${params}`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoice.date}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">
          <CreditCard className="w-8 h-8 text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ===== CURRENT PLAN SECTION ===== */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Current Plan */}
          <div>
            <p className="text-sm text-gray-500 mb-2">Current Plan</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {plan?.name || 'FREE FOREVER'}
            </h2>
            {!plan || plan.name === 'FREE FOREVER' ? (
              <div>
                <p className="text-gray-600 mb-4">You don't have any active plan</p>
                <button
                  onClick={handleGetPlan}
                  className="bg-teal-700 hover:bg-teal-800 text-white px-6 py-2 rounded-md font-medium transition"
                >
                  Get a Plan
                </button>
              </div>
            ) : (
              <p className="text-gray-600">{plan.description}</p>
            )}
          </div>

          {/* Free Service Conversation */}
          <div className="border-l border-gray-200 pl-6">
            <p className="text-sm text-gray-500 mb-2">Free Service Conversation</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">Remaining Credits</span>
                <span className="text-2xl font-bold text-teal-700">
                  {plan?.freeCreditsRemaining || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((plan?.freeCreditsRemaining || 0) / (plan?.creditBalance + 100)) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CREDITS PURCHASE SECTION ===== */}
      <div className="grid grid-cols-2 gap-6">
        {/* WhatsApp Conversation Credits */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 font-semibold mb-4">WhatsApp Conversation Credits (WCC)</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Price per credit</p>
              <p className="text-3xl font-bold text-gray-900">₹ 50.00</p>
            </div>
            <button
              onClick={handleBuyCredits}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white py-2 rounded-md font-medium transition"
            >
              Buy More
            </button>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900 font-semibold">Payment Method</h3>
            <div className="flex gap-2">
              <button
                onClick={() => alert('View invoices')}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition"
              >
                Invoices
              </button>
              <button
                onClick={handleAddPaymentMethod}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition"
              >
                Add Card
              </button>
            </div>
          </div>
          {paymentMethod ? (
            <p className="text-gray-700">{paymentMethod}</p>
          ) : (
            <p className="text-gray-500 text-sm">Add your credit card for future purchases</p>
          )}
        </div>
      </div>

      {/* ===== BILLING ADDRESS SECTION ===== */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 font-semibold">Billing Address</h3>
          <button
            onClick={handleAddBillingAddress}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition text-sm font-medium"
          >
            Add
          </button>
        </div>
        {billingAddress ? (
          <p className="text-gray-700 whitespace-pre-line">{billingAddress}</p>
        ) : (
          <p className="text-red-600 text-sm">Add your billing address.</p>
        )}
      </div>

      {/* ===== CONVERSATION CREDIT USAGE SECTION ===== */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-gray-900 font-semibold mb-4">Conversation Credit Usage</h3>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <select
            value={filterPeriod}
            onChange={(e) => handleDateRangeChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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

          <select
            defaultValue="ALL"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option>ALL</option>
            <option>BIC</option>
            <option>UIC</option>
            <option>SC</option>
            <option>AC</option>
            <option>MC</option>
            <option>UC</option>
            <option>WA Pay</option>
          </select>
        </div>

        {/* Usage Tables */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">BIC Count</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">BIC Credit Usage</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">UIC Count</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">UIC Credit Usage</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">SC Count</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">SC Credit Usage</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{creditUsage?.bicCount || 0}</td>
                <td className="px-4 py-3 text-gray-900">₹{(creditUsage?.bicCreditUsage || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-900">{creditUsage?.uicCount || 0}</td>
                <td className="px-4 py-3 text-gray-900">₹{(creditUsage?.uicCreditUsage || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-900">{creditUsage?.scCount || 0}</td>
                <td className="px-4 py-3 text-gray-900">₹{(creditUsage?.scCreditUsage || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Extended Metrics Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">AC Count</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">AC Credit Usage</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">MC Count</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">MC Credit Usage</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">UC Count</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">UC Credit Usage</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{creditUsage?.acCount || 0}</td>
                <td className="px-4 py-3 text-gray-900">₹{(creditUsage?.acCreditUsage || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-900">{creditUsage?.mcCount || 0}</td>
                <td className="px-4 py-3 text-gray-900">₹{(creditUsage?.mcCreditUsage || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-900">{creditUsage?.ucCount || 0}</td>
                <td className="px-4 py-3 text-gray-900">₹{(creditUsage?.ucCreditUsage || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* WA Pay Metrics */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">WA Pay Count</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">WA Pay Credit Usage</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Total Credit Usage</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{creditUsage?.waPayCount || 0}</td>
                <td className="px-4 py-3 text-gray-900">₹{(creditUsage?.waPayCreditUsage || 0).toFixed(2)}</td>
                <td className="px-4 py-3 font-semibold text-teal-700">₹{(creditUsage?.totalCreditUsage || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Usage Chart Placeholder */}
        <div className="border-t border-gray-200 pt-6">
          <div className="h-64 bg-gray-50 rounded-md flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Chart implementation - Ready for Recharts integration</p>
            </div>
          </div>
        </div>
      </div>

      <BuyCreditModal
        isOpen={buyCreditModalOpen}
        onClose={() => setBuyCreditModalOpen(false)}
        currentCredits={Number(plan?.creditBalance || 0)}
        projectId={projectId}
        onSuccess={(credits) => {
          setPlan((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              creditBalance: Number(prev.creditBalance || 0) + Number(credits || 0),
            };
          });
        }}
      />

      {/* ===== RECENT INVOICES SECTION ===== */}
      {invoices.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 font-semibold mb-4">Recent Invoices</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{new Date(invoice.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-900">₹{invoice.amount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : invoice.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDownloadInvoice(invoice)}
                        className="flex items-center gap-2 text-teal-700 hover:text-teal-900 font-medium transition"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
