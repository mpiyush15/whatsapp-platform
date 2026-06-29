'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, AlertCircle, Loader } from 'lucide-react'

export const dynamic = 'force-dynamic'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('loading') // loading, success, error
  const [error, setError] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    handleOAuthCallback()
  }, [])

  const handleOAuthCallback = async () => {
    try {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const errorFromMeta = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      console.log('🔄 OAuth callback received:', {
        code: code ? code.substring(0, 20) + '...' : null,
        state,
        error: errorFromMeta,
      })

      // Meta returned an error
      if (errorFromMeta) {
        const message = errorDescription || 'Unknown error'
        console.error('❌ Meta error:', message)
        setStatus('error')
        setError(`Meta error: ${message}`)
        return
      }

      // No code returned
      if (!code) {
        console.error('❌ No authorization code received')
        setStatus('error')
        setError('No authorization code received from Meta')
        return
      }

      // Validate state (optional but recommended)
      const storedState = localStorage.getItem('oauth_state')
      if (storedState && state !== storedState) {
        console.error('❌ State mismatch - possible CSRF attack')
        setStatus('error')
        setError('State validation failed - possible CSRF attack')
        localStorage.removeItem('oauth_state')
        return
      }
      localStorage.removeItem('oauth_state')

      // Get auth token from localStorage
      const authToken = localStorage.getItem('authToken')
      if (!authToken) {
        console.error('❌ Not authenticated - missing auth token')
        setStatus('error')
        setError('Not authenticated. Please sign in again.')
        return
      }

      // Exchange code for access token on backend
      console.log('🔐 Exchanging code for access token...')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'}/api/integrations/whatsapp/oauth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ code }),
        }
      )

      // Handle non-JSON responses safely
      const contentType = response.headers.get('content-type')
      let data
      
      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        console.error('❌ Non-JSON response from backend:', text)
        setStatus('error')
        setError('Invalid response from server. Please check backend logs.')
        return
      }

      if (!response.ok) {
        console.error('❌ Backend error:', data)
        setStatus('error')
        setError(data.message || data.error || 'Failed to connect WhatsApp')
        return
      }

      console.log('✅ WhatsApp connected successfully:', data)

      // Show success
      if (data.phones && data.phones.length > 0) {
        setPhone(data.phones[0].displayPhone || data.phones[0].phoneNumberId)
      }
      setStatus('success')

      // Redirect after 3 seconds
      setTimeout(() => {
        const returnTo = localStorage.getItem('oauth_return_to') || '/dashboard'
        localStorage.removeItem('oauth_return_to')
        console.log('🚀 Redirecting to:', returnTo)
        router.push(returnTo)
      }, 3000)
    } catch (err) {
      console.error('🔥 OAuth callback error:', err)
      setStatus('error')
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {status === 'loading' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Loader className="h-12 w-12 text-green-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Connecting WhatsApp...
            </h2>
            <p className="text-gray-600">
              We're setting up your WhatsApp Business Account
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ✅ All set!
            </h2>
            <p className="text-gray-600 mb-4">
              WhatsApp connected successfully
            </p>
            {phone && (
              <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                <p className="text-sm text-green-700">
                  <strong>Phone:</strong> {phone}
                </p>
              </div>
            )}
            <p className="text-sm text-gray-500">
              Redirecting to dashboard in 3 seconds...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Connection failed
            </h2>
            <p className="text-red-600 mb-4">{error}</p>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-6 text-left text-sm">
              <p className="font-semibold text-yellow-800 mb-1">Troubleshooting:</p>
              <ul className="text-yellow-700 space-y-1">
                <li>✓ Check your Meta Business Account is verified</li>
                <li>✓ Ensure WhatsApp Business Account is created</li>
                <li>✓ Verify you have a phone number added to your WABA</li>
              </ul>
            </div>

            <button
              onClick={() => window.location.href = '/onboarding/whatsapp'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
            >
              Try again
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full mt-2 text-gray-600 hover:text-gray-900 font-medium py-2"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function WhatsAppCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallbackContent />
    </Suspense>
  )
}
