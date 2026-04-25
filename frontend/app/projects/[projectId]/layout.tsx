'use client'

import { useParams, usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import Sidebar from '@/components/Sidebar'
import ProjectHeader from '@/components/ProjectHeader'
import { ProjectProvider } from '@/lib/context/ProjectContext'
import { LiveChatProvider } from '@/lib/context/LiveChatContext'

interface ProjectLayoutProps {
  children: ReactNode
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const params = useParams()
  const pathname = usePathname()
  const projectId = params.projectId as string
  const isLiveChatPage = pathname.includes('/live-chat')

  return (
    <ProjectProvider projectId={projectId}>
      {isLiveChatPage ? (
        <LiveChatProvider>
          <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar projectId={projectId} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Project Header */}
              <ProjectHeader projectId={projectId} />

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
          <Sidebar projectId={projectId} />

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Project Header */}
            <ProjectHeader projectId={projectId} />

            {/* Page Content */}
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      )}
    </ProjectProvider>
  )
}
