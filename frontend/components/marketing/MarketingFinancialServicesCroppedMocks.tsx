'use client';

import type { ReactNode } from 'react';
import { Check, FileCheck, Landmark, Lock, MessageSquare, Shield, TrendingUp, Wallet } from 'lucide-react';
import type { IndustrySectionVisualId } from '@/components/marketing/MarketingIndustryMockPrimitives';
import {
  CroppedFrame,
  KpiTile,
  MiniBars,
  SectionVisualGrid,
} from '@/components/marketing/MarketingIndustryMockPrimitives';

function FinanceHeroVisuals() {
  return (
    <SectionVisualGrid cols={3} exampleWorkspace>
      <KpiTile label="On-time payments" value="78%" sub="Utility reminders" icon={Wallet} tone="emerald" />
      <KpiTile label="KYC completion" value="+41%" sub="WA document flows" icon={FileCheck} tone="sky" />
      <KpiTile label="Support cost" value="-35%" sub="Deflected to templates" icon={TrendingUp} tone="violet" />
    </SectionVisualGrid>
  );
}

function FinanceProblemVisuals() {
  return (
    <SectionVisualGrid cols={3}>
      <CroppedFrame label="Template rejects">
        <p className="text-2xl font-bold text-amber-700">14%</p>
        <p className="text-[10px] text-slate-500">Before category governance</p>
        <MiniBars heights={[90, 85, 78, 65, 50, 38, 22]} accent="bg-amber-500" />
      </CroppedFrame>
      <CroppedFrame label="RM on personal WA">
        <p className="text-[10px] text-slate-500">Audit coverage</p>
        <p className="text-xl font-bold text-slate-900">38% → 100%</p>
        <p className="text-[9px] text-emerald-600">Shared business inbox</p>
      </CroppedFrame>
      <CroppedFrame label="WA spend visibility">
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
            <p className="text-slate-500">Auth</p>
            <p className="font-bold text-slate-800">₹42k</p>
          </div>
          <div className="rounded-lg bg-sky-50 p-2 ring-1 ring-sky-200">
            <p className="text-sky-700">Utility</p>
            <p className="font-bold text-sky-900">₹1.1L</p>
          </div>
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function FinanceHelpsVisuals() {
  return (
    <SectionVisualGrid cols={3}>
      <CroppedFrame label="OTP / auth template">
        <div className="rounded-lg bg-slate-50 p-2.5 ring-1 ring-slate-200">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-slate-600" />
            <p className="text-[10px] font-semibold text-slate-800">Verification code</p>
          </div>
          <p className="mt-2 text-lg font-bold tracking-widest text-slate-900">••• 482</p>
          <p className="text-[9px] text-slate-500">Authentication · approved</p>
        </div>
      </CroppedFrame>
      <CroppedFrame label="KYC collection">
        <ul className="space-y-1 text-[10px]">
          {['PAN uploaded', 'Address proof', 'Awaiting review'].map((s, i) => (
            <li key={s} className={`flex items-center gap-2 rounded-md px-2 py-1 ${i < 2 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
              <FileCheck className="h-3 w-3" />
              {s}
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="Payment reminder">
        <p className="text-[11px] font-semibold text-slate-800">EMI due · 3 days</p>
        <p className="mt-1 text-base font-bold text-slate-900">₹12,450</p>
        <span className="mt-2 block rounded-md bg-[#128c7e] py-1 text-center text-[9px] font-semibold text-white">
          Pay securely
        </span>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function FinanceProofVisuals() {
  return (
    <SectionVisualGrid cols={2} className="mt-0 max-w-none lg:grid-cols-1">
      <CroppedFrame label="RM inbox">
        <ul className="space-y-1.5 text-[10px]">
          {[
            { name: 'Home loan · Sharma', tag: 'KYC', owner: 'RM Priya' },
            { name: 'Card dispute · Khan', tag: 'Urgent', owner: 'RM Amit' },
          ].map((r) => (
            <li key={r.name} className="rounded-md bg-slate-50 px-2 py-1.5">
              <p className="font-semibold text-slate-800">{r.name}</p>
              <p className="text-slate-500">
                {r.tag} · {r.owner}
              </p>
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="Compliance log">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-sky-600" />
          <p className="text-xs font-semibold text-slate-800">Audit trail export</p>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">Last 30 days · 12.4k events</p>
      </CroppedFrame>
      <CroppedFrame label="Template library">
        <div className="space-y-1 text-[10px]">
          {['auth_otp_v4', 'emi_reminder', 'kyc_nudge'].map((t) => (
            <div key={t} className="flex justify-between">
              <span className="text-slate-700">{t}</span>
              <span className="text-emerald-700">Approved</span>
            </div>
          ))}
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function FinanceModulesVisuals() {
  return (
    <SectionVisualGrid cols={2}>
      <CroppedFrame label="Finance playbook">
        <ul className="space-y-1.5">
          {['Auth templates', 'Utility alerts', 'KYC flows', 'RM inbox'].map((item) => (
            <li key={item} className="flex items-center gap-2 text-[11px] text-slate-700">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="Ops desk">
        <Landmark className="h-8 w-8 text-sky-700" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <KpiTile label="RMs live" value="42" sub="Shared number" icon={MessageSquare} tone="sky" />
          <KpiTile label="Spend MTD" value="₹1.6L" sub="Conversation billing" icon={Wallet} tone="emerald" />
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function FinanceWorkflowVisuals() {
  return (
    <SectionVisualGrid cols={4}>
      {[
        { step: '1', title: 'Consent', metric: 'Opt-in', icon: Shield },
        { step: '2', title: 'Verify', metric: 'Auth OTP', icon: Lock },
        { step: '3', title: 'Service', metric: 'RM inbox', icon: MessageSquare },
        { step: '4', title: 'Retain', metric: 'Compliant', icon: FileCheck },
      ].map((c) => (
        <CroppedFrame key={c.step} label={`Step ${c.step}`}>
          <c.icon className="h-4 w-4 text-[#128c7e]" />
          <p className="mt-2 text-xs font-semibold text-slate-800">{c.title}</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{c.metric}</p>
        </CroppedFrame>
      ))}
    </SectionVisualGrid>
  );
}

function FinanceHonestyVisuals() {
  return (
    <SectionVisualGrid cols={2}>
      <CroppedFrame label="Shipped today">
        <div className="flex flex-wrap gap-1.5">
          {['Template governance', 'Inbox', 'Flows', 'Billing view'].map((chip) => (
            <span key={chip} className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
              {chip}
            </span>
          ))}
        </div>
      </CroppedFrame>
      <CroppedFrame label="Roadmap">
        <div className="flex flex-wrap gap-1.5">
          {['Core banking', 'Archive'].map((chip) => (
            <span key={chip} className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200/70">
              {chip}
            </span>
          ))}
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

export const financialServicesSectionVisuals: Partial<Record<IndustrySectionVisualId, ReactNode>> = {
  hero: <FinanceHeroVisuals />,
  problem: <FinanceProblemVisuals />,
  helps: <FinanceHelpsVisuals />,
  proof: <FinanceProofVisuals />,
  modules: <FinanceModulesVisuals />,
  workflow: <FinanceWorkflowVisuals />,
  honesty: <FinanceHonestyVisuals />,
};
