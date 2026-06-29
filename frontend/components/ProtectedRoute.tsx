"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { authService, UserRole } from "@/lib/auth"
import { canAccessRoute } from "@/lib/rbac"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        router.push("/auth/login")
        return
      }

      const user = authService.getCurrentUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      // Check role-based access for the current route using RBAC
      if (!canAccessRoute(user.role as UserRole, pathname)) {
        // Redirect to dashboard home if user doesn't have permission
        console.warn(`❌ Access denied to ${pathname} for role ${user.role}`)
        router.push("/dashboard")
        return
      }

      setIsAuthorized(true)
      setIsLoading(false)
    }

    checkAuth()
  }, [router, pathname])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}
