"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { CheckCircle2, Copy, Loader2, Save } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"

type ProjectPayload = {
  name?: string
  settings?: {
    webhookUrl?: string
    webhookSecret?: string
    [key: string]: unknown
  }
}

function getHeaders() {
  const token = localStorage.getItem("authToken") || localStorage.getItem("token")
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

export default function ProjectWebhooksPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState<ProjectPayload | null>(null)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const inboundWebhookUrl = `${API_URL.replace("/api", "")}/api/webhooks/whatsapp`

  const loadProject = async () => {
    try {
      setLoading(true)
      setStatus(null)
      const response = await fetch(`${API_URL}/projects/${projectId}?projectId=${projectId}`, {
        headers: getHeaders(),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.message || "Failed to fetch project")
      }

      const item: ProjectPayload = payload?.data || {}
      setProject(item)
      setWebhookUrl(item?.settings?.webhookUrl || "")
      setWebhookSecret(item?.settings?.webhookSecret || "")
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to load project",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) loadProject()
  }, [projectId])

  const saveWebhooks = async () => {
    try {
      setSaving(true)
      setStatus(null)
      const settings = {
        ...(project?.settings || {}),
        webhookUrl: webhookUrl.trim() || null,
        webhookSecret: webhookSecret.trim() || "",
      }

      const response = await fetch(`${API_URL}/projects/${projectId}?projectId=${projectId}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ settings }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.message || "Failed to save webhook settings")
      }

      setProject(payload?.data || project)
      setStatus({ type: "success", text: "Webhook settings saved" })
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save webhook settings",
      })
    } finally {
      setSaving(false)
    }
  }

  const copyInboundUrl = async () => {
    await navigator.clipboard.writeText(inboundWebhookUrl)
    setStatus({ type: "success", text: "Inbound webhook URL copied" })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600">
          Loading webhook settings...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Project Webhooks</h1>
            <p className="mt-1 text-sm text-gray-600">Configure outbound delivery endpoint and inbound WhatsApp callback reference.</p>
          </div>
          <Link
            href={`/projects/${projectId}/settings/api-keys`}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            API Keys
          </Link>
        </div>

        {status && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              status.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {status.text}
          </div>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-base font-semibold text-gray-900">Outbound event delivery</h2>
          <p className="mt-1 text-sm text-gray-600">Replysys will POST event payloads to this URL using your shared secret.</p>

          <div className="mt-4 grid grid-cols-1 gap-4">
            <label className="text-sm font-medium text-gray-700">
              Endpoint URL
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-domain.com/replysys/webhook"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Shared Secret
              <input
                type="text"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="whsec_..."
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            onClick={saveWebhooks}
            disabled={saving}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save webhook settings"}
          </button>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-base font-semibold text-gray-900">Inbound WhatsApp webhook reference</h2>
          <p className="mt-1 text-sm text-gray-600">Use this URL in Meta app setup for receiving delivery, status, and message callbacks.</p>

          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <code className="flex-1 break-all text-xs text-gray-800">{inboundWebhookUrl}</code>
            <button
              onClick={copyInboundUrl}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-800">
            <div className="inline-flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Recommended event subscriptions
            </div>
            <p className="mt-1">messages, message_status, template_status, phone_number_name_update</p>
          </div>
        </section>
      </div>
    </div>
  )
}
