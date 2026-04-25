'use client'

import { useProject } from '@/lib/context/ProjectContext'
import { Loader2, Phone, CheckCircle, AlertCircle, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'

interface ConnectedPhone {
  phoneNumberId: string
  displayPhone?: string
  display_phone_number?: string
  displayName?: string
  display_name?: string
  qualityRating?: string
  verificationStatus?: string
}

export default function ProjectDashboard() {
  const { project, loading, error } = useProject()
  const params = useParams()
  const projectId = params.projectId as string
  
  const [connectedPhones, setConnectedPhones] = useState<ConnectedPhone[]>([])
  const [phonesLoading, setPhoneLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (projectId) {
      fetchConnectedPhones()
    }
  }, [projectId])

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken') || localStorage.getItem('token')
    }
    return null
  }

  const getHeaders = () => {
    const token = getAuthToken()
    return {
      'Authorization': `Bearer ${token}`
    }
  }

  const fetchConnectedPhones = async () => {
    try {
      setPhoneLoading(true)
      const response = await fetch(
        `${API_URL}/integrations/whatsapp/phones`,
        { headers: getHeaders() }
      )

      if (response.ok) {
        const result = await response.json()
        console.log('Phone numbers API response:', result)
        
        // The API returns { phones: [...] } - NOT phoneNumbers!
        const phones = result.phones || result.phoneNumbers || result.data?.phones || result.data?.phoneNumbers || []
        console.log('Connected phones found:', phones.length, phones)
        setConnectedPhones(phones)
      } else {
        console.log('API error - Status:', response.status)
        const errorData = await response.json()
        console.log('Error details:', errorData)
      }
    } catch (err) {
      console.error('Error fetching phones:', err)
    } finally {
      setPhoneLoading(false)
    }
  }

  const connectWhatsAppWithData = async (wabaId: string, phoneNumberId: string) => {
    try {
      setConnecting(true)
      const response = await fetch(
        `${API_URL}/integrations/whatsapp/connect?projectId=${projectId}`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            waba_id: wabaId,
            phone_number_id: phoneNumberId
          })
        }
      )

      if (response.ok) {
        const result = await response.json()
        console.log('Connection successful:', result)
        alert(`✅ WhatsApp connected!`)
        // Refresh the phone list after successful connection
        setTimeout(() => fetchConnectedPhones(), 500)
      } else {
        const err = await response.json()
        console.error('Connection failed:', err)
        alert(err.error || 'Failed to connect WhatsApp')
      }
    } catch (err) {
      console.error('Error connecting WhatsApp:', err)
      alert('An error occurred while connecting WhatsApp')
    } finally {
      setConnecting(false)
    }
  }

  const handleConnect = () => {
    setConnecting(true)
    try {
      if (typeof window !== 'undefined' && typeof window.launchWhatsAppSignup === 'function') {
        window.launchWhatsAppSignup()
      } else {
        setConnecting(false)
      }
    } catch (err) {
      console.error('Error launching signup:', err)
      setConnecting(false)
    }
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let parsed: any = event.data
      if (typeof event.data === 'string') {
        try {
          parsed = JSON.parse(event.data)
        } catch {
          return
        }
      }

      if (parsed?.type === 'WA_EMBEDDED_SIGNUP' && parsed?.event === 'FINISH') {
        const { waba_id, phone_number_id } = parsed.data || {}
        if (waba_id && phone_number_id) {
          connectWhatsAppWithData(waba_id, phone_number_id)
        } else {
          fetchConnectedPhones()
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [projectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to {project?.name}!</h1>
          <p className="text-gray-600 mt-2">
            Category: <span className="font-semibold capitalize">{project?.businessCategory}</span>
          </p>
        </div>

        {/* Main Content Grid - 12 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Main Content (8 columns) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Getting Started */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Getting Started</h2>
              <div className="space-y-3">
                <p className="text-gray-600">📱 Go to <span className="font-semibold">Live Chat</span> to start conversations with customers</p>
                <p className="text-gray-600">👥 Visit <span className="font-semibold">Contacts</span> to manage your customer list</p>
                <p className="text-gray-600">⚙️ Check <span className="font-semibold">Settings</span> to configure WhatsApp integration</p>
                <p className="text-gray-600">📊 Monitor <span className="font-semibold">Analytics</span> to track performance metrics</p>
              </div>
            </div>
          </div>

          {/* Right Column - WhatsApp Connection (4 columns) */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">WhatsApp Setup</h3>
              </div>

              {phonesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                </div>
              ) : connectedPhones.length === 0 ? (
                <div className="space-y-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Steps to Connect</h4>
                    <ol className="space-y-2 text-sm text-gray-700">
                      <li className="flex gap-2">
                        <span className="font-bold text-green-600">1.</span>
                        <span>Click "Connect Now" button</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-green-600">2.</span>
                        <span>Sign in with WhatsApp Business Account</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-green-600">3.</span>
                        <span>Grant necessary permissions</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-green-600">4.</span>
                        <span>Your numbers will appear here</span>
                      </li>
                    </ol>
                  </div>
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {connecting ? 'Connecting...' : 'Connect Now'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-700">Connected</span>
                    </div>
                    <p className="text-sm text-green-600">{connectedPhones.length} WhatsApp number(s) active</p>
                  </div>

                  {/* Connected Numbers */}
                  <div className="space-y-3">
                    {connectedPhones.map((phone) => (
                      <div key={phone.phoneNumberId} className="border border-gray-200 rounded-lg p-3">
                        <div className="font-mono text-sm font-semibold text-gray-900 mb-2">
                          {phone.displayPhone || phone.display_phone_number || 'N/A'}
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Name:</span>
                            <span className="font-medium text-gray-900">{phone.displayName || phone.display_name || 'WhatsApp'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Quality:</span>
                            <span className={`px-2 py-0.5 rounded text-white text-xs font-bold ${
                              phone.qualityRating === 'GREEN' ? 'bg-green-600' :
                              phone.qualityRating === 'YELLOW' ? 'bg-yellow-600' :
                              'bg-red-600'
                            }`}>
                              {phone.qualityRating || 'UNKNOWN'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Verification:</span>
                            <span className={`px-2 py-0.5 rounded text-white text-xs font-bold ${
                              phone.verificationStatus === 'VERIFIED' ? 'bg-blue-600' : 'bg-gray-600'
                            }`}>
                              {phone.verificationStatus || 'UNKNOWN'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="w-full px-4 py-2 border border-green-600 text-green-600 font-semibold rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                  >
                    Add Another Number
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
