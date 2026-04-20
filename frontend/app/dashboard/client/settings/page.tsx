"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Phone, CheckCircle } from "lucide-react"
import { authService } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

export default function WhatsAppSettings() {
  const [connectedPhones, setConnectedPhones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    fetchConnectedPhones()
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
      }
    } catch (err) {
      console.error("Error fetching phones:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = () => {
    setConnecting(true)
    try {
      if (typeof window !== 'undefined' && typeof window.launchWhatsAppSignup === 'function') {
        window.launchWhatsAppSignup()
      } else {
        alert('Facebook SDK not loaded yet. Please refresh and try again.')
        setConnecting(false)
      }
    } catch (err) {
      console.error('Error launching OAuth:', err)
      alert('Failed to launch WhatsApp connection')
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
    } catch (err) {
      console.error('Error disconnecting:', err)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">WhatsApp Settings</h1>
      <p className="text-gray-600 mb-8">Connect and manage your WhatsApp Business numbers</p>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Phone size={24} />
          <h2 className="text-xl font-semibold">WhatsApp Business Account</h2>
        </div>

        {connectedPhones.length === 0 ? (
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
                Add Another Number
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
