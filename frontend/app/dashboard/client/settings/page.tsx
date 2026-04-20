"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Phone, CheckCircle, XCircle, Loader } from "lucide-react"
import { authService } from "@/lib/auth"

interface Phone {
  phoneNumberId: string
  displayPhone: string
  displayName: string
  qualityRating: string
}

interface ConnectedPhone extends Phone {
  _id: string
  isActive: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

export default function WhatsAppSettings() {
  const [connectedPhones, setConnectedPhones] = useState<ConnectedPhone[]>([])
  const [availablePhones, setAvailablePhones] = useState<Phone[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [error, setError] = useState("")
  const [showPhonePicker, setShowPhonePicker] = useState(false)

  useEffect(() => {
    // Handle incoming oauth_code from callback
    const params = new URLSearchParams(window.location.search)
    const code = params.get('oauth_code')
    
    if (code) {
      exchangeOAuthCode(code)
      // Clean URL after extracting code
      window.history.replaceState({}, document.title, window.location.pathname)
    } else {
      fetchConnectedPhones()
    }
  }, [])

  const fetchConnectedPhones = async () => {
    try {
      const token = authService.getToken()
      const response = await fetch(`${API_URL}/integrations/whatsapp/phones`, {
        headers: { 'Authorization': `Bearer ${token}` }
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

  const exchangeOAuthCode = async (code: string) => {
    try {
      setConnecting(true)
      setError("")
      
      const token = authService.getToken()
      const response = await fetch(`${API_URL}/integrations/whatsapp/exchange`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Phones fetched:', data.phones)
        setAvailablePhones(data.phones)
        setShowPhonePicker(true)
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to exchange code")
        fetchConnectedPhones() // Fallback to fetch existing phones
      }
    } catch (err) {
      console.error("Error exchanging code:", err)
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      fetchConnectedPhones() // Fallback to fetch existing phones
    } finally {
      setConnecting(false)
    }
  }

  const handleConnect = () => {
    try {
      setConnecting(true)
      setError("")

      if (typeof (window as any).launchWhatsAppSignup === 'undefined') {
        setError('Facebook SDK not loaded. Please refresh the page.')
        setConnecting(false)
        return
      }

      // Listen for authorization callback
      const originalCallback = (window as any).fbLoginCallback
      (window as any).fbLoginCallback = function (response: any) {
        console.log('✅ Authorization code received:', response?.authResponse?.code)
        
        if (response?.authResponse?.code) {
          const code = response.authResponse.code
          
          // Exchange code for token (async operation)
          const exchangeCode = async () => {
            try {
              const token = authService.getToken()
              const exchangeResponse = await fetch(`${API_URL}/integrations/whatsapp/exchange`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
              })

              if (exchangeResponse.ok) {
                const data = await exchangeResponse.json()
                console.log('✅ Phones fetched:', data.phones)
                setAvailablePhones(data.phones)
                setShowPhonePicker(true)
                setError("")
              } else {
                const errorData = await exchangeResponse.json()
                setError(errorData.message || 'Failed to exchange code')
              }
            } catch (err) {
              setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
            } finally {
              setConnecting(false)
            }
          }
          
          exchangeCode()
        }

        if (originalCallback) originalCallback.call(this, response)
      }

      // Call the function
      ;(window as any).launchWhatsAppSignup()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect")
      setConnecting(false)
    }
  }

  const handleSelectPhone = async (phone: Phone) => {
    try {
      setSelecting(true)
      const token = authService.getToken()
      
      const response = await fetch(`${API_URL}/integrations/whatsapp/select-phone`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumberId: phone.phoneNumberId,
          displayPhone: phone.displayPhone,
          displayName: phone.displayName
        })
      })

      if (response.ok) {
        console.log('✅ Phone selected and saved')
        setShowPhonePicker(false)
        setAvailablePhones([])
        await fetchConnectedPhones()
        setError("")
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to select phone')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to select phone")
    } finally {
      setSelecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm("Disconnect WhatsApp?")) return
    
    try {
      const token = authService.getToken()
      await fetch(`${API_URL}/integrations/whatsapp/disconnect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      setConnectedPhones([])
      setError("")
    } catch (err) {
      setError("Failed to disconnect")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">WhatsApp Settings</h1>
      <p className="text-gray-600 mb-8">Connect and manage your WhatsApp Business numbers</p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Phone Picker Modal */}
      {showPhonePicker && availablePhones.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Select Phone Number</h2>
            <div className="space-y-3 mb-6">
              {availablePhones.map((phone) => (
                <button
                  key={phone.phoneNumberId}
                  onClick={() => handleSelectPhone(phone)}
                  disabled={selecting}
                  className="w-full p-3 border rounded-lg hover:bg-blue-50 disabled:opacity-50 text-left"
                >
                  <div className="font-mono font-bold">{phone.displayPhone}</div>
                  <div className="text-sm text-gray-600">{phone.displayName}</div>
                  <div className="text-xs text-gray-500">Quality: {phone.qualityRating}</div>
                </button>
              ))}
            </div>
            <Button
              onClick={() => {
                setShowPhonePicker(false)
                setAvailablePhones([])
              }}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Phone className="w-5 h-5" />
            WhatsApp Business Account
          </h2>
          {connectedPhones.length > 0 ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <XCircle className="w-6 h-6 text-red-600" />
          )}
        </div>

        {connectedPhones.length > 0 ? (
          <>
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800 font-medium">✅ Connected</p>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-3">Connected Phone Numbers</h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 bg-gray-50">Phone Number</th>
                    <th className="text-left p-3 bg-gray-50">Name</th>
                    <th className="text-left p-3 bg-gray-50">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {connectedPhones.map((phone) => (
                    <tr key={phone._id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono font-bold">{phone.displayPhone}</td>
                      <td className="p-3">{phone.displayName}</td>
                      <td className="p-3">
                        {phone.isActive ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Active
                          </span>
                        ) : (
                          <span className="text-gray-500">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleConnect}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Phone className="w-4 h-4 mr-2" />
                Add Another Phone
              </Button>
              <Button
                onClick={handleDisconnect}
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
              <p className="text-gray-700">No WhatsApp Business Account connected</p>
              <p className="text-gray-600 text-sm mt-1">Connect your account to start sending messages</p>
            </div>

            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="bg-green-600 hover:bg-green-700"
            >
              {connecting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  Connect WhatsApp
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
