"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Mail, Lock } from "lucide-react"
import Navbar from "@/components/Navbar"
import { login } from "@/lib/auth"
import { getCurrentDomain, isAppDomain, isPublicDomain, redirectToDomain } from "@/lib/domain"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await login(email, password)
      if (result.success) {
        setSuccess(true)
        
        // Get JWT token to check user type
        const token = localStorage.getItem('token')
        let redirectPath = "/dashboard"
        const currentDomain = getCurrentDomain()
        
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            console.log('Login payload:', payload)
            
            // Redirect based on account type
            if (payload.type === 'internal' && payload.role === 'superadmin') {
              redirectPath = "/dashboard/superadmin"
              // Admin goes to admin.domain
              setTimeout(() => {
                redirectToDomain('admin', redirectPath)
              }, 1500)
            } else if (payload.type === 'client' || payload.type === 'agency') {
              // Phase 3: Both client and agency use new project-based dashboard
              redirectPath = "/dashboard"
              // Clients go to app.domain
              if (isAppDomain()) {
                // Already on app.domain, just push
                setTimeout(() => {
                  router.push(redirectPath)
                }, 1500)
              } else {
                // On public domain (replysys.com) or localhost → redirect to app.domain
                setTimeout(() => {
                  redirectToDomain('app', redirectPath)
                }, 1500)
              }
            }
          } catch (e) {
            console.error('Error parsing token:', e)
            // Fallback redirect
            setTimeout(() => {
              router.push(redirectPath)
            }, 1500)
          }
        } else {
          // No token, fallback redirect
          setTimeout(() => {
            router.push(redirectPath)
          }, 1500)
        }
      } else {
        setError(result.error || "Login failed")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Successful!</h2>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <Navbar />
      
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                <Lock className="text-green-600" size={24} />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
              <p className="text-gray-600 mt-2">Sign in to your account</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <span className="text-red-600 mt-0.5">⚠️</span>
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? "Signing in..." : "Sign In"} {!loading && <ArrowRight size={18} />}
              </button>

              <div className="text-right">
                <Link href="/auth/forgot-password" className="text-sm text-green-600 hover:text-green-700 font-medium">
                  Forgot password?
                </Link>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
                </div>
              </div>

              {/* Sign Up Link */}
              <Link
                href="/auth/register"
                className="w-full border-2 border-green-600 text-green-600 hover:bg-green-50 font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                Create Account <ArrowRight size={18} />
              </Link>
            </form>

            {/* Footer Note */}
            <p className="text-center text-gray-500 text-xs mt-6">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
