'use client';

import type { ReactNode } from 'react';
import { Check, Clock, MessageSquare, RefreshCw, TrendingUp, Users, Zap } from 'lucide-react';
import type { IndustrySectionVisualId } from '@/components/marketing/MarketingIndustryMockPrimitives';
import {
  CroppedFrame,
  KpiTile,
  MiniBars,
  ProgressRows,
  SectionVisualGrid,
} from '@/components/marketing/MarketingIndustryMockPrimitives';

function SaasHeroVisuals() {
  return (
    <SectionVisualGrid cols={3} exampleWorkspace>
      <KpiTile label="Trial activation" value="68%" sub="Onboarding checklist" icon={Zap} tone="emerald" />
      <KpiTile label="Churn risk saved" value="24" sub="CSM pings this week" icon={RefreshCw} tone="sky" />
      <KpiTile label="Expansion ARR" value="+₹6.2L" sub="Power-user campaigns" icon={TrendingUp} tone="violet" />
    </SectionVisualGrid>
  );
}

function SaasProblemVisuals() {
  return (
    <SectionVisualGrid cols={3}>
      <CroppedFrame label="Trial stall">
        <ProgressRows
          accent="bg-violet-500"
          rows={[
            { stage: 'Signup', pct: 100 },
            { stage: 'Connected API', pct: 52 },
            { stage: 'First send', pct: 31 },
            { stage: 'Paid', pct: 18 },
          ]}
        />
      </CroppedFrame>
      <CroppedFrame label="CS on personal WA">
        <p className="text-xl font-bold text-slate-900">0%</p>
        <p className="text-[10px] text-slate-500">Threads in shared inbox now</p>
      </CroppedFrame>
      <CroppedFrame label="Renewal window">
        <p className="text-[10px] text-slate-500">90-day save rate</p>
        <p className="text-2xl font-bold text-emerald-700">+22%</p>
        <MiniBars heights={[40, 48, 55, 62, 70, 78, 85]} />
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function SaasHelpsVisuals() {
  return (
    <SectionVisualGrid cols={3}>
      <CroppedFrame label="Onboarding checklist">
        <ul className="space-y-1 text-[10px]">
          {['Connect WABA', 'Approve template', 'Import contacts', 'Send test'].map((s, i) => (
            <li key={s} className={`flex items-center gap-2 rounded-md px-2 py-1 ${i < 3 ? 'text-emerald-800 bg-emerald-50' : 'bg-slate-50 text-slate-600'}`}>
              <span className="font-bold">{i < 3 ? '✓' : '○'}</span>
              {s}
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="At-risk accounts">
        <ul className="space-y-1.5 text-[10px]">
          {[
            { name: 'Acme Corp', score: 'High' },
            { name: 'Nova Labs', score: 'Med' },
            { name: 'Pixel IO', score: 'High' },
          ].map((a) => (
            <li key={a.name} className="flex justify-between rounded-md bg-slate-50 px-2 py-1">
              <span className="font-semibold text-slate-800">{a.name}</span>
              <span className={a.score === 'High' ? 'text-rose-600' : 'text-amber-600'}>{a.score}</span>
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="Renewal nudge">
        <p className="text-[11px] font-semibold text-slate-800">Renewal in 7 days</p>
        <p className="mt-1 text-xs text-slate-600">Book office hours with your CSM</p>
        <span className="mt-2 block rounded-md bg-violet-600 py-1 text-center text-[9px] font-semibold text-white">
          Schedule call
        </span>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function SaasProofVisuals() {
  return (
    <SectionVisualGrid cols={2} className="mt-0 max-w-none lg:grid-cols-1">
      <CroppedFrame label="CS analytics">
        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
          {[
            { l: 'Threads', v: '186' },
            { l: 'Median reply', v: '6m' },
            { l: 'Templates', v: '412' },
          ].map((x) => (
            <div key={x.l} className="rounded-md bg-slate-50 py-2 ring-1 ring-slate-100">
              <p className="text-slate-500">{x.l}</p>
              <p className="font-bold text-slate-900">{x.v}</p>
            </div>
          ))}
        </div>
        <MiniBars heights={[55, 60, 58, 65, 72, 68, 75]} accent="bg-violet-500" />
      </CroppedFrame>
      <CroppedFrame label="Webinar blast">
        <p className="text-[10px] text-slate-500">Feature launch · opt-in</p>
        <p className="text-xl font-bold text-emerald-700">1.8k RSVPs</p>
      </CroppedFrame>
      <CroppedFrame label="Health score">
        <p className="text-2xl font-bold text-slate-900">82</p>
        <p className="text-[10px] text-slate-500">Avg account health</p>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function SaasModulesVisuals() {
  return (
    <SectionVisualGrid cols={2}>
      <CroppedFrame label="SaaS playbook">
        <ul className="space-y-1.5">
          {['Onboarding flows', 'Renewal templates', 'CS inbox', 'Launch broadcasts'].map((item) => (
            <li key={item} className="flex items-center gap-2 text-[11px] text-slate-700">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="CS team">
        <Zap className="h-8 w-8 text-violet-600" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <KpiTile label="CSMs" value="14" sub="Shared inbox" icon={Users} tone="sky" />
          <KpiTile label="SLA" value="6m" sub="Biz hours" icon={Clock} tone="violet" />
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function SaasWorkflowVisuals() {
  return (
    <SectionVisualGrid cols={4}>
      {[
        { step: '1', title: 'Activate', metric: '68%', icon: Zap },
        { step: '2', title: 'Adopt', metric: 'Tips WA', icon: MessageSquare },
        { step: '3', title: 'Renew', metric: '90/30/7', icon: RefreshCw },
        { step: '4', title: 'Expand', metric: '+₹6.2L', icon: TrendingUp },
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

function SaasHonestyVisuals() {
  return (
    <SectionVisualGrid cols={2}>
      <CroppedFrame label="Shipped today">
        <div className="flex flex-wrap gap-1.5">
          {['Flows', 'Inbox', 'Templates', 'Broadcasts'].map((chip) => (
            <span key={chip} className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
              {chip}
            </span>
          ))}
        </div>
      </CroppedFrame>
      <CroppedFrame label="Roadmap">
        <div className="flex flex-wrap gap-1.5">
          {['Usage triggers', 'SSO routing'].map((chip) => (
            <span key={chip} className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200/70">
              {chip}
            </span>
          ))}
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

export const saasTechSectionVisuals: Partial<Record<IndustrySectionVisualId, ReactNode>> = {
  hero: <SaasHeroVisuals />,
  problem: <SaasProblemVisuals />,
  helps: <SaasHelpsVisuals />,
  proof: <SaasProofVisuals />,
  modules: <SaasModulesVisuals />,
  workflow: <SaasWorkflowVisuals />,
  honesty: <SaasHonestyVisuals />,
};
