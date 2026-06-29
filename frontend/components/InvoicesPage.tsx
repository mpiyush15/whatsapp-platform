'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface Invoice {
  _id: string;
  invoiceId: string;
  invoiceNumber: string;
  accountId: string;
  subscriptionId: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  dueAmount: number;
  paidAmount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  createdAt: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchInvoices();
  }, [filter, page]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const statusFilter = filter === 'all' ? '' : filter === 'paid' ? 'paid' : filter === 'pending' ? 'partial' : 'overdue';
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/invoice/my-invoices?status=${statusFilter}&limit=10&skip=${(page - 1) * 10}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );
      const data = await response.json();
      if (data.success) {
        setInvoices(data.data);
        setTotal(data.pagination.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      pending: 'bg-blue-100 text-blue-800',
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusStyles[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading && invoices.length === 0) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Invoices</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-8">
        {(['all', 'paid', 'pending', 'overdue'] as const).map(f => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {invoices.length === 0 ? (
        <div className="bg-gray-50 border rounded-lg p-12 text-center">
          <p className="text-gray-600 text-lg mb-4">No invoices found</p>
          <p className="text-gray-500">Start your subscription to receive invoices</p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Invoice #</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Date</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Amount</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Due Amount</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice, index) => (
                <tr
                  key={invoice._id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {new Date(invoice.invoiceDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {invoice.currency}{invoice.totalAmount}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(invoice.status)}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {invoice.currency}{invoice.dueAmount}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => {
                        // Download invoice PDF
                        // For now, just log
                        console.log('Download invoice:', invoice.invoiceId);
                      }}
                      className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-6 py-4 border-t flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} invoices
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-300"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 10 >= total}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
