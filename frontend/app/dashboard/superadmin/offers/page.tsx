'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Gift, Plus, RefreshCw, Tag, Trash2, X } from 'lucide-react'
import { API_URL } from '@/lib/config/api'
import { ErrorToast } from '@/components/ErrorToast'

type Offer = {
  _id: string
  name: string
  description?: string
  type: 'percentage' | 'flat'
  value: number
  applicablePlans: string[]
  validFrom: string
  validUntil: string
  maxRedemptions?: number | null
  redemptionCount?: number
  isActive: boolean
}

type ViewState = 'list' | 'create'

const PLAN_OPTIONS = ['starter', 'pro', 'enterprise', 'custom', 'all']

export default function SuperadminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [view, setView] = useState<ViewState>('list')
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'percentage' as Offer['type'],
    value: '',
    applicablePlans: ['all'] as string[],
    validFrom: '',
    validUntil: '',
    maxRedemptions: '',
    isActive: true,
  })

  const fetchOffers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token') || localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/pricing/admin/offers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch offers')
      }
      setOffers(payload.data?.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch offers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOffers()
  }, [])

  const analytics = useMemo(() => {
    const active = offers.filter((offer) => offer.isActive).length
    const totalRedemptions = offers.reduce((sum, offer) => sum + Number(offer.redemptionCount || 0), 0)
    const expiringSoon = offers.filter((offer) => {
      const days = Math.ceil((new Date(offer.validUntil).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      return days >= 0 && days <= 7
    }).length
    return { active, totalRedemptions, expiringSoon }
  }, [offers])

  const handleTogglePlan = (plan: string) => {
    const exists = form.applicablePlans.includes(plan)
    const next = exists ? form.applicablePlans.filter((item) => item !== plan) : [...form.applicablePlans, plan]
    setForm({ ...form, applicablePlans: next.length ? next : ['all'] })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const token = localStorage.getItem('token') || localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/pricing/admin/offers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          value: Number(form.value),
          maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to create offer')
      }
      setSuccess('Offer created')
      setView('list')
      setForm({
        name: '', description: '', type: 'percentage', value: '', applicablePlans: ['all'], validFrom: '', validUntil: '', maxRedemptions: '', isActive: true,
      })
      await fetchOffers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create offer')
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async (offerId: string) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/pricing/admin/offers/${offerId}/deactivate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to deactivate offer')
      }
      setSuccess('Offer deactivated')
      await fetchOffers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate offer')
    }
  }

  const handleDelete = async (offerId: string) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/pricing/admin/offers/${offerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to delete offer')
      }
      setSuccess('Offer deleted')
      await fetchOffers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete offer')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
      {success ? <div className="fixed right-4 top-4 z-50 rounded border border-green-300 bg-green-100 px-4 py-3 text-sm text-green-700">{success}</div> : null}

      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Offers & Discounts</h1>
            <p className="text-sm text-gray-600">Manage checkout, email, and internal campaign offers from one place.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchOffers} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
            <button onClick={() => setView(view === 'list' ? 'create' : 'list')} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{view === 'list' ? <Plus className="h-4 w-4" /> : <X className="h-4 w-4" />}{view === 'list' ? 'Create Offer' : 'Close'}</button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Active offers</p><Gift className="h-4 w-4 text-blue-600" /></div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{analytics.active}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total redemptions</p><BarChart3 className="h-4 w-4 text-emerald-600" /></div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{analytics.totalRedemptions}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Expiring in 7 days</p><Tag className="h-4 w-4 text-amber-600" /></div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{analytics.expiringSoon}</p>
          </div>
        </div>

        {view === 'create' ? (
          <form onSubmit={handleCreate} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Offer name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Offer type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Offer['type'] })} className="w-full rounded-lg border px-3 py-2">
                  <option value="percentage">Percentage</option>
                  <option value="flat">Flat</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Offer value</label>
                <input type="number" required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Max redemptions</label>
                <input type="number" value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} className="w-full rounded-lg border px-3 py-2" placeholder="Unlimited if blank" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Valid from</label>
                <input type="datetime-local" required value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Valid until</label>
                <input type="datetime-local" required value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border px-3 py-2" rows={3} />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">Applicable plans</label>
              <div className="flex flex-wrap gap-2">
                {PLAN_OPTIONS.map((plan) => {
                  const selected = form.applicablePlans.includes(plan)
                  return (
                    <button type="button" key={plan} onClick={() => handleTogglePlan(plan)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selected ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}>
                      {plan}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setView('list')} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Create Offer</button>
            </div>
          </form>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Offer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Targeting</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Window</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Performance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {offers.map((offer) => (
                <tr key={offer._id}>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900">{offer.name}</p>
                    <p className="text-xs text-gray-500">{offer.description || 'No description'}</p>
                    <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${offer.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{offer.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    <p>{offer.type === 'percentage' ? `${offer.value}% off` : `₹${offer.value} off`}</p>
                    <p className="mt-1 text-xs text-gray-500">Plans: {(offer.applicablePlans || []).join(', ')}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    <p>{new Date(offer.validFrom).toLocaleDateString('en-IN')}</p>
                    <p className="text-xs text-gray-500">to {new Date(offer.validUntil).toLocaleDateString('en-IN')}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    <p>Redeemed: {offer.redemptionCount || 0}</p>
                    <p className="text-xs text-gray-500">Limit: {offer.maxRedemptions ?? 'Unlimited'}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {offer.isActive ? <button onClick={() => handleDeactivate(offer._id)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Deactivate</button> : null}
                      <button onClick={() => handleDelete(offer._id)} className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {offers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">No offers created yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
