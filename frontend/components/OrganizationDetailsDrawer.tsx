"use client"

import { X } from "lucide-react"
import { useState, useEffect } from "react"
import { API_URL } from "@/lib/config/api"
import { VerticalBadge, VerticalBadgesFromCounts } from "@/components/platform/VerticalBadges"

interface OrganizationDetailsDrawerProps {
  isOpen: boolean
  onClose: () => void
  organization: any
}

interface TransactionStats {
  totalTransactions: number
  completedTransactions: number
  totalAmount: number
  lastTransaction?: {
    amount: number
    date: string
    status: string
  }
}

interface PricingPlan {
  _id: string
  name: string
  monthlyPrice: number
  yearlyPrice: number
}

export default function OrganizationDetailsDrawer({
  isOpen,
  onClose,
  organization
}: OrganizationDetailsDrawerProps) {
  const [transactionStats, setTransactionStats] = useState<TransactionStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [assigningPlan, setAssigningPlan] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([])
  const [selectedPlanPrice, setSelectedPlanPrice] = useState<number>(0)
  const [markAsPaid, setMarkAsPaid] = useState(false)
  const [orgData, setOrgData] = useState<any>(null) // ✅ Local org state - fetch from API
  const [fetchingOrgData, setFetchingOrgData] = useState(false)
  const [planForm, setPlanForm] = useState({
    plan: 'free',
    billingCycle: 'monthly',
    reason: ''
  })
  const [showWaModal, setShowWaModal] = useState(false)
  const [connectingWa, setConnectingWa] = useState(false)
  const [waForm, setWaForm] = useState({
    waba_id: '',
    phone_number_id: '',
    custom_access_token: ''
  })

  useEffect(() => {
    if (isOpen && organization?.accountId) {
      fetchOrgData() // ✅ Fetch fresh org data from API
      fetchPricingPlans()
    }
  }, [isOpen, organization?.accountId])

  // ✅ Call fetchTransactionStats when orgData is ready with cashfreeAccountId
  useEffect(() => {
    if (orgData) {
      fetchTransactionStats()
    }
  }, [orgData])

  const fetchOrgData = async () => {
    try {
      setFetchingOrgData(true)
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${API_URL}/admin/organizations/${organization.accountId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (res.ok) {
        const data = await res.json()
        const freshOrg = data.data || data
        setOrgData(freshOrg) // ✅ Update local state with fresh data from DB
        setPlanForm({
          plan: freshOrg.plan || 'free',
          billingCycle: freshOrg.billingCycle || 'monthly',
          reason: ''
        })
      } else {
        console.error('Failed to fetch org:', res.statusText)
      }
    } catch (err) {
      console.error('Failed to fetch org data:', err)
    } finally {
      setFetchingOrgData(false)
    }
  }

  const fetchTransactionStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem("token")

      // Use Cashfree account ID if available, otherwise use internal accountId
      const queryId = orgData?.cashfreeAccountId || organization.accountId
      
      const txnResponse = await fetch(
        `${API_URL}/admin/transactions?accountId=${queryId}&limit=1000`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      )

      if (txnResponse.ok) {
        const txnData = await txnResponse.json()
        const transactions = txnData.data?.transactions || []
        const completed = transactions.filter((t: any) => t.status === 'completed')
        const lastTxn = transactions.length > 0 ? transactions[0] : null

        setTransactionStats({
          totalTransactions: transactions.length,
          completedTransactions: completed.length,
          totalAmount: completed.reduce((sum: number, t: any) => sum + (t.amount || 0), 0),
          lastTransaction: lastTxn ? {
            amount: lastTxn.amount,
            date: lastTxn.createdAt,
            status: lastTxn.status
          } : undefined
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch transaction stats")
    } finally {
      setLoading(false)
    }
  }

  const fetchPricingPlans = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/pricing/admin/plans`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setPricingPlans(data.data?.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch pricing plans')
    }
  }

  const handlePlanChange = (plan: string) => {
    setPlanForm({ ...planForm, plan })
    const selectedPlan = pricingPlans.find(p => p.name.toLowerCase() === plan.toLowerCase())
    if (selectedPlan) {
      const price = planForm.billingCycle === 'annual' ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice
      setSelectedPlanPrice(price)
    }
  }

  const handleBillingCycleChange = (cycle: string) => {
    setPlanForm({ ...planForm, billingCycle: cycle })
    const selectedPlan = pricingPlans.find(p => p.name.toLowerCase() === planForm.plan.toLowerCase())
    if (selectedPlan) {
      const price = cycle === 'annual' ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice
      setSelectedPlanPrice(price)
    }
  }

  const handleAssignPlan = async () => {
    try {
      setAssigningPlan(true)
      setError(null)
      setSuccessMsg('')
      
      const token = localStorage.getItem('token')
      
      // Prepare payload
      const payload: any = {
        plan: planForm.plan,
        billingCycle: planForm.billingCycle,
        reason: planForm.reason
      }

      // If marking as paid, add payment info
      if (markAsPaid) {
        payload.markAsPaid = true
        payload.amount = selectedPlanPrice
      }

      const res = await fetch(
        `${API_URL}/admin/organizations/${organization.accountId}/assign-plan`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )

      const data = await res.json()

      if (res.ok) {
        setSuccessMsg(`✅ Plan assigned successfully!`)
        
        // Refetch fresh org data from API to sync with database
        await fetchOrgData()
        
        // Also refetch transaction stats
        await fetchTransactionStats()
        
        setTimeout(() => {
          setShowPlanModal(false)
          setSuccessMsg('')
          // Trigger parent refresh by closing
          onClose()
        }, 1500)
      } else {
        setError(data.message || 'Failed to assign plan')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error assigning plan')
    } finally {
      setAssigningPlan(false)
    }
  }

  const handleConnectWhatsApp = async () => {
    try {
      setConnectingWa(true)
      setError(null)
      setSuccessMsg('')
      
      const token = localStorage.getItem('token')
      
      const res = await fetch(
        `${API_URL}/admin/accounts/${organization.accountId}/whatsapp/connect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(waForm)
        }
      )

      const data = await res.json()

      if (res.ok) {
        setSuccessMsg(`✅ WhatsApp connected successfully!`)
        await fetchOrgData()
        setTimeout(() => {
          setShowWaModal(false)
          setSuccessMsg('')
          setWaForm({ waba_id: '', phone_number_id: '', custom_access_token: '' })
          onClose()
        }, 1500)
      } else {
        setError(data.message || 'Failed to connect WhatsApp')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error connecting WhatsApp')
    } finally {
      setConnectingWa(false)
    }
  }

  if (!isOpen || !organization) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl z-50 transform transition-transform duration-300 overflow-y-auto sm:w-[32rem]">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Organization Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          {/* Two Column Layout */}
          {orgData ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Name</p>
                  <p className="text-sm text-gray-900">{orgData?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Account ID</p>
                  <p className="text-sm font-mono text-gray-700">{orgData?.accountId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Type</p>
                  <p className="text-sm text-gray-900 capitalize">{orgData?.type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Status</p>
                  <p className="text-sm text-gray-900 capitalize">{orgData?.status || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Email</p>
                  <p className="text-sm text-gray-700 break-all">{orgData?.email || 'N/A'}</p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Phone</p>
                  <p className="text-sm text-gray-900">{orgData?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Plan</p>
                  <p className="text-sm text-gray-900 capitalize">{orgData?.plan || 'free'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Billing Cycle</p>
                  <p className="text-sm text-gray-900 capitalize">{orgData?.billingCycle || 'monthly'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Next Billing</p>
                  <p className="text-sm text-gray-900">
                    {orgData?.nextBillingDate ? new Date(orgData?.nextBillingDate).toLocaleDateString('en-IN') : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Created</p>
                  <p className="text-sm text-gray-900">{orgData?.createdAt ? new Date(orgData?.createdAt).toLocaleDateString('en-IN') : 'N/A'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">Loading organization data...</div>
          )}

          {orgData?.operational ? (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Projects & WhatsApp</h3>
              {orgData.operational.verticals?.length ? (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Verticals in use</p>
                  <VerticalBadgesFromCounts projectsByVertical={orgData.operational.projectsByVertical} />
                  {orgData.operational.hasMultipleVerticals ? (
                    <p className="mt-2 text-xs text-sky-700">
                      This org runs multiple product verticals (e.g. WhatsApp + Healthcare).
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-gray-500 uppercase">Projects</p>
                  <p className="font-semibold text-gray-900">{orgData.operational.projectCount}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-gray-500 uppercase">WA connected</p>
                  <p className="font-semibold text-gray-900">{orgData.operational.connectedProjectCount}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-gray-500 uppercase">Phone lines</p>
                  <p className="font-semibold text-gray-900">{orgData.operational.phoneLineCount}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-gray-500 uppercase">Messages (7d)</p>
                  <p className="font-semibold text-gray-900">{orgData.operational.messagesLast7d}</p>
                </div>
              </div>
              {orgData.operational.projects?.length > 0 ? (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Projects</p>
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {orgData.operational.projects.map((proj: {
                      projectId: string;
                      name: string;
                      isDefault: boolean;
                      vertical?: string;
                      whatsappConnected: boolean;
                      displayNumber: string | null;
                      status: string;
                    }) => (
                      <li
                        key={proj.projectId}
                        className="rounded-lg border border-gray-100 px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-gray-900 flex flex-wrap items-center gap-1.5">
                          {proj.name}
                          <VerticalBadge vertical={proj.vertical || 'whatsapp'} compact />
                          {proj.isDefault ? (
                            <span className="text-[10px] text-blue-600">default</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-gray-500">
                          {proj.whatsappConnected
                            ? proj.displayNumber || 'WhatsApp connected'
                            : 'Not connected'}
                          · {proj.status}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {orgData.operational.phones?.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Phone numbers</p>
                  <ul className="space-y-2 max-h-32 overflow-y-auto">
                    {orgData.operational.phones.map((ph: {
                      displayPhone: string;
                      isActive: boolean;
                      qualityRating?: string;
                    }, i: number) => (
                      <li key={i} className="text-sm text-gray-700 flex justify-between">
                        <span>{ph.displayPhone}</span>
                        <span className="text-xs text-gray-500">
                          {ph.isActive ? 'active' : 'inactive'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* WhatsApp Connection Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Manual WhatsApp Connection</h3>
            <p className="text-sm text-gray-600 mb-4">Connect a client's WhatsApp number manually using their credentials.</p>
            <button
              onClick={() => setShowWaModal(true)}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
            >
              Connect WhatsApp Manually
            </button>
          </div>

          {/* Transactions Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Transaction Summary</h3>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-red-600 text-sm">⚠️ {error}</div>
            ) : transactionStats ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{transactionStats.totalTransactions}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{transactionStats.completedTransactions}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{transactionStats.totalAmount.toFixed(2)}</p>
                </div>
                {transactionStats.lastTransaction && (
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Last Transaction</p>
                    <div className="text-sm text-gray-700">
                      <p>₹{transactionStats.lastTransaction.amount} on {new Date(transactionStats.lastTransaction.date).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Plan Assignment Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Plan Assignment</h3>
            <p className="text-sm text-gray-600 mb-4">Current Plan: <span className="font-semibold text-gray-900 capitalize">{organization.plan || 'free'} ({organization.billingCycle || 'monthly'})</span></p>
            <button
              onClick={() => setShowPlanModal(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
            >
              Assign New Plan
            </button>
          </div>
        </div>

        {/* Plan Assignment Modal */}
        {showPlanModal && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowPlanModal(false)} />
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-xl w-96 p-6 max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Assign Plan</h2>
                <button 
                  onClick={() => setShowPlanModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {successMsg && (
                <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded text-green-700 text-sm">
                  {successMsg}
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Plan</label>
                  <select
                    value={planForm.plan}
                    onChange={(e) => handlePlanChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="free">Free</option>
                    {pricingPlans.map(plan => (
                      <option key={plan._id} value={plan.name.toLowerCase()}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Billing Cycle</label>
                  <select
                    value={planForm.billingCycle}
                    onChange={(e) => handleBillingCycleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>

                {selectedPlanPrice > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-gray-600">Plan Price:</p>
                    <p className="text-2xl font-bold text-blue-600">₹{selectedPlanPrice}</p>
                  </div>
                )}

                <label className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={markAsPaid}
                    onChange={(e) => setMarkAsPaid(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">Mark as Paid (Old Customer)</span>
                </label>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reason (Optional)</label>
                  <textarea
                    value={planForm.reason}
                    onChange={(e) => setPlanForm({ ...planForm, reason: e.target.value })}
                    placeholder="e.g., Migration to new pricing system, Negotiated deal"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleAssignPlan}
                    disabled={assigningPlan}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 font-semibold transition"
                  >
                    {assigningPlan ? 'Assigning...' : 'Assign Plan'}
                  </button>
                  <button
                    onClick={() => setShowPlanModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
        {/* WhatsApp Connect Modal */}
        {showWaModal && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowWaModal(false)} />
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-xl w-96 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Connect WhatsApp</h2>
                <button 
                  onClick={() => setShowWaModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {successMsg && (
                <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded text-green-700 text-sm">
                  {successMsg}
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">WABA ID</label>
                  <input
                    type="text"
                    value={waForm.waba_id}
                    onChange={(e) => setWaForm({ ...waForm, waba_id: e.target.value })}
                    placeholder="e.g. 123456789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number ID</label>
                  <input
                    type="text"
                    value={waForm.phone_number_id}
                    onChange={(e) => setWaForm({ ...waForm, phone_number_id: e.target.value })}
                    placeholder="e.g. 987654321"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Custom System Token (Optional)</label>
                  <input
                    type="text"
                    value={waForm.custom_access_token}
                    onChange={(e) => setWaForm({ ...waForm, custom_access_token: e.target.value })}
                    placeholder="Leave blank to use default .env token"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleConnectWhatsApp}
                    disabled={connectingWa || !waForm.waba_id || !waForm.phone_number_id}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 font-semibold transition"
                  >
                    {connectingWa ? 'Connecting...' : 'Connect'}
                  </button>
                  <button
                    onClick={() => setShowWaModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
