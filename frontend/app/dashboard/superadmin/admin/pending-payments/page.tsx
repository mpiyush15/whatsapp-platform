'use client'

import { useState, useEffect } from 'react'
import { Mail, Send, Loader, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorToast } from '@/components/ErrorToast'
import Link from 'next/link'
import { API_URL } from '@/lib/config/api'
import { authService, UserRole } from '@/lib/auth'
import { useRouter } from 'next/navigation'

interface PendingUser {
  _id: string
  accountId: string
  name: string
  email: string
  plan: string
  billingCycle: string
  createdAt: string
  amountDue?: number
}

export default function PendingPaymentsPage() {
  const router = useRouter()
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendingEmailFor, setSendingEmailFor] = useState<string | null>(null)
  const [activatingUser, setActivatingUser] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Check if user is superadmin
  useEffect(() => {
    const user = authService.getCurrentUser()
    if (!user || (user.role !== UserRole.SUPERADMIN && user.type !== 'internal')) {
      router.push('/dashboard')
      return
    }

    fetchPendingUsers()
  }, [])

  const fetchPendingUsers = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const token = localStorage.getItem('token')

      const response = await fetch(`${API_URL}/admin/pending-users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch pending users: ${response.status}`)
      }

      const data = await response.json()
      setPendingUsers(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending users')
      console.error('Error fetching pending users:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendReminder = async (accountId: string, email: string) => {
    try {
      setSendingEmailFor(accountId)
      setError(null)
      const token = localStorage.getItem('token')

      const response = await fetch(`${API_URL}/admin/send-payment-reminder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reminder email')
      }

      setSuccessMessage(`Payment reminder sent to ${email}`)
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reminder email')
    } finally {
      setSendingEmailFor(null)
    }
  }

  const handleActivateUser = async (email: string, plan: string) => {
    try {
      setActivatingUser(email)
      setError(null)
      const token = localStorage.getItem('token')

      const response = await fetch(`${API_URL}/admin/change-user-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          status: 'active',
          planName: plan
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to activate user')
      }

      setSuccessMessage(`User ${email} activated successfully! Dashboard is now unlocked.`)
      
      // Remove user from pending list
      setPendingUsers(pendingUsers.filter(u => u.email !== email))
      
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate user')
    } finally {
      setActivatingUser(null)
    }
  }

  const calculateAmountDue = (plan: string, billingCycle: string) => {
    const prices: Record<string, Record<string, number>> = {
      starter: { monthly: 999, quarterly: 2847, annual: 9590 },
      pro: { monthly: 2999, quarterly: 8547, annual: 28790 },
      enterprise: { monthly: 9999, quarterly: 28497, annual: 95990 }
    }

    return prices[plan.toLowerCase()]?.[billingCycle] || 0
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!authService.getCurrentUser()) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-black">Pending Payments</h1>
              <p className="text-gray-600 mt-2">Manage users waiting for payment confirmation</p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}

        {/* Stats */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Pending</p>
                  <p className="text-3xl font-bold text-black mt-1">{pendingUsers.length}</p>
                </div>
                <Clock className="h-10 w-10 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Amount Due</p>
                  <p className="text-3xl font-bold text-black mt-1">
                    ₹{pendingUsers.reduce((sum, user) => sum + calculateAmountDue(user.plan, user.billingCycle), 0).toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-10 w-10 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Action Required</p>
                  <p className="text-3xl font-bold text-black mt-1">{pendingUsers.length}</p>
                </div>
                <Mail className="h-10 w-10 text-gray-400" />
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 text-black animate-spin" />
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No pending payments</p>
              <p className="text-sm text-gray-500 mt-1">All users have completed their payments!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tenure</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Amount Due</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Registered</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((user) => (
                    <tr key={user._id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <p className="font-medium text-black">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.accountId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <a href={`mailto:${user.email}`} className="text-black hover:underline">
                          {user.email}
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full capitalize">
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700 capitalize">{user.billingCycle}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-black">
                          ₹{calculateAmountDue(user.plan, user.billingCycle).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSendReminder(user.accountId, user.email)}
                            disabled={sendingEmailFor === user.accountId || activatingUser === user.email}
                            className="flex items-center gap-2 bg-black hover:bg-gray-900 text-white text-sm"
                          >
                            {sendingEmailFor === user.accountId ? (
                              <>
                                <Loader className="h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4" />
                                Remind
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleActivateUser(user.email, user.plan)}
                            disabled={activatingUser === user.email || sendingEmailFor === user.accountId}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm"
                          >
                            {activatingUser === user.email ? (
                              <>
                                <Loader className="h-4 w-4 animate-spin" />
                                Activating...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Activate
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
