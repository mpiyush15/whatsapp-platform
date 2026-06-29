'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader } from 'lucide-react'

export default function CommandCenterLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user?.role !== 'superadmin') {
      router.replace('/dashboard')
    }
  }, [user, isLoading, router])

  if (isLoading || user?.role !== 'superadmin') {
    return <div className="flex h-screen items-center justify-center"><Loader className="animate-spin" /></div>
  }

  return <>{children}</>
}