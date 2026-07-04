'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ProjectHeader from '@/components/ProjectHeader'
import { ProjectProvider, useProject } from '@/lib/context/ProjectContext'
import { LiveChatProvider } from '@/lib/context/LiveChatContext'
import { SettingsProvider } from '@/lib/context/SettingsContext'
import { FlowBuilderProvider } from '@/lib/context/FlowBuilderContext'
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
  const { vertical: apiVertical } = useProject()
  const vertical = projectId === 'pixels-demo-123' ? 'pixels' : apiVertical
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
      <div 
        className="flex h-screen bg-[#F0F2F5] relative overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(#D1D5DB 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#F0F2F5] to-transparent pointer-events-none"></div>
        <div className="flex flex-col w-full h-full relative z-10">
          <ProjectHeader projectId={projectId} onMenuClick={() => setMobileSidebarOpen(true)} />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar
              projectId={projectId}
              vertical={vertical}
              mobileOpen={mobileSidebarOpen}
              onMobileClose={() => setMobileSidebarOpen(false)}
            />
            <main className="flex-1 overflow-auto">
              <ProjectStaffRouteGate projectId={projectId}>{children}</ProjectStaffRouteGate>
            </main>
          </div>
        </div>
      </div>
    </LiveChatProvider>
  ) : (
    <div 
      className="flex h-screen bg-[#F0F2F5] relative overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(#D1D5DB 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#F0F2F5] to-transparent pointer-events-none"></div>
      <div className="flex flex-col w-full h-full relative z-10">
        <FlowBuilderProvider>
          <ProjectHeader projectId={projectId} onMenuClick={() => setMobileSidebarOpen(true)} />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar
              projectId={projectId}
              vertical={vertical}
              mobileOpen={mobileSidebarOpen}
              onMobileClose={() => setMobileSidebarOpen(false)}
            />
            <main className="flex-1 overflow-auto">
              <ProjectStaffRouteGate projectId={projectId}>{children}</ProjectStaffRouteGate>
            </main>
          </div>
        </FlowBuilderProvider>
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
