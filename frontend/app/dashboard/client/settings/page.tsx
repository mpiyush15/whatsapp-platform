"use client"

import { useState, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Phone, CheckCircle, AlertCircle } from "lucide-react"
import { authService } from "@/lib/auth"

// Type declaration for WhatsApp function on window
declare global {
  interface Window {
    launchWhatsAppSignup?: () => void
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
        console.log('✅ Embedded Signup FINISH event received:', { waba_id, phone_number_id })

        if (!waba_id || !phone_number_id) {
          console.error('❌ FINISH event missing waba_id or phone_number_id:', parsed)
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
        const data = await response.json()
        setConnectedPhones(data.phones || [])
        setError(null)
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
      
      console.log('🔗 Connecting WhatsApp:', { wabaId, phoneNumberId })
      
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
        const data = await response.json()
        console.log('✅ Phone connected successfully:', data)
        
        // Update UI with new phone
        if (data.phone) {
          setConnectedPhones([data.phone])
        }
      } else {
        const err = await response.json()
        console.error('❌ Connection failed:', err)
        setError(err.message || 'Failed to connect WhatsApp')
      }
    } catch (err) {
      console.error('❌ Error connecting WhatsApp:', err)
      setError('An error occurred while connecting WhatsApp')
    } finally {
      setConnecting(false)
    }
  }

  const handleConnect = () => {
    setConnecting(true)
    try {
      if (typeof window !== 'undefined' && typeof window.launchWhatsAppSignup === 'function') {
        console.log('🚀 Launching WhatsApp Embedded Signup...')
        window.launchWhatsAppSignup()
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
            <div className="space-y-3 mb-6">
              {connectedPhones.map((phone: any) => (
                <div key={phone.phoneNumberId} className="flex items-center gap-3 p-3 bg-green-50 rounded">
                  <CheckCircle size={20} className="text-green-600" />
                  <div>
                    <p className="font-semibold">{phone.displayPhone}</p>
                    <p className="text-sm text-gray-600">{phone.displayName}</p>
                  </div>
                </div>
              ))}
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

export default function WhatsAppSettings() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <WhatsAppSettingsContent />
    </Suspense>
  )
}
