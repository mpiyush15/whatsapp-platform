'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Project {
  projectId: string
  name: string
  businessCategory: string
  status: string
  isDefault: boolean
  vertical?: 'whatsapp' | 'healthcare' | 'ecommerce'
  settings?: {
    timezone?: string
    autoReplyEnabled?: boolean
  }
}

interface ProjectContextType {
  projectId: string
  project: Project | null
  vertical: 'whatsapp' | 'healthcare' | 'ecommerce'
  /** True only on first load (or projectId change) — not on background refresh */
  loading: boolean
  error: string | null
  refreshProject: () => Promise<void>
  switchProject: (newProjectId: string) => Promise<void>
}

function getAuthToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('authToken') || localStorage.getItem('token')
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

interface ProjectProviderProps {
  children: React.ReactNode
  projectId: string
}

export function ProjectProvider({ children, projectId }: ProjectProviderProps) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch project details (silent = background refresh without full-page loader)
  const fetchProject = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) {
        setLoading(true)
      }
      setError(null)

      const token = getAuthToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'
      const response = await fetch(`${apiUrl}/projects/${projectId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to load project: ${response.statusText}`)
      }

      const data = await response.json()
      setProject(data.data)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load project'
      setError(errorMsg)
      console.error('Error fetching project:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch project on mount and when projectId changes
  useEffect(() => {
    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  // Refresh project data without blocking the shell
  const refreshProject = async () => {
    await fetchProject({ silent: true })
  }

  // Switch to different project
  const switchProject = async (newProjectId: string) => {
    try {
      // Set new project as default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'
      const token = getAuthToken()
      const response = await fetch(`${apiUrl}/projects/${newProjectId}/set-default`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) {
        throw new Error('Failed to switch project')
      }

      // Navigate to new project
      router.push(`/projects/${newProjectId}`)
    } catch (err) {
      console.error('Error switching project:', err)
      setError('Failed to switch project')
    }
  }

  const value: ProjectContextType = {
    projectId,
    project,
    vertical: (project?.vertical ?? 'whatsapp') as 'whatsapp' | 'healthcare' | 'ecommerce',
    loading,
    error,
    refreshProject,
    switchProject
  }

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

/**
 * Hook to use project context
 * Must be used within ProjectProvider
 */
export function useProject() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProject must be used within ProjectProvider')
  }
  return context
}
