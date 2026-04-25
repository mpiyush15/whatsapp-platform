"use client"

import { MessageSquare, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorToast } from "@/components/ErrorToast"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/lib/auth"

declare global {
  interface Window {
    google?: any;
  }
}

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const SESSION_LOCK_KEY = 'replysys_session_lock_' + (typeof window !== 'undefined' ? Date.now() : '');

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const router = useRouter()
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 🔐 SESSION GUARD: Check if user is already logged in
  useEffect(() => {
    const checkAuthentication = async () => {
      // Small delay to ensure localStorage is fully loaded
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Check if user has valid session
      const isAuthenticated = authService.isAuthenticated()
      const token = localStorage.getItem("token")
      const user = localStorage.getItem("user")
      
      console.log('🔍 Auth Check on /login:', {
        isAuthenticated,
        hasToken: !!token,
        hasUser: !!user,
        tokenLength: token?.length || 0
      })
      
      if (isAuthenticated && token) {
        // User is already logged in - redirect to dashboard
        console.log("✅ Session found - Redirecting to dashboard")
        router.push("/dashboard")
        return
      } else {
        // User is not logged in - allow access to login page
        console.log("❌ No session found - Showing login page")
        setIsCheckingAuth(false)
      }
    }

    checkAuthentication()
  }, [router])

  // Load Google Sign-In script
  useEffect(() => {
    if (isCheckingAuth) return; // Don't load Google until auth check is done
    
    const loadGoogleScript = async () => {
      if (window.google) return;
      
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
            callback: handleGoogleSignIn,
          });

          // Render the Google Sign-In button
          const googleButtonDiv = document.getElementById('google-sign-in-button');
          if (googleButtonDiv) {
            window.google.accounts.id.renderButton(googleButtonDiv, {
              theme: 'outline',
              size: 'large',
              width: '100%',
            });
          }
        }
      };

      document.body.appendChild(script);
    };

    loadGoogleScript();
  }, [isCheckingAuth]);

  const handleGoogleSignIn = async (response: any) => {
    try {
      // Check for multiple sessions
      const existingSession = localStorage.getItem('replysys_session_lock');
      if (existingSession && existingSession !== SESSION_LOCK_KEY) {
        setError('⚠️ Another login session detected. Only one session per browser allowed.');
        setIsLoading(false);
        // Force logout of other session
        localStorage.clear();
        setTimeout(() => window.location.reload(), 1000);
        return;
      }

      setIsLoading(true);
      setError("");

      if (!response.credential) {
        throw new Error('No credential from Google');
      }

      // Send to backend
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/google/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          credential: response.credential
        })
      });

      const data = await res.json();

      if (data.success && data.token) {
        // Set session lock
        localStorage.setItem('replysys_session_lock', SESSION_LOCK_KEY);
        localStorage.setItem('replysys_last_activity', Date.now().toString());
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        
        console.log('✅ Google login successful:', data.user.email);
        router.push('/dashboard');
      } else {
        throw new Error(data.message || 'Google login failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Google login failed';
      console.error('Google login error:', errorMsg);
      setError(errorMsg);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check for multiple sessions
    const existingSession = localStorage.getItem('replysys_session_lock');
    if (existingSession && existingSession !== SESSION_LOCK_KEY) {
      setError('⚠️ Another login session detected. Only one session per browser allowed.');
      // Force logout of other session
      localStorage.clear();
      setTimeout(() => window.location.reload(), 1000);
      return;
    }

    setIsLoading(true)
    setError("")

    const result = await authService.login(email, password)
    
    if (result.success) {
      // Set session lock and activity timer
      localStorage.setItem('replysys_session_lock', SESSION_LOCK_KEY);
      localStorage.setItem('replysys_last_activity', Date.now().toString());
      router.push("/dashboard")
    } else {
      setError(result.error || "Login failed")
      setIsLoading(false)
    }
  }

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <MessageSquare className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-gray-600 font-medium">Checking your session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-10 w-10 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Reply<span className="text-green-600">sys</span>
              </span>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back
              </h1>
              <p className="text-gray-600">
                Sign in to your account to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-green-600 focus:ring-green-600 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>
                <Link href="/auth/forgot-password" className="text-sm text-green-600 hover:text-green-700 font-medium">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400" 
                size="lg" 
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
                {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>
            </form>

            {/* Divider */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <div id="google-sign-in-button" className="mt-6 w-full"></div>
            </div>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link href="/signup" className="font-medium text-green-600 hover:text-green-700">
                  Sign up for free
                </Link>
              </p>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-4">Trusted by 1000+ businesses worldwide</p>
            <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                SSL Secured
              </div>
              <div className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                GDPR Compliant
              </div>
              <div className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                99.9% Uptime
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
