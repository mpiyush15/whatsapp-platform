'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Eye, Send, Loader, AlertCircle } from 'lucide-react'
import { ErrorToast } from '@/components/ErrorToast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'

interface Invoice {
  _id: string
  paymentId: string
  invoiceNumber: string
  date: string
  amount: number
  planName: string
  billingCycle: string
  status: 'paid' | 'pending'
  orderId: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      setError('')

      const token = localStorage.getItem('token')
      
      // Fetch paid transactions directly
      const res = await fetch(`${API_URL}/payments?status=completed`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to fetch invoices')

      // Transform paid transactions to invoices with EXACT Cashfree dates
      const payments = data.data || data.payments || []
      const invoiceList = payments
        .map((payment: any) => {
          // Use actual Cashfree transaction date (completedAt or transactionDate)
          const transactionDate = payment.transactionDate || payment.completedAt || payment.createdAt
          return {
            _id: payment._id,
            paymentId: payment.paymentId,
            invoiceNumber: `INV-${payment.orderId?.slice(-6) || payment._id?.slice(-6)}`,
            date: transactionDate ? new Date(transactionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
            amount: payment.amount || 0,
            planName: payment.planName || 'Subscription',
            billingCycle: payment.billingCycle || 'monthly',
            status: 'paid',
            orderId: payment.orderId
          }
        })
        .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())

      setInvoices(invoiceList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching invoices')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      setDownloading(invoice._id)
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/billing/invoices/${invoice.paymentId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) throw new Error('Failed to generate PDF')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoiceNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF')
    } finally {
      setDownloading(null)
    }
  }

  const handleSendEmail = async (invoice: Invoice) => {
    try {
      setSending(invoice._id)
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/billing/invoices/${invoice.paymentId}/email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!res.ok) throw new Error('Failed to send email')

      setError('')
      alert('Invoice sent to your email!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSending(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-8 w-8 text-blue-600" />
            Invoices
          </h1>
          <p className="text-gray-600 mt-2">View and download your payment invoices</p>
        </div>

        {/* Error Toast */}
        {error && <ErrorToast message={error} onDismiss={() => setError('')} />}

        {/* Empty State */}
        {invoices.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No invoices yet</p>
            <p className="text-gray-500">Your paid invoices will appear here</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Invoice</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Plan</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cycle</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice._id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{invoice.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{invoice.planName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">{invoice.billingCycle}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">₹{invoice.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          ✓ Paid
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* View Icon */}
                          <button
                            title="View Invoice"
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition"
                          >
                            <Eye className="h-5 w-5" />
                          </button>

                          {/* Download Icon */}
                          <button
                            onClick={() => handleDownloadPDF(invoice)}
                            disabled={downloading === invoice._id}
                            title="Download PDF"
                            className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition disabled:opacity-50"
                          >
                            {downloading === invoice._id ? (
                              <Loader className="h-5 w-5 animate-spin" />
                            ) : (
                              <Download className="h-5 w-5" />
                            )}
                          </button>

                          {/* Email Icon */}
                          <button
                            onClick={() => handleSendEmail(invoice)}
                            disabled={sending === invoice._id}
                            title="Send via Email"
                            className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg transition disabled:opacity-50"
                          >
                            {sending === invoice._id ? (
                              <Loader className="h-5 w-5 animate-spin" />
                            ) : (
                              <Send className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Total invoices: <span className="font-semibold text-gray-900">{invoices.length}</span>
              </p>
              <p className="text-sm text-gray-600">
                Total amount: <span className="font-semibold text-gray-900">₹{invoices.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString()}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
