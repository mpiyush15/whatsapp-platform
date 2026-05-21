'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  Package,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  fetchAccountTemplates,
  fetchHealthcareTemplatePresets,
  fetchProjectWhatsAppStatus,
  installHealthcareTemplatePack,
  syncTemplatesFromMeta,
  type ProjectWhatsAppStatus,
} from '@/lib/healthcareWhatsAppApi'
import {
  mergePackWithTemplates,
  packReadiness,
  type HealthcareTemplatePreset,
} from '@/lib/healthcareWhatsAppPack'

type HealthcareWhatsAppPackPanelProps = {
  projectId: string
  /** clinic-setup shows automation toggles slot; templates page is pack-focused */
  variant?: 'clinic-setup' | 'templates'
  automationToggles?: React.ReactNode
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
        <Clock3 className="h-3 w-3" />
        Pending
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-800">
        <XCircle className="h-3 w-3" />
        Rejected
      </span>
    )
  }
  if (status === 'draft') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
        <Clock3 className="h-3 w-3" />
        Draft
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-800">
      <AlertCircle className="h-3 w-3" />
      Not installed
    </span>
  )
}

export default function HealthcareWhatsAppPackPanel({
  projectId,
  variant = 'clinic-setup',
  automationToggles,
}: HealthcareWhatsAppPackPanelProps) {
  const [presets, setPresets] = useState<HealthcareTemplatePreset[]>([])
  const [templates, setTemplates] = useState<{ name: string; status: string; _id?: string; rejectedReason?: string }[]>([])
  const [waStatus, setWaStatus] = useState<ProjectWhatsAppStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [presetList, accountTemplates, phone] = await Promise.all([
        fetchHealthcareTemplatePresets(projectId),
        fetchAccountTemplates(projectId),
        fetchProjectWhatsAppStatus(projectId),
      ])
      setPresets(presetList)
      setTemplates(accountTemplates)
      setWaStatus(phone)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load WhatsApp pack status')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const rows = useMemo(() => mergePackWithTemplates(presets, templates), [presets, templates])
  const readiness = useMemo(() => packReadiness(rows), [rows])

  const handleInstallPack = async () => {
    try {
      setInstalling(true)
      setMessage(null)
      setError(null)
      const result = await installHealthcareTemplatePack(projectId)
      if (result.created.length > 0) {
        setMessage(`Created ${result.created.length} draft template(s). Submit each in Templates to Meta for approval.`)
      } else if (result.skipped.length === readiness.total) {
        setMessage('All pack templates already exist on your account. Submit drafts or sync approval status.')
      }
      if (result.errors.length > 0) {
        setError(result.errors.map((e) => `${e.name}: ${e.message}`).join(' · '))
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Install failed')
    } finally {
      setInstalling(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      setError(null)
      await syncTemplatesFromMeta(projectId)
      setMessage('Synced template status from Meta.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const templatesHref = `/projects/${projectId}/templates`
  const whatsappSetupHref = `/projects/${projectId}/settings/whatsapp-setup`

  return (
    <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-white shadow-sm">
      <div className="border-b border-emerald-100/80 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#128c7e] text-white shadow-sm">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Healthcare WhatsApp pack</h3>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Install utility templates wired to clinic triggers. Approve on your Meta business account—automations send
                when templates are approved.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleInstallPack}
              disabled={installing || loading}
              className="gap-1.5 bg-[#128c7e] hover:bg-[#0f7a6e]"
            >
              {installing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
              Install pack
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200/80 bg-white px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">WhatsApp number</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {waStatus?.whatsappConnected ? (
                waStatus.displayNumber || 'Connected'
              ) : (
                <Link href={whatsappSetupHref} className="text-[#128c7e] hover:underline">
                  Connect in settings →
                </Link>
              )}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200/80 bg-white px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Templates approved</p>
            <p className="mt-1 text-sm font-medium tabular-nums text-slate-900">
              {readiness.approved} / {readiness.total}
              {readiness.ready ? (
                <span className="ml-2 text-emerald-600">Ready</span>
              ) : (
                <span className="ml-2 text-amber-600">In progress</span>
              )}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200/80 bg-white px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Triggers</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {readiness.ready && waStatus?.whatsappConnected ? (
                <span className="text-emerald-600">Can send</span>
              ) : (
                <span className="text-slate-600">Waiting setup</span>
              )}
            </p>
          </div>
        </div>

        {message && (
          <p className="mt-3 rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-900">{message}</p>
        )}
        {error && (
          <p className="mt-3 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-900">{error}</p>
        )}
      </div>

      {variant === 'clinic-setup' && automationToggles ? (
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">{automationToggles}</div>
      ) : null}

      <div className="px-4 py-4 sm:px-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pack templates & trigger map</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-1.5">
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Sync from Meta
            </Button>
            <Link
              href={templatesHref}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Open templates
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading pack…
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map(({ preset, status, existing }) => (
              <li
                key={preset.key}
                className="rounded-lg border border-slate-200/90 bg-white px-3 py-3 transition hover:border-slate-300"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{preset.name}</p>
                      <StatusBadge status={status} />
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-500">{preset.recommendedTemplateName}</p>
                    {preset.sampleMessage ? (
                      <p className="mt-2 line-clamp-2 text-xs text-slate-600">{preset.sampleMessage}</p>
                    ) : null}
                    {(preset.triggerEvents?.length ?? 0) > 0 ? (
                      <p className="mt-1.5 text-[10px] text-slate-400">
                        Triggers: {preset.triggerEvents.join(', ')}
                      </p>
                    ) : null}
                    {existing?.rejectedReason ? (
                      <p className="mt-1 text-[10px] text-rose-600">Meta: {existing.rejectedReason}</p>
                    ) : null}
                  </div>
                  {status === 'draft' || status === 'rejected' ? (
                    <Link
                      href={templatesHref}
                      className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Submit in Templates
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        <ol className="mt-4 list-decimal space-y-1 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
          <li>Connect WhatsApp business number (Settings → WhatsApp setup).</li>
          <li>Click <strong>Install pack</strong> to create draft templates on your account.</li>
          <li>In Templates, submit each draft to Meta and wait for approval.</li>
          <li>Click <strong>Sync from Meta</strong>—when all show Approved, triggers can send.</li>
        </ol>

        {variant === 'templates' && readiness.ready && waStatus?.whatsappConnected ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
            <Send className="h-4 w-4" />
            Pack ready — patient events and front desk actions will use these templates.
          </p>
        ) : null}
      </div>
    </div>
  )
}
