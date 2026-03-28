"use client"

import { useState, useEffect } from "react"
import { API_URL } from "@/lib/config/api"

export default function TestDataPage() {
  const [organizations, setOrganizations] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem("token")
        
        console.log("🔑 Token from localStorage:", token ? `${token.substring(0, 20)}...` : "NO TOKEN")
        
        if (!token) {
          setError("❌ No token found in localStorage!")
          return
        }

        // Decode token to see what's in it
        try {
          const decoded = JSON.parse(atob(token.split('.')[1]))
          console.log("📋 Token payload:", decoded)
          setDebugInfo(prev => ({ ...prev, tokenPayload: decoded }))
        } catch (e) {
          console.error("Error decoding token:", e)
        }

        // Fetch organizations
        console.log(`📡 Fetching from: ${API_URL}/admin/organizations`)
        const orgResponse = await fetch(`${API_URL}/admin/organizations`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })

        console.log("Response status:", orgResponse.status)
        const orgData = await orgResponse.json()
        console.log("Response data:", orgData)
        
        setDebugInfo(prev => ({ 
          ...prev, 
          orgResponse: {
            status: orgResponse.status,
            ok: orgResponse.ok,
            data: orgData
          }
        }))

        if (orgResponse.ok) {
          console.log("✅ Organizations response OK")
          console.log("Response structure:", Object.keys(orgData))
          
          // Handle different response structures
          let orgsArray = []
          if (Array.isArray(orgData)) {
            orgsArray = orgData
          } else if (Array.isArray(orgData.data)) {
            orgsArray = orgData.data
          } else if (orgData.data && Array.isArray(orgData.data.data)) {
            orgsArray = orgData.data.data
          } else if (orgData.organizations) {
            orgsArray = orgData.organizations
          }
          
          console.log("✅ Extracted organizations array:", orgsArray)
          setOrganizations(orgsArray)
        } else {
          setError(`API Error: ${orgResponse.status} - ${orgData.message}`)
        }

        // Fetch users
        console.log(`📡 Fetching from: ${API_URL}/admin/users`)
        const usersResponse = await fetch(`${API_URL}/admin/users`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })

        console.log("Users response status:", usersResponse.status)
        const usersData = await usersResponse.json()
        console.log("Users response data:", usersData)
        
        if (usersResponse.ok) {
          // Handle different response structures
          let usersArray = []
          if (Array.isArray(usersData)) {
            usersArray = usersData
          } else if (Array.isArray(usersData.data)) {
            usersArray = usersData.data
          } else if (usersData.data && Array.isArray(usersData.data.data)) {
            usersArray = usersData.data.data
          } else if (usersData.users) {
            usersArray = usersData.users
          }
          
          console.log("✅ Extracted users array:", usersArray)
          setUsers(usersArray)
        }

        // Skip users endpoint (doesn't exist as /admin/users)
        console.log(`⏭️ Skipping users endpoint (doesn't exist)`)

        // Fetch payments history - use /payment endpoint (superadmin only)
        console.log(`📡 Fetching from: ${API_URL}/payment`)
        const paymentsResponse = await fetch(`${API_URL}/payment`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })

        console.log("Payments response status:", paymentsResponse.status)
        const paymentsData = await paymentsResponse.json()
        console.log("Payments response data:", paymentsData)
        console.log("Payments response data keys:", Object.keys(paymentsData))
        console.log("Payments response full:", JSON.stringify(paymentsData, null, 2))
        
        if (paymentsResponse.ok) {
          let paymentsArray = []
          // Backend returns: { success: true, data: { payments: [...] }, message: "..." }
          if (paymentsData.data && Array.isArray(paymentsData.data.payments)) {
            paymentsArray = paymentsData.data.payments
          } else if (Array.isArray(paymentsData.data)) {
            paymentsArray = paymentsData.data
          } else if (Array.isArray(paymentsData.payments)) {
            paymentsArray = paymentsData.payments
          } else if (Array.isArray(paymentsData)) {
            paymentsArray = paymentsData
          }
          
          console.log("✅ Extracted payments array:", paymentsArray)
          console.log("✅ Payments count:", paymentsArray.length)
          if (paymentsArray.length > 0) {
            console.log("First payment sample:", JSON.stringify(paymentsArray[0], null, 2))
          }
          setPayments(paymentsArray)
        } else {
          console.log("❌ Payments endpoint returned:", paymentsResponse.status)
        }

        // Fetch invoices - use superadmin endpoint
        console.log(`📡 Fetching from: ${API_URL}/billing/admin/invoices`)
        const invoicesResponse = await fetch(`${API_URL}/billing/admin/invoices`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })

        console.log("Invoices response status:", invoicesResponse.status)
        const invoicesData = await invoicesResponse.json()
        console.log("Invoices response data:", invoicesData)
        console.log("Invoices response data keys:", Object.keys(invoicesData))
        console.log("Invoices response full:", JSON.stringify(invoicesData, null, 2))
        
        if (invoicesResponse.ok) {
          let invoicesArray = []
          // Backend returns: { success: true, data: { invoices: [...] }, message: "..." }
          if (invoicesData.data && Array.isArray(invoicesData.data.invoices)) {
            invoicesArray = invoicesData.data.invoices
          } else if (Array.isArray(invoicesData.data)) {
            invoicesArray = invoicesData.data
          } else if (Array.isArray(invoicesData.invoices)) {
            invoicesArray = invoicesData.invoices
          } else if (Array.isArray(invoicesData)) {
            invoicesArray = invoicesData
          }
          
          console.log("✅ Extracted invoices array:", invoicesArray)
          console.log("✅ Invoices count:", invoicesArray.length)
          if (invoicesArray.length > 0) {
            console.log("First invoice sample:", JSON.stringify(invoicesArray[0], null, 2))
          }
          setInvoices(invoicesArray)
        } else {
          console.log("❌ Invoices endpoint returned:", invoicesResponse.status)
        }

      } catch (err: any) {
        console.error("Error:", err)
        setError(`Error: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🧪 Test Data Page</h1>
          <p className="text-gray-600 mt-1">Debug organizations and users data fetch</p>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-blue-900 mb-2">📊 Debug Information</h3>
        <pre className="bg-white p-3 rounded text-xs overflow-auto max-h-64 text-gray-800">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-bold text-red-900 mb-2">❌ Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">⏳ Loading...</p>
        </div>
      )}

      {/* Organizations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          📦 Organizations ({organizations.length})
        </h2>
        
        {organizations.length === 0 ? (
          <p className="text-gray-500">No organizations found</p>
        ) : (
          <div className="space-y-3">
            {organizations.map((org, idx) => (
              <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p><strong>Name:</strong> {org.name}</p>
                <p><strong>Email:</strong> {org.email}</p>
                <p><strong>AccountId:</strong> {org.accountId}</p>
                <p><strong>Status:</strong> {org.status}</p>
                <p><strong>Subscription Tier:</strong> {org.subscriptionTier}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          👥 Users ({users.length})
        </h2>
        
        {users.length === 0 ? (
          <p className="text-gray-500">No users found</p>
        ) : (
          <div className="space-y-3">
            {users.map((user, idx) => (
              <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p><strong>Name:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>Status:</strong> {user.status}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payments */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          💳 Payments / Cashfree History ({payments.length})
        </h2>
        
        {payments.length === 0 ? (
          <p className="text-gray-500">No payments found</p>
        ) : (
          <div className="space-y-3">
            {payments.map((payment, idx) => (
              <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p><strong>Payment ID:</strong> {payment.paymentId || payment._id}</p>
                <p><strong>AccountId:</strong> {payment.accountId}</p>
                <p><strong>Amount:</strong> ₹{payment.amount} {payment.currency || 'INR'}</p>
                <p><strong>Status:</strong> {payment.status}</p>
                <p><strong>Payment Method:</strong> {payment.paymentMethod}</p>
                <p><strong>Cashfree Order ID:</strong> {payment.cashfreeOrderId}</p>
                <p><strong>Date:</strong> {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          📄 Invoices ({invoices.length})
        </h2>
        
        {invoices.length === 0 ? (
          <p className="text-gray-500">No invoices found</p>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice, idx) => (
              <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p><strong>Invoice ID:</strong> {invoice.invoiceId || invoice._id}</p>
                <p><strong>Invoice Number:</strong> {invoice.invoiceNumber}</p>
                <p><strong>AccountId:</strong> {invoice.accountId}</p>
                <p><strong>Amount:</strong> ₹{invoice.amount} + ₹{invoice.tax} tax = ₹{invoice.total}</p>
                <p><strong>Status:</strong> {invoice.status}</p>
                <p><strong>Issue Date:</strong> {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Due Date:</strong> {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Description:</strong> {invoice.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
