'use client'

import { useParams, usePathname } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ProjectHeader from '@/components/ProjectHeader'
import { ProjectProvider } from '@/lib/context/ProjectContext'
import { LiveChatProvider } from '@/lib/context/LiveChatContext'
import { SettingsProvider } from '@/lib/context/SettingsContext'

interface ProjectLayoutProps {
  children: ReactNode
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const params = useParams()
  const pathname = usePathname()
  const projectId = params.projectId as string
  const isLiveChatPage = pathname.includes('/live-chat')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname])

  return (
    <ProjectProvider projectId={projectId}>
      <SettingsProvider>
        {isLiveChatPage ? (
          <LiveChatProvider>
            <div className="flex h-screen bg-gray-50">
              {/* Sidebar */}
              <Sidebar
                projectId={projectId}
                mobileOpen={mobileSidebarOpen}
                onMobileClose={() => setMobileSidebarOpen(false)}
              />

              {/* Main Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Project Header */}
                <ProjectHeader
                  projectId={projectId}
                  onMenuClick={() => setMobileSidebarOpen(true)}
                />

                {/* Page Content */}
                <main className="flex-1 overflow-auto">
                  {children}
                </main>
              </div>
            </div>
          </LiveChatProvider>
        ) : (
          <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar
              projectId={projectId}
              mobileOpen={mobileSidebarOpen}
              onMobileClose={() => setMobileSidebarOpen(false)}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Project Header */}
              <ProjectHeader
                projectId={projectId}
                onMenuClick={() => setMobileSidebarOpen(true)}
              />

              {/* Page Content */}
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </div>
          </div>
        )}
      </SettingsProvider>
    </ProjectProvider>
  )
}
