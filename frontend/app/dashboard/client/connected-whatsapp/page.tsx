"use client"

import { useState, useEffect } from "react"
import { Phone, CheckCircle, AlertCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authService } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"

export default function ConnectedWhatsAppPage() {
  const [phones, setPhones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  useEffect(() => {
    fetchConnectedPhones()
  }, [])

  const fetchConnectedPhones = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = authService.getToken()
      const response = await fetch(`${API_URL}/integrations/whatsapp/phones`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setPhones(data.phones || [])
      } else {
        setError("Failed to fetch connected phones")
      }
    } catch (err) {
      console.error("Error fetching phones:", err)
      setError("An error occurred while fetching phones")
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (phoneNumberId: string) => {
    if (!confirm("Are you sure you want to disconnect this WhatsApp number?")) {
      return
    }

    try {
      setDisconnecting(phoneNumberId)
      const token = authService.getToken()
      
      const response = await fetch(`${API_URL}/integrations/whatsapp/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setPhones([])
        setError(null)
      } else {
        setError("Failed to disconnect WhatsApp")
      }
    } catch (err) {
      console.error("Error disconnecting:", err)
      setError("An error occurred while disconnecting")
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Connected WhatsApp Numbers</h1>
        <p className="text-gray-600 mb-8">View and manage your connected WhatsApp Business numbers</p>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Phone size={24} />
            <h2 className="text-xl font-semibold">Active Connections</h2>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
              <p className="text-gray-600 mt-4">Loading connected numbers...</p>
            </div>
          ) : phones.length === 0 ? (
            <div className="text-center py-12">
              <Phone size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 mb-2">No WhatsApp numbers connected</p>
              <p className="text-sm text-gray-500">Go to Settings to connect your first WhatsApp Business number</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Phone Number</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Display Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Quality Rating</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Verification</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Connected</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {phones.map((phone: any) => (
                    <tr key={phone.phoneNumberId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {phone.displayPhone || phone.display_phone_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {phone.displayName || phone.display_name || 'WhatsApp Business'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          phone.qualityRating === 'GREEN' ? 'bg-green-100 text-green-800' :
                          phone.qualityRating === 'YELLOW' ? 'bg-yellow-100 text-yellow-800' :
                          phone.qualityRating === 'RED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {phone.qualityRating || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          phone.verificationStatus === 'VERIFIED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {phone.verificationStatus === 'VERIFIED' ? (
                            <>
                              <CheckCircle size={14} className="mr-1" />
                              Verified
                            </>
                          ) : (
                            'Not Verified'
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {phone.connectedAt ? new Date(phone.connectedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          size="sm"
                          onClick={() => handleDisconnect(phone.phoneNumberId)}
                          disabled={disconnecting === phone.phoneNumberId}
                          className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Trash2 size={16} />
                          {disconnecting === phone.phoneNumberId ? 'Disconnecting...' : 'Disconnect'}
                        </Button>
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
