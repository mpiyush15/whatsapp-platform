"use client"

import { useState, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Phone, CheckCircle, AlertCircle } from "lucide-react"
import { authService } from "@/lib/auth"

// Type declaration for WhatsApp function on window
declare global {
  interface Window {
    launchWhatsAppSignup?: (callback?: (response: any) => void) => void
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

function WhatsAppSettingsContent() {
  const [connectedPhones, setConnectedPhones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch connected phones on load
  useEffect(() => {
    fetchConnectedPhones()
  }, [])

  // Listen for Embedded Signup FINISH event
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Meta sends postMessage as a JSON string - must parse first
      let parsed: any = event.data
      if (typeof event.data === 'string') {
        try {
          parsed = JSON.parse(event.data)
        } catch {
          return // not a JSON message, ignore
        }
      }

      // Check if this is a WhatsApp Embedded Signup FINISH event
      if (parsed?.type === 'WA_EMBEDDED_SIGNUP' && parsed?.event === 'FINISH') {
        const { waba_id, phone_number_id } = parsed.data || {}

        if (!waba_id || !phone_number_id) {
          console.error('Error: FINISH event missing waba_id or phone_number_id')
          return
        }

        // Call backend /connect endpoint
        connectWhatsAppWithData(waba_id, phone_number_id)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const fetchConnectedPhones = async () => {
    try {
      const token = authService.getToken()
      const response = await fetch(`${API_URL}/integrations/whatsapp/phones`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        setConnectedPhones(result.data?.phones || [])
        setError(null)
      } else {
        const err = await response.json().catch(() => null)
        setError(err?.error || 'Failed to fetch connected phones')
      }
    } catch (err) {
      console.error("Error fetching phones:", err)
      setError("Failed to fetch connected phones")
    } finally {
      setLoading(false)
    }
  }

  const connectWhatsAppWithData = async (wabaId: string, phoneNumberId: string) => {
    try {
      setConnecting(true)
      setError(null)

      const token = authService.getToken()
      const response = await fetch(`${API_URL}/integrations/whatsapp/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          waba_id: wabaId,
          phone_number_id: phoneNumberId
        })
      })

      if (response.ok) {
        const result = await response.json()
        const phone = result.data?.phone

        // Update UI with new phone
        if (phone) {
          setConnectedPhones([phone])
          setError(null)
          alert(`✅ WhatsApp connected! Phone: ${phone.displayPhone || phone.display_phone_number || phone.phoneNumberId}`)
        } else {
          console.warn('No phone data in response')
          fetchConnectedPhones()
        }
      } else {
        const err = await response.json()
        setError(err.error || err.message || 'Failed to connect WhatsApp')
      }
    } catch (err) {
      console.error('Error connecting WhatsApp:', err)
      setError('An error occurred while connecting WhatsApp')
    } finally {
      setConnecting(false)
    }
  }

  const handleConnect = () => {
    setConnecting(true)
    try {
      if (typeof window !== 'undefined' && typeof window.launchWhatsAppSignup === 'function') {
        window.launchWhatsAppSignup((response: any) => {
          // If response has an error or user closed popup without finishing
          if (response && response.error) {
            setError(response.error);
            setConnecting(false);
          } else if (!response || response.status === 'unknown') {
            // User likely closed the popup
            setConnecting(false);
          }
          // If successful, the postMessage listener will handle the FINISH event
          // and we keep connecting=true until the backend finishes
        });
      } else {
        setError('Facebook SDK not loaded yet. Please refresh and try again.')
        setConnecting(false)
      }
    } catch (err) {
      console.error('Error launching signup:', err)
      setError('Failed to launch WhatsApp connection')
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      const token = authService.getToken()
      await fetch(`${API_URL}/integrations/whatsapp/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      setConnectedPhones([])
      setError(null)
    } catch (err) {
      console.error('Error disconnecting:', err)
      setError('Failed to disconnect WhatsApp')
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">WhatsApp Settings</h1>
      <p className="text-gray-600 mb-8">Connect and manage your WhatsApp Business numbers using Flow B (Embedded Signup)</p>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Phone size={24} />
          <h2 className="text-xl font-semibold">WhatsApp Business Account</h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : connectedPhones.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No WhatsApp numbers connected</p>
            <Button 
              onClick={handleConnect} 
              disabled={connecting}
              className="bg-green-600 hover:bg-green-700"
            >
              {connecting ? 'Connecting...' : 'Connect WhatsApp'}
            </Button>
          </div>
        ) : (
          <div>
            <div className="mb-6 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Phone Number</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Display Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Quality</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Verification</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {connectedPhones.map((phone: any) => (
                    <tr key={phone.phoneNumberId} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold">{phone.displayPhone || phone.display_phone_number || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{phone.displayName || phone.display_name || 'WhatsApp Business'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          phone.qualityRating === 'GREEN' ? 'bg-green-100 text-green-800' :
                          phone.qualityRating === 'YELLOW' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {phone.qualityRating || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          phone.verificationStatus === 'VERIFIED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {phone.verificationStatus || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle size={16} />
                          Connected
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleConnect}
                variant="outline"
              >
                Connect Another Number
              </Button>
              <Button 
                onClick={handleDisconnect}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <WhatsAppSettingsContent />
    </Suspense>
  )
}
