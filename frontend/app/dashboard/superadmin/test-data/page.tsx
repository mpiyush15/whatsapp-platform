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
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [cashfreeTransactions, setCashfreeTransactions] = useState<any[]>([])

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

  const handleCashfreeSync = async () => {
    try {
      setSyncLoading(true)
      setSyncResult(null)
      const token = localStorage.getItem("token")
      
      if (!token) {
        setSyncResult({ error: "❌ No token found!" })
        return
      }

      console.log("🔄 Syncing Cashfree payments...")
      const syncResponse = await fetch(`${API_URL}/payment/sync/cashfree`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      const syncData = await syncResponse.json()
      console.log("✅ Sync response:", syncData)
      setSyncResult(syncData)

      // Extract and set Cashfree transactions
      if (syncData.data?.payments && Array.isArray(syncData.data.payments)) {
        setCashfreeTransactions(syncData.data.payments)
        console.log("✅ Extracted", syncData.data.payments.length, "Cashfree transactions")
      } else if (syncData.payments && Array.isArray(syncData.payments)) {
        setCashfreeTransactions(syncData.payments)
        console.log("✅ Extracted", syncData.payments.length, "Cashfree transactions")
      }

      // Refresh payments after sync
      if (syncResponse.ok) {
        const paymentsResponse = await fetch(`${API_URL}/payment`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })
        const paymentsData = await paymentsResponse.json()
        
        let paymentsArray = []
        if (paymentsData.data && Array.isArray(paymentsData.data.payments)) {
          paymentsArray = paymentsData.data.payments
        } else if (Array.isArray(paymentsData.data)) {
          paymentsArray = paymentsData.data
        }
        
        setPayments(paymentsArray)
        console.log("✅ Payments refreshed:", paymentsArray.length)
      }
    } catch (err: any) {
      console.error("Sync error:", err)
      setSyncResult({ error: `Error: ${err.message}` })
    } finally {
      setSyncLoading(false)
    }
  }

  const handleTestCashfreeConnection = async () => {
    try {
      setTestLoading(true)
      setTestResult(null)
      const token = localStorage.getItem("token")
      
      if (!token) {
        setTestResult({ error: "❌ No token found!" })
        return
      }

      console.log("🧪 Testing Cashfree connection...")
      const testResponse = await fetch(`${API_URL}/payment/test/cashfree-connection`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      const testData = await testResponse.json()
      console.log("✅ Test response:", testData)
      setTestResult(testData)
    } catch (err: any) {
      console.error("Test error:", err)
      setTestResult({ error: `Error: ${err.message}` })
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🧪 Test Data Page</h1>
          <p className="text-gray-600 mt-1">Debug organizations and users data fetch</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTestCashfreeConnection}
            disabled={testLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium transition text-sm"
          >
            {testLoading ? "🧪 Testing..." : "🧪 Test Cashfree"}
          </button>
          <button
            onClick={handleCashfreeSync}
            disabled={syncLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition text-sm"
          >
            {syncLoading ? "🔄 Syncing..." : "🔄 Sync Cashfree"}
          </button>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-blue-900 mb-2">📊 Debug Information</h3>
        <pre className="bg-white p-3 rounded text-xs overflow-auto max-h-64 text-gray-800">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`border rounded-lg p-4 ${
          testResult.success 
            ? 'bg-purple-50 border-purple-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <h3 className={`font-bold mb-2 ${
            testResult.success 
              ? 'text-purple-900' 
              : 'text-orange-900'
          }`}>
            {testResult.success ? '✅ Cashfree Connection Test PASSED' : '⚠️ Cashfree Connection Test Result'}
          </h3>
          <div className={`text-sm ${testResult.success ? 'text-purple-800' : 'text-orange-800'}`}>
            <p><strong>Status:</strong> {testResult.success ? 'CONNECTED' : 'FAILED'}</p>
            {testResult.message && <p><strong>Message:</strong> {testResult.message}</p>}
            {testResult.response_status && <p><strong>HTTP Status:</strong> {testResult.response_status}</p>}
            {testResult.data_type && <p><strong>Response Type:</strong> {testResult.data_type}</p>}
            {testResult.error && <p><strong>Error:</strong> {testResult.error}</p>}
            {testResult.credentials_check && (
              <div className="mt-2">
                <p><strong>Credentials Check:</strong></p>
                <ul className="list-disc list-inside text-xs ml-2">
                  <li>Client ID: {testResult.credentials_check.has_client_id ? '✅ Present' : '❌ Missing'}</li>
                  <li>Secret Key: {testResult.credentials_check.has_secret ? '✅ Present' : '❌ Missing'}</li>
                  <li>Environment: {testResult.credentials_check.env_mode}</li>
                </ul>
              </div>
            )}
          </div>
          <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40 mt-2 text-gray-800">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className={`border rounded-lg p-4 ${
          syncResult.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <h3 className={`font-bold mb-2 ${
            syncResult.success 
              ? 'text-green-900' 
              : 'text-red-900'
          }`}>
            {syncResult.success ? '✅ Cashfree Sync Result' : '❌ Sync Error'}
          </h3>
          <div className={`text-sm ${syncResult.success ? 'text-green-800' : 'text-red-800'}`}>
            <p><strong>Status:</strong> {syncResult.success ? 'SUCCESS' : 'FAILED'}</p>
            <p><strong>Synced Payments:</strong> {syncResult.data?.count || 0}</p>
            {syncResult.data?.total && <p><strong>Total Transactions:</strong> {syncResult.data.total}</p>}
            {syncResult.data?.errors && syncResult.data.errors.length > 0 && (
              <div className="mt-2">
                <p><strong>Errors:</strong></p>
                <ul className="list-disc list-inside text-xs">
                  {syncResult.data.errors.map((err: any, idx: number) => (
                    <li key={idx}>{err.orderId}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
            {syncResult.message && <p className="mt-2"><strong>Message:</strong> {syncResult.message}</p>}
            {syncResult.error && <p className="mt-2"><strong>Error:</strong> {syncResult.error}</p>}
          </div>
          <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40 mt-2 text-gray-800">
            {JSON.stringify(syncResult, null, 2)}
          </pre>
        </div>
      )}

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

      {/* Cashfree Transactions Detail */}
      {cashfreeTransactions.length > 0 && (
        <div className="bg-white rounded-lg border border-blue-200 p-6 bg-blue-50">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">
            🔥 Cashfree Live Transactions ({cashfreeTransactions.length})
          </h2>
          <p className="text-blue-700 text-sm mb-4">Real data synced from Cashfree API</p>
          
          <div className="space-y-4">
            {cashfreeTransactions.map((txn, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg border-2 border-blue-300 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Payment ID</p>
                    <p className="font-bold text-lg text-blue-900">{txn.paymentId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Order ID</p>
                    <p className="font-bold text-lg text-gray-800">{txn.orderId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Amount</p>
                    <p className="font-bold text-lg text-green-600">₹{txn.amount} {txn.currency}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Status</p>
                    <p className={`font-bold text-lg ${
                      txn.status === 'completed' ? 'text-green-600' :
                      txn.status === 'pending' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {txn.status?.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Payment Method</p>
                    <p className="font-semibold text-gray-800">{txn.paymentMethod?.type || txn.paymentMethod || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Account ID</p>
                    <p className="font-semibold text-gray-800">{txn.accountId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Cashfree Txn ID</p>
                    <p className="font-mono text-sm text-gray-700 break-all">{txn.gatewayTransactionId || txn.cfOrderId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Payment Gateway</p>
                    <p className="font-semibold text-blue-600">{txn.paymentGateway}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Initiated At</p>
                    <p className="text-sm text-gray-800">{txn.initiatedAt ? new Date(txn.initiatedAt).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Completed At</p>
                    <p className="text-sm text-gray-800">{txn.completedAt ? new Date(txn.completedAt).toLocaleString() : 'N/A'}</p>
                  </div>
                  {txn.customerEmail && (
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Customer Email</p>
                      <p className="text-sm text-gray-800">{txn.customerEmail}</p>
                    </div>
                  )}
                  {txn.customerPhone && (
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Customer Phone</p>
                      <p className="text-sm text-gray-800">{txn.customerPhone}</p>
                    </div>
                  )}
                </div>
                
                {/* Raw JSON for debugging */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <details className="cursor-pointer">
                    <summary className="text-xs text-gray-600 hover:text-gray-800 font-semibold">📋 Show Full Details (JSON)</summary>
                    <pre className="bg-gray-100 p-3 rounded mt-2 text-xs overflow-auto max-h-48 text-gray-800">
                      {JSON.stringify(txn, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
