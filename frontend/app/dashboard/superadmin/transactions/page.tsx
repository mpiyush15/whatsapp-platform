"use client"

import { useState, useEffect } from "react"
import { API_URL } from "@/lib/config/api"
import DataTable from "@/components/DataTable"
import { CreditCard, RefreshCw } from "lucide-react"

interface Transaction {
  _id: string
  paymentId: string
  accountId: string
  amount: number
  currency: string
  status: "pending" | "processing" | "completed" | "failed" | "refunded" | "cancelled"
  paymentGateway: string
  paymentMethod?: {
    type: string
    brand?: string
  }
  orderId?: string
  createdAt: string
  completedAt?: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string>("")
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
    totalAmount: 0
  })

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem("token")

      const response = await fetch(`${API_URL}/admin/transactions?limit=1000`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        throw new Error("Failed to fetch transactions")
      }

      const data = await response.json()
      const txns = data.transactions || []

      setTransactions(txns)
      setLastSyncTime(new Date().toLocaleTimeString("en-IN"))

      // Calculate stats
      const completed = txns.filter((t: Transaction) => t.status === "completed").length
      const failed = txns.filter((t: Transaction) => t.status === "failed").length
      const pending = txns.filter((t: Transaction) => t.status === "pending").length
      const totalAmount = txns
        .filter((t: Transaction) => t.status === "completed")
        .reduce((sum: number, t: Transaction) => sum + (t.amount || 0), 0)

      setStats({
        total: txns.length,
        completed,
        failed,
        pending,
        totalAmount
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch transactions"
      setError(errorMsg)
      console.error("Error fetching transactions:", err)
    } finally {
      setLoading(false)
    }
  }

  const syncFromCashfree = async () => {
    try {
      setSyncing(true)
      setError(null)
      const token = localStorage.getItem("token")

      const response = await fetch(`${API_URL}/admin/sync-cashfree`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        throw new Error("Failed to sync from Cashfree")
      }

      const data = await response.json()
      console.log("✅ Sync result:", data)

      // Refresh transactions after sync
      await fetchTransactions()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to sync transactions"
      setError(errorMsg)
      console.error("Error syncing from Cashfree:", err)
    } finally {
      setSyncing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700"
      case "pending":
        return "bg-yellow-100 text-yellow-700"
      case "processing":
        return "bg-blue-100 text-blue-700"
      case "failed":
        return "bg-red-100 text-red-700"
      case "refunded":
        return "bg-purple-100 text-purple-700"
      case "cancelled":
        return "bg-gray-100 text-gray-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const columns = [
    {
      key: "paymentId",
      label: "Payment ID",
      render: (value: string) => (
        <span className="font-mono text-sm font-semibold text-blue-600">{value.substring(0, 12)}...</span>
      )
    },
    {
      key: "accountId",
      label: "Account ID",
      render: (value: string) => (
        <span className="font-mono text-sm">{value}</span>
      )
    },
    {
      key: "amount",
      label: "Amount",
      render: (value: number, row: Transaction) => (
        <span className="font-semibold">₹{value.toFixed(2)} {row.currency}</span>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      key: "paymentGateway",
      label: "Gateway",
      render: (value: string) => (
        <span className="px-2 py-1 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">
          {value.toUpperCase()}
        </span>
      )
    },
    {
      key: "paymentMethod",
      label: "Method",
      render: (value: any) => (
        <span className="text-sm">
          {value?.type ? `${value.type}${value.brand ? ` (${value.brand})` : ""}` : "-"}
        </span>
      )
    },
    {
      key: "createdAt",
      label: "Date",
      render: (value: string) => (
        <span className="text-sm">
          {new Date(value).toLocaleDateString("en-IN")} {new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )
    }
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Platform Transactions</h1>
        <p className="text-gray-600 mt-2">All Cashfree transactions processed through the platform</p>
      </div>

      {/* Sync Button */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          {lastSyncTime && (
            <p className="text-sm text-gray-600">
              Last synced: <span className="font-semibold text-gray-900">{lastSyncTime}</span>
            </p>
          )}
        </div>
        <button
          onClick={syncFromCashfree}
          disabled={syncing || loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync from Cashfree"}
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">⚠️ Error: {error}</p>
          <button
            onClick={fetchTransactions}
            className="mt-2 text-sm text-red-600 hover:text-red-700 font-semibold"
          >
            Try again
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Transactions</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Failed</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{stats.failed}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Revenue</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">₹{stats.totalAmount.toFixed(0)}</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">All Transactions</h2>
        </div>

        <DataTable
          columns={columns}
          data={transactions}
          loading={loading}
          error={error}
          emptyMessage="No transactions found"
        />
      </div>
    </div>
  )
}
