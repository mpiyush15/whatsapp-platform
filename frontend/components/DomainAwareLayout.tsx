'use client'

import { useDomain } from '@/lib/context/DomainContext'

export default function DomainAwareLayout({ children }: { children: React.ReactNode }) {
  const { mounted } = useDomain()

  // Show blank screen while detecting domain (prevents UI flash)
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
