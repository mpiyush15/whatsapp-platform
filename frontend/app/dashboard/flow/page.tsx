"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FolderOpen, Loader2 } from "lucide-react"
import { authService } from "@/lib/auth"

interface ProjectRecord {
  id?: string
  projectId: string
  name: string
}

export default function DashboardFlowRedirectPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true)
        setError("")
        const token = authService.getToken()
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"
        const response = await fetch(`${apiUrl}/projects`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || payload?.message || "Failed to load projects")
        }

        const list = Array.isArray(payload?.data) ? payload.data : []
        setProjects(list)

        if (list.length === 1) {
          const targetId = list[0].projectId || list[0].id
          router.replace(`/projects/${targetId}/flow`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load projects")
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-green-600" />
          <p className="mt-3 text-sm text-slate-600">Loading projects for Flow Builder...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Choose a project for Flow Builder</h1>
        <p className="mt-1 text-sm text-slate-600">Visual flows are project-scoped. Select which project you want to edit.</p>

        {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {projects.map((project) => {
            const targetId = project.projectId || project.id
            return (
              <Link
                key={targetId}
                href={`/projects/${targetId}/flow`}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-green-300 hover:bg-green-50"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-100 p-2 text-green-700">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{project.name}</div>
                    <div className="text-xs text-slate-500">{targetId}</div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
