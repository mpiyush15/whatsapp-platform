'use client';

import Link from 'next/link';
import { ArrowRight, Building2, MessageSquare } from 'lucide-react';

export default function WhatsAppSetupPage() {
  return (
    <div className="min-h-full bg-slate-50/80 p-6 lg:p-8">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100">
          <MessageSquare className="h-7 w-7 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">WhatsApp is configured per organization</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Superadmin does not connect a single global WhatsApp number. Each client organization
          completes Meta OAuth or enters credentials from their own project settings. Use
          Organizations to inspect connection status, credits, and billing for a tenant.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard/superadmin/organizations"
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
          >
            <Building2 className="h-4 w-4" />
            View organizations
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard/superadmin"
            className="inline-flex items-center rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to dashboard
          </Link>
        </div>
        <div className="mt-8 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600">
          <p className="font-medium text-slate-800">Webhook URL (all tenants)</p>
          <code className="mt-2 block break-all font-mono">
            {(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050').replace(/\/api$/, '')}
            /api/webhooks/whatsapp
          </code>
        </div>
      </div>
    </div>
  );
}
