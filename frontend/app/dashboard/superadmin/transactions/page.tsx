'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Loader, Download, CreditCard, Calendar, Package, TrendingUp, ArrowUpRight, X, RefreshCw, Clock, ArrowDown, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorToast } from '@/components/ErrorToast'
import { PaymentStatus } from '@/lib/enums'
import { API_URL } from '@/lib/config/api'
import Link from 'next/link'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      if (!token) {
        setError('Authentication required')
        return
      }

      // Fetch organizations data with invoices
      const response = await fetch(`${API_URL}/admin/organizations`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error("Failed to fetch transactions")
      }

      const data = await response.json()
      const orgs = data.data || []
      
      // Convert organizations to transactions format
      const transactionsList: any[] = []
      
      for (const org of orgs) {
        // Fetch invoices for this org
        let invoices: any[] = []
        try {
          const invoiceResponse = await fetch(`${API_URL}/billing/invoices?accountId=${org._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (invoiceResponse.ok) {
            const invoiceData = await invoiceResponse.json()
            invoices = invoiceData.data || []
          }
        } catch (err) {
          console.error('Failed to fetch invoices for', org.name)
        }

        // Add organization signup transaction
        transactionsList.push({
          id: `signup-${org._id}`,
          date: org.createdAt,
          organization: org.name,
          email: org.email,
          type: 'signup',
          description: `Signup - ${org.plan} plan (${org.billingCycle})`,
          plan: org.plan,
          amount: 0,
          status: 'completed',
          billingCycle: org.billingCycle,
          nextBillingDate: org.nextBillingDate
        })

        // Add invoice transactions with exact amounts in INR
        invoices.forEach((invoice: any, idx: number) => {
          transactionsList.push({
            id: `invoice-${org._id}-${idx}-${invoice.invoiceNumber}`,
            date: invoice.invoiceDate,
            organization: org.name,
            email: org.email,
            type: 'invoice',
            description: `Invoice #${invoice.invoiceNumber} - ${invoice.status}`,
            plan: org.plan,
            amount: invoice.totalAmount || 0,
            paidAmount: invoice.paidAmount || 0,
            status: invoice.status,
            invoiceNumber: invoice.invoiceNumber,
            billingCycle: org.billingCycle,
            nextBillingDate: org.nextBillingDate
          })
        })

        // Add payment transaction if totalPayments exist
        if (org.totalPayments && org.totalPayments > 0) {
          transactionsList.push({
            id: `payment-${org._id}`,
            date: org.lastPaymentDate || org.createdAt,
            organization: org.name,
            email: org.email,
            type: 'payment',
            description: `Payment received`,
            plan: org.plan,
            amount: org.totalPayments,
            status: 'completed',
            billingCycle: org.billingCycle,
            nextBillingDate: org.nextBillingDate
          })
        }
      }

      // Sort by date descending
      transactionsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      
      // Filter to only paid transactions
      const completedTransactions = transactionsList.filter(t => t.status === PaymentStatus.PAID)
      
      setTransactions(completedTransactions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setIsLoading(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch(type) {
      case 'payment':
        return <ArrowDown className="h-4 w-4 text-green-600" />
      case 'invoice':
        return <CreditCard className="h-4 w-4 text-blue-600" />
      case 'billing':
        return <Calendar className="h-4 w-4 text-blue-600" />
      case 'signup':
        return <ArrowUp className="h-4 w-4 text-gray-600" />
      default:
        return <Package className="h-4 w-4 text-gray-600" />
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    switch(type) {
      case 'payment':
        return 'Payment Received'
      case 'invoice':
        return 'Invoice'
      case 'billing':
        return 'Billing'
      case 'signup':
        return 'Signup'
      default:
        return 'Transaction'
    }
  }

  const getTransactionColor = (type: string) => {
    switch(type) {
      case 'payment':
        return 'bg-green-100 text-green-800'
      case 'invoice':
        return 'bg-blue-100 text-blue-800'
      case 'billing':
        return 'bg-blue-100 text-blue-800'
      case 'signup':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case PaymentStatus.PAID:
        return 'bg-green-100 text-green-800'
      case PaymentStatus.DRAFT:
        return 'bg-gray-100 text-gray-800'
      case PaymentStatus.SENT:
        return 'bg-blue-100 text-blue-800'
      case PaymentStatus.PARTIAL:
        return 'bg-yellow-100 text-yellow-800'
      case PaymentStatus.OVERDUE:
        return 'bg-orange-100 text-orange-800'
      case PaymentStatus.CANCELLED:
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
              <p className="text-gray-600 mt-1">Payment history and subscription activities</p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={fetchTransactions}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
              <p className="text-gray-600">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Organization</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Billing Cycle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(txn.date).toLocaleDateString('en-IN')}
                        <br />
                        <span className="text-xs text-gray-500">{new Date(txn.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{txn.organization}</p>
                          <p className="text-xs text-gray-500">{txn.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getTransactionColor(txn.type)}`}>
                          {getTransactionIcon(txn.type)}
                          {getTransactionTypeLabel(txn.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{txn.description}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          txn.plan === 'pro'
                            ? 'bg-blue-100 text-blue-800'
                            : txn.plan === 'enterprise'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {txn.plan ? txn.plan.charAt(0).toUpperCase() + txn.plan.slice(1) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">{txn.billingCycle || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{txn.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(txn.status)}`}>
                          {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {transactions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-2">Total Transactions</p>
              <p className="text-3xl font-bold text-gray-900">{transactions.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-2">Total Payments</p>
              <p className="text-3xl font-bold text-green-600">₹{transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-2">Completed Transactions</p>
              <p className="text-3xl font-bold text-blue-600">{transactions.filter(t => t.status === PaymentStatus.PAID).length}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
