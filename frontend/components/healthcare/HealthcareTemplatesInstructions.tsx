'use client'

import Link from 'next/link'
import { CheckCircle2, Loader2, Package, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

type HealthcareTemplatesInstructionsProps = {
  projectId: string
  waConnected: boolean
  approved: number
  total: number
  missing: number
  ready: boolean
  loading?: boolean
  installing?: boolean
  syncing?: boolean
  message?: string | null
  error?: string | null
  onInstallPack: () => void
  onSync: () => void
}

export default function HealthcareTemplatesInstructions({
  projectId,
  waConnected,
  approved,
  total,
  missing,
  ready,
  loading,
  installing,
  syncing,
  message,
  error,
  onInstallPack,
  onSync,
}: HealthcareTemplatesInstructionsProps) {
  const whatsappSetupHref = `/projects/${projectId}/settings/whatsapp-setup`

  return (
    <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50/90 to-white px-6 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#128c7e]">Healthcare presets</p>
          <p className="mt-1 max-w-2xl text-sm text-gray-700">
            Utility templates wired to clinic triggers. Use <strong>View</strong> for WhatsApp preview (same as other
            templates). Install drafts, submit to Meta, then sync—keep <code className="rounded bg-gray-100 px-1 text-xs">healthcare_*</code> names.
          </p>
          <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-xs text-gray-600">
            <li>
              {waConnected ? (
                'WhatsApp connected.'
              ) : (
                <>
                  Connect in{' '}
                  <Link href={whatsappSetupHref} className="font-medium text-[#128c7e] hover:underline">
                    WhatsApp setup
                  </Link>
                  .
                </>
              )}
            </li>
            <li>Install pack → View preview → Submit to Meta → Sync.</li>
          </ol>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={syncing || loading}
            className="gap-1.5"
          >
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sync from Meta
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onInstallPack}
            disabled={installing || loading}
            className="gap-1.5 bg-[#128c7e] hover:bg-[#0f7a6e]"
          >
            {installing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
            Install healthcare pack
          </Button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-700">
        <span>
          Approved: <strong className={ready ? 'text-emerald-600' : 'text-amber-700'}>{approved}/{total}</strong>
        </span>
        {missing > 0 ? <span className="text-violet-700">{missing} not installed</span> : null}
        {ready && waConnected ? (
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Triggers ready
          </span>
        ) : null}
      </div>
      {message ? <p className="mt-2 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-rose-800">{error}</p> : null}
    </div>
  )
}
