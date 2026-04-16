"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { authService } from "@/lib/auth"

export default function DashboardRoot() {
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(true)

  useEffect(() => {
    const performRedirect = async () => {
      const user = authService.getCurrentUser()
      
      console.log('🔄 Dashboard redirect page - User:', user)

      if (!user) {
        console.log('❌ No user found, redirecting to login')
        await router.push("/login")
        return
      }

      // Determine redirect path
      let redirectPath = "/dashboard"
      
      if (user.type === 'internal' && user.role === 'superadmin') {
        redirectPath = "/dashboard/superadmin"
        console.log('✅ Superadmin redirect:', redirectPath)
      } else if (user.type === 'client' || user.type === 'agency') {
        redirectPath = "/dashboard/client"
        console.log('✅ Client/Agency redirect:', redirectPath)
      } else {
        console.log('⚠️ Unknown type, redirecting to login')
        await router.push("/login")
        return
      }

      // Perform redirect with replace (not push) to avoid back button issues
      console.log('🚀 Redirecting to:', redirectPath)
      setRedirecting(false)
      router.replace(redirectPath)
    }

    performRedirect()
  }, [router])

  if (!redirecting) {
    return null // Don't show anything during redirect
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Checking your session...</p>
      </div>
    </div>
  )
}
