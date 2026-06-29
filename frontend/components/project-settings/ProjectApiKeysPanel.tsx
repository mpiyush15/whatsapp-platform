'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Copy, Eye, EyeOff, Lock, Plus, RefreshCw, Trash2 } from 'lucide-react'

type ApiKey = {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
  lastUsedAt?: string
  expiresAt?: string
  isActive: boolean
}

type Props = {
  projectId: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'

function getHeaders() {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ProjectApiKeysPanel({ projectId }: Props) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [created, setCreated] = useState<{ apiKey: string; name: string } | null>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [copied, setCopied] = useState(false)

  const docsBase = useMemo(() => API_URL.replace('/api', ''), [])

  const fetchApiKeys = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/integrations/api-keys`, {
        method: 'GET',
        headers: getHeaders(),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || payload?.error || 'Failed to load API keys')
      }
      const list = Array.isArray(payload?.data?.data) ? payload.data.data : []
      setApiKeys(list)
    } catch (error) {
      console.error('Error fetching API keys:', error)
      setApiKeys([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) fetchApiKeys()
  }, [projectId])

  const handleCreate = async () => {
    if (!keyName.trim()) {
      alert('Please enter a key name')
      return
    }
    try {
      setCreating(true)
      const response = await fetch(`${API_URL}/integrations/api-keys/generate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name: keyName.trim() }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || payload?.error || 'Failed to generate key')
      }

      setCreated({
        apiKey: payload?.data?.apiKey,
        name: payload?.data?.name || keyName.trim(),
      })
      setKeyName('')
      setModalOpen(false)
      fetchApiKeys()
    } catch (error) {
      console.error('Error creating API key:', error)
      alert(error instanceof Error ? error.message : 'Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (keyId: string) => {
    if (!confirm('Revoke this API key? It will stop working immediately.')) return
    try {
      const response = await fetch(`${API_URL}/integrations/api-keys/${keyId}/revoke`, {
        method: 'POST',
        headers: getHeaders(),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || payload?.error || 'Failed to revoke key')
      }
      fetchApiKeys()
    } catch (error) {
      console.error('Error revoking key:', error)
      alert(error instanceof Error ? error.message : 'Failed to revoke key')
    }
  }

  const handleDelete = async (keyId: string) => {
    if (!confirm('Delete this API key permanently?')) return
    try {
      const response = await fetch(`${API_URL}/integrations/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || payload?.error || 'Failed to delete key')
      }
      fetchApiKeys()
    } catch (error) {
      console.error('Error deleting key:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete key')
    }
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Project API Keys</h1>
            <p className="text-sm text-gray-600 mt-1">Create, revoke, and rotate keys used by external integrations.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/projects/${projectId}/settings/webhooks`} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
              Webhooks
            </Link>
            <button onClick={fetchApiKeys} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
              <Plus className="h-4 w-4" />
              New key
            </button>
          </div>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
              <h2 className="text-lg font-semibold text-gray-900">Create API Key</h2>
              <p className="text-sm text-gray-600 mt-1">Name helps identify usage context.</p>
              <input
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. Zapier Production"
                className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={creating} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {created && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-blue-900">Key created: {created.name}</p>
                <p className="text-xs text-blue-700 mt-1">Save it now. You cannot view the full secret again.</p>
              </div>
              <button onClick={() => setCreated(null)} className="text-sm text-blue-700">Dismiss</button>
            </div>
            <div className="mt-3 rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-sm break-all">
              {showSecret ? created.apiKey : '••••••••••••••••••••••••'}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setShowSecret((v) => !v)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showSecret ? 'Hide' : 'Show'}
              </button>
              <button onClick={() => handleCopy(created.apiKey)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
                <Copy className="h-4 w-4" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {loading ? (
            <div className="p-8 text-center text-gray-600">Loading API keys...</div>
          ) : apiKeys.length === 0 ? (
            <div className="p-10 text-center">
              <Lock className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 font-medium text-gray-800">No API keys yet</p>
              <p className="text-sm text-gray-600">Create one key for each external consumer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-600">
                  <tr>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Prefix</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3">Last used</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {apiKeys.map((key) => (
                    <tr key={key.id}>
                      <td className="px-5 py-3 font-medium text-gray-900">{key.name}</td>
                      <td className="px-5 py-3 font-mono text-gray-600">{key.keyPrefix}</td>
                      <td className="px-5 py-3 text-gray-600">{formatDate(key.createdAt)}</td>
                      <td className="px-5 py-3 text-gray-600">{formatDate(key.lastUsedAt)}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${key.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {key.isActive ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {key.isActive && (
                            <button onClick={() => handleRevoke(key.id)} className="text-amber-700 hover:text-amber-900">Revoke</button>
                          )}
                          <button onClick={() => handleDelete(key.id)} className="text-red-700 hover:text-red-900">
                            <Trash2 className="h-4 w-4" />
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

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Use header <span className="font-mono">X-API-Key</span> for external calls. Base URL: <span className="font-mono">{docsBase}</span>
        </div>
      </div>
    </div>
  )
}
