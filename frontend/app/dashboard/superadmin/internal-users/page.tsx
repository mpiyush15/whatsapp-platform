'use client'

import { useEffect, useState } from 'react'
import { KeyRound, Plus, RefreshCw, Shield, UserX, X } from 'lucide-react'
import { API_URL } from '@/lib/config/api'
import { ErrorToast } from '@/components/ErrorToast'

type InternalUser = {
  _id: string
  email: string
  name: string
  role: 'ops-admin' | 'support' | 'sales' | 'marketing' | 'finance-ops' | 'superadmin'
  permissions?: string[]
  isActive?: boolean
  mustResetPassword?: boolean
  accessBoundary?: string
  createdAt?: string
}

type ViewState = 'list' | 'create'

const ROLE_OPTIONS: Array<{ value: InternalUser['role']; label: string; description: string }> = [
  { value: 'ops-admin', label: 'Ops Admin', description: 'Billing, reconciliation, credits' },
  { value: 'support', label: 'Support', description: 'Customer support and refund ops' },
  { value: 'sales', label: 'Sales', description: 'Lead conversion, demos, and account growth ops' },
  { value: 'marketing', label: 'Marketing', description: 'Offers, campaigns, announcements' },
  { value: 'finance-ops', label: 'Finance Ops', description: 'Payments, invoices, revenue controls' },
  { value: 'superadmin', label: 'Superadmin', description: 'Full platform administration' },
]

export default function InternalUsersPage() {
  const [view, setView] = useState<ViewState>('list')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<InternalUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ops-admin' as InternalUser['role'],
  })

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token') || localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/superadmin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load internal users')
      }
      setUsers(payload.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load internal users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const token = localStorage.getItem('token') || localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/superadmin/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to create internal user')
      }
      setSuccess('Internal user created')
      setView('list')
      setForm({ name: '', email: '', password: '', role: 'ops-admin' })
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create internal user')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (user: InternalUser) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/superadmin/users/${user._id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update user status')
      }
      setSuccess(user.isActive ? 'User suspended' : 'User reactivated')
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status')
    }
  }

  const handleResetPassword = async (user: InternalUser) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/superadmin/users/${user._id}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to reset password')
      }
      setTempPassword(payload.data?.temporaryPassword || null)
      setSuccess(`Temporary password generated for ${user.email}`)
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
      {success && (
        <div className="fixed right-4 top-4 z-50 rounded border border-green-300 bg-green-100 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Internal Users</h1>
            <p className="text-sm text-gray-600">Create internal staff accounts with admin.domain-only access boundaries.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchUsers}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button
              onClick={() => setView(view === 'list' ? 'create' : 'list')}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {view === 'list' ? <Plus className="h-4 w-4" /> : <X className="h-4 w-4" />}
              {view === 'list' ? 'Create Internal User' : 'Close'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Access boundary</p>
            <p className="mt-2 text-sm font-medium text-gray-900">admin.domain only</p>
            <p className="mt-1 text-xs text-gray-600">Internal staff should never operate in client project wrappers.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Role matrix</p>
            <p className="mt-2 text-sm font-medium text-gray-900">Ops / Support / Marketing / Finance</p>
            <p className="mt-1 text-xs text-gray-600">Dedicated permissions help reduce superadmin overuse.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reset policy</p>
            <p className="mt-2 text-sm font-medium text-gray-900">Temporary password flow</p>
            <p className="mt-1 text-xs text-gray-600">Generate a temp password and require the user to change it on next login.</p>
          </div>
        </div>

        {tempPassword ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">Temporary password</p>
            <p className="mt-2 font-mono text-sm text-amber-800">{tempPassword}</p>
            <p className="mt-1 text-xs text-amber-700">Share securely. User should rotate after first login.</p>
          </div>
        ) : null}

        {view === 'create' ? (
          <form onSubmit={handleCreate} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border px-3 py-2" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border px-3 py-2" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Temporary Password</label>
                <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg border px-3 py-2" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Internal Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as InternalUser['role'] })} className="w-full rounded-lg border px-3 py-2">
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">Role capability preview</p>
              <p className="mt-1 text-sm text-blue-700">{ROLE_OPTIONS.find((role) => role.value === form.role)?.description}</p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setView('list')} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Create User</button>
            </div>
          </form>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Boundary</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                      {user.role}
                    </span>
                    <p className="mt-1 text-xs text-gray-500">{(user.permissions || []).join(', ') || 'No permissions'}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">{user.accessBoundary || 'admin.domain'}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${user.isActive === false ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {user.isActive === false ? 'Suspended' : 'Active'}
                    </span>
                    {user.mustResetPassword ? <p className="mt-1 text-xs text-amber-700">Reset required</p> : null}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => handleToggleStatus(user)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                        <UserX className="h-3.5 w-3.5" />
                        {user.isActive === false ? 'Reactivate' : 'Suspend'}
                      </button>
                      <button onClick={() => handleResetPassword(user)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                        <KeyRound className="h-3.5 w-3.5" /> Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                    <Shield className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    No internal users created yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
