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
  status: string
  paymentGateway: string
  paymentMethod?: {
    type: string
    brand?: string
  }
  paymentStatus?: string
  orderId?: string
  createdAt: string
  completedAt?: string
  transactionDate?: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string>("")
  const [activatingId, setActivatingId] = useState<string | null>(null)
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

  const handleActivateFromTransaction = async (transaction: Transaction, accountId: string) => {
    if (!confirm(`Activate account for transaction ${transaction.orderId}? This will create a subscription and send invoice.`)) {
      return
    }

    setActivatingId(transaction.orderId)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/admin/accounts/${accountId}/activate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) throw new Error("Failed to activate")
      
      const data = await response.json()
      alert(`✅ Account activated!\n\nOrder: ${transaction.orderId}\nSubscription: ${data.data?.subscription?.subscriptionId}\nInvoice sent to: ${data.data?.account?.email}`)
      
      // Refresh transactions
      await fetchTransactions()
      setActivatingId(null)
    } catch (err) {
      alert(`❌ Error: ${err instanceof Error ? err.message : "Unknown error"}`)
      setActivatingId(null)
    }
  }

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
      const txns = data.data?.transactions || data.transactions || []

      // Sort transactions: completed/success first, then by date descending
      const sortedTxns = [...txns].sort((a: Transaction, b: Transaction) => {
        const aStatus = a.status?.toUpperCase() || "";
        const bStatus = b.status?.toUpperCase() || "";
        const aSuccess = ["PAID", "COMPLETED", "SUCCESS"].includes(aStatus);
        const bSuccess = ["PAID", "COMPLETED", "SUCCESS"].includes(bStatus);
        
        if (aSuccess && !bSuccess) return -1;
        if (!aSuccess && bSuccess) return 1;
        
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setTransactions(sortedTxns)
      setLastSyncTime(new Date().toLocaleTimeString("en-IN"))

      // Calculate stats - check both uppercase and display format
      const completed = txns.filter((t: Transaction) => {
        const status = t.status?.toUpperCase();
        return status === "PAID" || status === "COMPLETED" || status === "SUCCESS";
      }).length
      const failed = txns.filter((t: Transaction) => {
        const status = t.status?.toUpperCase();
        return status === "FAILED" || status === "CANCELLED" || status === "EXPIRED";
      }).length
      const pending = txns.filter((t: Transaction) => {
        const status = t.status?.toUpperCase();
        return status === "PENDING" || status === "ACTIVE" || status === "PROCESSING";
      }).length
      const totalAmount = txns
        .filter((t: Transaction) => {
          const status = t.status?.toUpperCase();
          return status === "PAID" || status === "COMPLETED" || status === "SUCCESS";
        })
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
    switch (status?.toUpperCase()) {
      case "PAID":
      case "COMPLETED":
      case "SUCCESS":
        return "bg-green-100 text-green-700"
      case "PENDING":
        return "bg-yellow-100 text-yellow-700"
      case "PROCESSING":
      case "ACTIVE":
        return "bg-blue-100 text-blue-700"
      case "FAILED":
      case "CANCELLED":
      case "EXPIRED":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const columns = [
    {
      key: "paymentId",
      label: "Payment ID",
      render: (value: string) => (
        <span className="font-mono text-sm font-semibold text-blue-600">{value ? value.substring(0, 12) : 'N/A'}...</span>
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
          {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'}
        </span>
      )
    },
    {
      key: "paymentGateway",
      label: "Gateway",
      render: (value: string) => (
        <span className="px-2 py-1 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">
          {value ? value.toUpperCase() : 'N/A'}
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
      key: "transactionDate",
      label: "Date",
      render: (value: string, row: Transaction) => (
        <span className="text-sm">
          {value ? new Date(value).toLocaleDateString("en-IN") + " " + new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : new Date(row.createdAt).toLocaleDateString("en-IN") + " " + new Date(row.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row: Transaction) => {
        const isCompleted = row.status?.toUpperCase() === "COMPLETED" || row.status?.toUpperCase() === "PAID" || row.status?.toUpperCase() === "SUCCESS"
        const isActivating = activatingId === row.orderId

        return isCompleted ? (
          <button
            onClick={() => handleActivateFromTransaction(row, row.accountId)}
            disabled={isActivating}
            className={`px-3 py-1 text-sm font-semibold rounded transition ${
              isActivating
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                : 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
            }`}
          >
            {isActivating ? 'Activating...' : 'Activate'}
          </button>
        ) : (
          <span className="px-3 py-1 text-sm text-gray-400">—</span>
        )
      }
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
