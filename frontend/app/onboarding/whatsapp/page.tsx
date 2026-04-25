'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function WhatsAppOnboardingPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to Settings where user can connect WhatsApp via OAuth
    router.push('/dashboard/settings?tab=whatsapp')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to WhatsApp setup...</p>
      </div>
    </div>
  )
}
