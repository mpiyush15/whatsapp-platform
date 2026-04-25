'use client'

import { useState, useEffect } from 'react'
import { Copy, Eye, EyeOff, Trash2, Plus, RefreshCw, Lock } from 'lucide-react'
import axios from 'axios'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
  lastUsedAt?: string
  expiresAt?: string
  isActive: boolean
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewKeyModal, setShowNewKeyModal] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [generatingKey, setGeneratingKey] = useState(false)
  const [newGeneratedKey, setNewGeneratedKey] = useState<{ apiKey: string; name: string } | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const getHeaders = () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  const fetchApiKeys = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/integrations/api-keys`, {
        headers: getHeaders()
      })

      if (response.data.success) {
        setApiKeys(response.data.data || [])
      }
    } catch (error) {
      console.error('Error fetching API keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateKey = async () => {
    if (!keyName.trim()) {
      alert('Please enter a name for this API key')
      return
    }

    try {
      setGeneratingKey(true)
      const response = await axios.post(
        `${API_URL}/integrations/api-keys/generate`,
        { name: keyName },
        { headers: getHeaders() }
      )

      if (response.data.success) {
        setNewGeneratedKey({
          apiKey: response.data.data.apiKey,
          name: response.data.data.name
        })
        setKeyName('')
        fetchApiKeys()
      }
    } catch (error) {
      console.error('Error generating API key:', error)
      alert('Failed to generate API key')
    } finally {
      setGeneratingKey(false)
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return
    }

    try {
      const response = await axios.delete(`${API_URL}/integrations/api-keys/${keyId}`, {
        headers: getHeaders()
      })

      if (response.data.success) {
        fetchApiKeys()
      }
    } catch (error) {
      console.error('Error deleting API key:', error)
      alert('Failed to delete API key')
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? It will no longer work.')) {
      return
    }

    try {
      const response = await axios.post(
        `${API_URL}/integrations/api-keys/${keyId}/revoke`,
        {},
        { headers: getHeaders() }
      )

      if (response.data.success) {
        fetchApiKeys()
      }
    } catch (error) {
      console.error('Error revoking API key:', error)
      alert('Failed to revoke API key')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">API Keys</h1>
          <p className="text-gray-600">Manage API keys for integrating with external platforms like Enromatics</p>
        </div>

        {/* Generate New Key Modal */}
        {showNewKeyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Generate New API Key</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Enromatics Integration, Dev Environment"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowNewKeyModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateKey}
                    disabled={generatingKey}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium transition disabled:opacity-50"
                  >
                    {generatingKey ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Generated Key Display */}
        {newGeneratedKey && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <Lock className="text-blue-600 mt-1 flex-shrink-0" size={20} />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 mb-2">Your API Key for "{newGeneratedKey.name}"</h3>
                <p className="text-sm text-gray-600 mb-4">
                  ⚠️ Save this key somewhere safe. You won't be able to see it again!
                </p>
                
                <div className="bg-white border border-gray-300 rounded p-3 mb-4 font-mono text-sm break-all">
                  {showKey ? newGeneratedKey.apiKey : '••••••••••••••••••••'}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(newGeneratedKey.apiKey)}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded transition"
                  >
                    <Copy size={16} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => setNewGeneratedKey(null)}
                    className="ml-auto px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={() => setShowNewKeyModal(true)}
          className="mb-6 flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium transition"
        >
          <Plus size={18} />
          Generate New Key
        </button>

        {/* API Keys List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="animate-spin text-gray-400 mx-auto mb-2" size={24} />
              <p className="text-gray-600">Loading API keys...</p>
            </div>
          ) : apiKeys.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Key Prefix</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {apiKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{key.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">{key.keyPrefix}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(key.createdAt)}</td>
                      <td className="px-6 py-4 text-sm">
                        {key.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Revoked
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm flex gap-2">
                        {key.isActive && (
                          <button
                            onClick={() => handleRevokeKey(key.id)}
                            className="text-yellow-600 hover:text-yellow-700 font-medium"
                            title="Revoke this key"
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteKey(key.id)}
                          className="text-red-600 hover:text-red-700 font-medium"
                          title="Delete this key"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No API keys yet</p>
              <p className="text-gray-500 text-sm mt-1">Generate your first API key to start integrating with external platforms</p>
            </div>
          )}
        </div>

        {/* Documentation */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="font-bold text-gray-900 mb-3">Integration with Enromatics</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>API Base URL:</strong> {API_URL.replace('/api', '')}</p>
            <p><strong>Authentication:</strong> Add your API key to the <code className="bg-white px-1 py-0.5 rounded border border-gray-200">X-API-Key</code> header</p>
            <p><strong>Example:</strong> <code className="bg-white px-1 py-0.5 rounded border border-gray-200">X-API-Key: your_api_key_here</code></p>
          </div>
        </div>
      </div>
    </div>
  )
}
