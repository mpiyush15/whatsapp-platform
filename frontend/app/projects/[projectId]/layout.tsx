'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ProjectHeader from '@/components/ProjectHeader'
import { ProjectProvider, useProject } from '@/lib/context/ProjectContext'
import { LiveChatProvider } from '@/lib/context/LiveChatContext'
import { SettingsProvider } from '@/lib/context/SettingsContext'
import { authService } from '@/lib/auth'
import ProjectStaffRouteGate from '@/components/ProjectStaffRouteGate'
import {
  canOpenStaffWelcomePage,
  isHealthcareStaffSession,
  routeKeyFromProjectPathname,
  staffRouteKeyAllowed,
  staffRoutesForProject,
  staffWelcomePath,
} from '@/lib/healthcareStaffRoutes'

interface ProjectLayoutProps {
  children: ReactNode
}

// Inner layout — rendered inside ProjectProvider so useProject() works
function ProjectLayoutInner({ children, projectId }: { children: ReactNode; projectId: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { vertical } = useProject()
  const isLiveChatPage = pathname.includes('/live-chat')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const user = authService.getCurrentUser()

  const shouldHoldShellForRedirect = useMemo(() => {
    if (!user) return false
    if (!isHealthcareStaffSession(user)) return false

    const allowed = staffRoutesForProject(user, projectId)
    const currentKey = routeKeyFromProjectPathname(pathname, projectId)
    const canOpenHome = canOpenStaffWelcomePage(user, allowed)
    if (!canOpenHome) return false

    const base = `/projects/${projectId}`
    const atRoot = pathname === base || pathname === `${base}/`
    if (atRoot && !allowed.includes('home')) return true

    if (allowed.length === 0 || currentKey === 'staff') return false
    if (currentKey && staffRouteKeyAllowed(currentKey, allowed)) return false

    return true
  }, [user, projectId, pathname])

  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!shouldHoldShellForRedirect) return
    router.replace(staffWelcomePath(projectId))
  }, [shouldHoldShellForRedirect, projectId, router])

  if (shouldHoldShellForRedirect) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-8 text-sm text-gray-500">
        Opening your home…
      </div>
    )
  }

  return isLiveChatPage ? (
    <LiveChatProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          projectId={projectId}
          vertical={vertical}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <ProjectHeader projectId={projectId} onMenuClick={() => setMobileSidebarOpen(true)} />
          <main className="flex-1 overflow-auto">
            <ProjectStaffRouteGate projectId={projectId}>{children}</ProjectStaffRouteGate>
          </main>
        </div>
      </div>
    </LiveChatProvider>
  ) : (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        projectId={projectId}
        vertical={vertical}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectHeader projectId={projectId} onMenuClick={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-auto">
          <ProjectStaffRouteGate projectId={projectId}>{children}</ProjectStaffRouteGate>
        </main>
      </div>
    </div>
  )
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  useEffect(() => {
    const user = authService.getCurrentUser()
    if (!user) {
      router.replace('/auth/login')
      return
    }
    if (user.type === 'internal' && user.role === 'superadmin') {
      router.replace('/dashboard/superadmin')
    }
  }, [router])

  return (
    <ProjectProvider projectId={projectId}>
      <SettingsProvider>
        <ProjectLayoutInner projectId={projectId}>{children}</ProjectLayoutInner>
      </SettingsProvider>
    </ProjectProvider>
  )
}
