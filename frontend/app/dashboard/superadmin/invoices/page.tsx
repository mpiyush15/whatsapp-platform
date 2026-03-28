"use client"

import { useState, useEffect } from "react"
import { FileText, Download, Eye, Search, Filter, Calendar, DollarSign, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorToast } from "@/components/ErrorToast"
import InvoiceTemplate from "@/components/InvoiceTemplate"
import { API_URL } from "@/lib/config/api"
import { authService, UserRole } from "@/lib/auth"
import { AccountType } from "@/lib/enums"

interface Invoice {
  _id: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  totalAmount?: number
  paidAmount?: number
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled'
  pdfUrl?: string
  billTo?: {
    name: string
    email: string
  }
  accountId?: string
  accountName?: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [totalRevenue, setTotalRevenue] = useState(0)

  useEffect(() => {
    const user = authService.getCurrentUser()
    setIsSuperAdmin(user?.type === AccountType.INTERNAL || user?.role === UserRole.SUPERADMIN)
    fetchInvoices()
    
    // Refresh invoices every 30 seconds for real-time updates
    const interval = setInterval(fetchInvoices, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchInvoices = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("token")
      
      // Check if user is superadmin
      const user = authService.getCurrentUser()
      const endpoint = (user?.type === AccountType.INTERNAL || user?.role === UserRole.SUPERADMIN)
        ? `${API_URL}/billing/admin/invoices` // All invoices for superadmin
        : `${API_URL}/billing/invoices` // User's invoices only
      
      const response = await fetch(endpoint, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const data = await response.json()
        let invoiceList = data.data || data.invoices || []
        
        // Map API response to match expected format
        // API returns 'amount' as totalAmount
        invoiceList = invoiceList.map((inv: any) => ({
          ...inv,
          totalAmount: inv.amount || inv.totalAmount || 0,
          invoiceDate: inv.date || inv.invoiceDate,
          paidAmount: inv.paidAmount || 0
        }))
        
        setInvoices(invoiceList)
        
        // ✅ CLIENT ONBOARDING: Fetch revenue from proper endpoint (NEW)
        if (user?.type === AccountType.INTERNAL || user?.role === UserRole.SUPERADMIN) {
          try {
            const revenueResponse = await fetch(`${API_URL}/billing/admin/revenue/summary`, {
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              }
            })
            
            if (revenueResponse.ok) {
              const revenueData = await revenueResponse.json()
              setTotalRevenue(revenueData.data?.totalRevenue || 0)
              console.log('✅ CLIENT ONBOARDING: Revenue updated from endpoint:', revenueData.data?.totalRevenue)
            }
          } catch (revErr) {
            console.error('⚠️ Failed to fetch revenue summary:', revErr)
            // Fallback to calculating from invoices
            const revenue = invoiceList
              .filter((inv: Invoice) => inv.status === 'paid')
              .reduce((sum: number, inv: Invoice) => sum + (inv.paidAmount ?? 0), 0)
            setTotalRevenue(revenue)
          }
        }
      } else if (response.status === 404) {
        // Fallback to user invoices if admin endpoint doesn't exist
        const fallbackResponse = await fetch(`${API_URL}/billing/invoices`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json()
          setInvoices(data.data || [])
        }
      }
    } catch (error) {
      console.error("Error fetching invoices:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter and sort invoices
  const filteredInvoices = invoices
    .filter(invoice => {
      const matchesSearch = 
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.billTo?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.billTo?.email.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus
      
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
      } else {
        return (b.totalAmount ?? 0) - (a.totalAmount ?? 0)
      }
    })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
      case 'sent':
        return <Clock className="h-4 w-4 text-amber-600" />
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'sent':
        return 'bg-amber-100 text-amber-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'partial':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleDownloadInvoice = (invoice: Invoice) => {
    if (invoice.pdfUrl) {
      // Open S3 URL in new tab
      window.open(invoice.pdfUrl, '_blank')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">
            {isSuperAdmin ? 'All invoices from customers' : 'Manage and download your invoices'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg">
              <div className="text-xs font-semibold text-green-600 uppercase">Total Revenue (Paid)</div>
              <div className="text-2xl font-bold text-green-900">₹{totalRevenue.toLocaleString('en-IN')}</div>
            </div>
          )}
          <div className="bg-blue-100 text-blue-800 text-sm font-semibold px-4 py-2 rounded-lg">
            Total Invoices: {invoices.length}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by invoice # or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="date">Newest First</option>
              <option value="amount">Highest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading invoices...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 mb-2">No invoices found</p>
            <p className="text-sm text-gray-500">
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your filters or search terms'
                : 'Invoices are automatically generated when you complete a payment. Complete a payment to see your first invoice.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Invoice #</th>
                  {isSuperAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Account</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map((invoice, index) => (
                  <tr key={invoice.invoiceNumber || `invoice-${index}`} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-gray-900">{invoice.invoiceNumber}</span>
                      </div>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 text-gray-900">
                        <span className="font-medium">{invoice.accountName || invoice.billTo?.name || 'N/A'}</span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-gray-900">
                      <div>
                        <p className="font-medium">{invoice.billTo?.name || 'N/A'}</p>
                        <p className="text-sm text-gray-500">{invoice.billTo?.email || ''}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 font-semibold text-gray-900">
                        ₹{(invoice.totalAmount ?? 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(invoice.status)}
                        <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice)
                            setIsDetailsOpen(true)
                          }}
                          className="text-gray-600 hover:text-gray-900 p-1 transition"
                          title="View Details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDownloadInvoice(invoice)}
                          className="text-gray-600 hover:text-gray-900 p-1 transition"
                          title="Download PDF"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Details Modal - Professional Template */}
      {isDetailsOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <div className="sticky top-0 right-0 p-4 flex justify-end bg-white border-b border-gray-200 z-10">
              <button
                onClick={() => {
                  setIsDetailsOpen(false)
                  setSelectedInvoice(null)
                }}
                className="text-gray-600 hover:text-gray-900 p-2"
              >
                ✕
              </button>
            </div>

            {/* Invoice Template */}
            <div className="p-8">
              <InvoiceTemplate invoice={selectedInvoice} organization={selectedInvoice.billTo} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
