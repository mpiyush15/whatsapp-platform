'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MessageSquare, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { authService } from '@/lib/auth'
import { redirectToDomain } from '@/lib/domain'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const currentUser = authService.getCurrentUser()
      setUser(currentUser)
    } catch (e) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const getDashboardLink = () => {
    if (!user) return '/dashboard'
    
    if (user.type === 'internal') {
      return '/dashboard/superadmin'
    } else if (user.type === 'client' && user.accountId === '2600000') {
      return '/dashboard/company'
    }
    return '/dashboard/client'
  }

  return (
    <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="hover:opacity-80 transition">
            <span className="text-4xl font-extrabold text-black lowercase">
              replysys
            </span>
          </Link>

          {/* Links - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm text-gray-600 hover:text-green-600 transition">
              Home
            </Link>
            <Link href="/#features" className="text-sm text-gray-600 hover:text-green-600 transition">
              Features
            </Link>
            <Link href="/solutions" className="text-sm text-gray-600 hover:text-green-600 transition">
              Solutions
            </Link>
            <Link href="/pricing" className="text-sm text-gray-600 hover:text-green-600 transition">
              Pricing
            </Link>
            <Link href="/about" className="text-sm text-gray-600 hover:text-green-600 transition">
              About
            </Link>
            
            {user ? (
              <Link href={getDashboardLink()}>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => redirectToDomain('app', '/auth/login')}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  Login
                </Button>
                <Link href="/auth/register">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                    Start Free
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-600" />
            ) : (
              <Menu className="h-6 w-6 text-gray-600" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-200 bg-white">
            <div className="flex flex-col gap-4 pt-4">
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-green-600 transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/#features"
                className="text-sm text-gray-600 hover:text-green-600 transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="/solutions"
                className="text-sm text-gray-600 hover:text-green-600 transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Solutions
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-gray-600 hover:text-green-600 transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="text-sm text-gray-600 hover:text-green-600 transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <div className="pt-2 border-t border-gray-200 flex flex-col gap-2">
                {user ? (
                  <Link href={getDashboardLink()} onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        redirectToDomain('app', '/auth/login')
                      }}
                    >
                      Login
                    </Button>
                    <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                        Start Free
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
