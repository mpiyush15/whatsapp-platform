"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Loader2, FolderOpen } from "lucide-react"
import { authService } from "@/lib/auth"

interface Project {
  id?: string;
  projectId: string;
  name: string;
  businessCategory?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
}

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError('')

      const user = authService.getCurrentUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      if (user.type === 'internal' && user.role === 'superadmin') {
        router.replace('/dashboard/superadmin')
        return
      }

      const token = authService.getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'
      const response = await fetch(`${apiUrl}/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401) {
        await authService.logout()
        router.replace('/auth/login?session=expired')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to load projects')
      }

      const data = await response.json()
      const projectList = data.data || []
      setProjects(projectList)

      // ✅ CRITICAL: If only 1 project, auto-redirect with projectId
      if (projectList.length === 1) {
        const projectId = projectList[0].projectId || projectList[0].id
        router.push(`/projects/${projectId}`)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load projects'
      setError(errorMsg)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-teal-600" />
          <p className="text-gray-600 font-medium">Loading your projects...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-xl">⚠️</span>
            </div>
            <p className="text-red-600 font-semibold mb-2">Error Loading Projects</p>
            <p className="text-gray-600 text-sm mb-6">{error}</p>
            <button
              onClick={fetchProjects}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white py-2 rounded-lg font-medium transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Projects</h1>
              <p className="text-gray-600 mt-2">Select a project to manage your WhatsApp business</p>
            </div>
            <Link
              href="/projects/new"
              className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              <Plus size={20} />
              Create Project
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {projects.length === 0 ? (
          // Empty State
          <div className="flex items-center justify-center min-h-96">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 max-w-md w-full text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8 text-teal-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Projects Yet</h2>
              <p className="text-gray-600 mb-6">Create your first project to get started with WhatsApp Business</p>
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-6 py-3 rounded-lg font-medium transition"
              >
                <Plus size={20} />
                Create Your First Project
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {projects.map(project => {
                const projectId = project.projectId || project.id
                return (
                  <Link
                    key={projectId}
                    href={`/projects/${projectId}`}
                    className="bg-white rounded-xl shadow-md hover:shadow-xl border border-gray-200 p-6 transition-all duration-200 hover:scale-105 cursor-pointer group"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-teal-700 transition-colors">
                          {project.name}
                        </h3>
                        {project.businessCategory && (
                          <p className="text-sm text-gray-600 mt-1 capitalize">
                            {project.businessCategory}
                          </p>
                        )}
                      </div>
                      <span
                        className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          project.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {project.status === 'active' ? '🟢 Active' : '⚪ Inactive'}
                      </span>
                    </div>

                    {/* Card Footer */}
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        {project.createdAt && (
                          <p className="text-xs text-gray-500">
                            Created {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-teal-600 font-medium group-hover:translate-x-1 transition-transform">
                        Open
                        <span>→</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Create New Project CTA */}
            {projects.length > 0 && (
              <div className="text-center pt-8 border-t border-gray-200">
                <p className="text-gray-600 mb-4">Need another project?</p>
                <Link
                  href="/projects/new"
                  className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-6 py-3 rounded-lg font-medium transition"
                >
                  <Plus size={20} />
                  Create New Project
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
