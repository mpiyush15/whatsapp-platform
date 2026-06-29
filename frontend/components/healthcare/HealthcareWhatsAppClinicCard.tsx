'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ExternalLink, Loader2, Package } from 'lucide-react'
import {
  fetchAccountTemplates,
  fetchHealthcareTemplatePresets,
  fetchProjectWhatsAppStatus,
} from '@/lib/healthcareWhatsAppApi'
import { mergePackWithTemplates, packReadiness } from '@/lib/healthcareWhatsAppPack'

type HealthcareWhatsAppClinicCardProps = {
  projectId: string
  automationToggles: ReactNode
}

export default function HealthcareWhatsAppClinicCard({
  projectId,
  automationToggles,
}: HealthcareWhatsAppClinicCardProps) {
  const [loading, setLoading] = useState(true)
  const [approved, setApproved] = useState(0)
  const [total, setTotal] = useState(8)
  const [waConnected, setWaConnected] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [presets, templates, phone] = await Promise.all([
        fetchHealthcareTemplatePresets(projectId),
        fetchAccountTemplates(projectId),
        fetchProjectWhatsAppStatus(projectId),
      ])
      const rows = mergePackWithTemplates(presets, templates)
      const readiness = packReadiness(rows)
      setApproved(readiness.approved)
      setTotal(readiness.total)
      setWaConnected(phone.whatsappConnected)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const templatesHref = useMemo(
    () => `/projects/${projectId}/templates`,
    [projectId],
  )

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">WhatsApp automation</h3>
            <p className="mt-1 text-sm text-slate-600">
              Healthcare templates and triggers are managed under{' '}
              <strong>Templates → Healthcare</strong>.
            </p>
          </div>
          <Link
            href={templatesHref}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#128c7e] px-4 py-2 text-sm font-medium text-white hover:bg-[#0f7a6e]"
          >
            <Package className="h-4 w-4" />
            Open healthcare templates
            <ExternalLink className="h-3.5 w-3.5 opacity-80" />
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : (
            <>
              <span>
                Templates approved:{' '}
                <strong className={approved === total ? 'text-emerald-600' : 'text-amber-700'}>
                  {approved}/{total}
                </strong>
              </span>
              <span>{waConnected ? 'WhatsApp connected' : 'WhatsApp not connected'}</span>
              {approved === total && waConnected ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Ready to send
                </span>
              ) : null}
            </>
          )}
        </div>
      </div>
      <div className="px-4 py-4 sm:px-5">{automationToggles}</div>
    </div>
  )
}
