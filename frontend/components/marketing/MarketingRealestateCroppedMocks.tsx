'use client';

import type { ReactNode } from 'react';
import { Check, Clock, Home, IndianRupee, MapPin, MessageSquare, TrendingUp, Users } from 'lucide-react';
import type { IndustrySectionVisualId } from '@/components/marketing/MarketingIndustryMockPrimitives';
import {
  CroppedFrame,
  KpiTile,
  MiniBars,
  ProgressRows,
  SectionVisualGrid,
} from '@/components/marketing/MarketingIndustryMockPrimitives';

function RealestateHeroVisuals() {
  return (
    <SectionVisualGrid cols={3} exampleWorkspace>
      <KpiTile label="Pipeline value" value="₹8.4Cr" sub="Active inquiries · Q2" icon={IndianRupee} tone="emerald" />
      <KpiTile label="First reply" value="3m" sub="Median · business hours" icon={Clock} tone="sky" />
      <KpiTile label="Site visits" value="47" sub="Booked this week" icon={MapPin} tone="violet" />
    </SectionVisualGrid>
  );
}

function RealestateProblemVisuals() {
  return (
    <SectionVisualGrid cols={3}>
      <CroppedFrame label="Lead response lag">
        <p className="text-2xl font-bold text-rose-700">24h+</p>
        <p className="text-[10px] text-slate-500">Avg before Replysys</p>
        <MiniBars heights={[95, 90, 88, 75, 60, 45, 30]} accent="bg-rose-400" />
      </CroppedFrame>
      <CroppedFrame label="Inquiry → visit">
        <ProgressRows
          accent="bg-violet-500"
          rows={[
            { stage: 'Inquiry', pct: 100 },
            { stage: 'Brochure sent', pct: 78 },
            { stage: 'Visit booked', pct: 41 },
            { stage: 'Closed', pct: 12 },
          ]}
        />
      </CroppedFrame>
      <CroppedFrame label="Broker visibility">
        <p className="text-[10px] text-slate-500">Threads with owner</p>
        <p className="text-xl font-bold text-slate-900">100%</p>
        <p className="text-[9px] text-emerald-600">Manager audit on</p>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function RealestateHelpsVisuals() {
  return (
    <SectionVisualGrid cols={3}>
      <CroppedFrame label="Instant reply">
        <div className="rounded-lg bg-[#e7f8ef] p-2.5 ring-1 ring-[#25d366]/20">
          <p className="text-[10px] text-[#128c7e]">Skyline Residency · 3 BHK</p>
          <p className="mt-1 text-xs text-slate-800">Brochure + floor plan attached</p>
          <span className="mt-2 block text-[9px] text-slate-500">Assigned: Broker Anita</span>
        </div>
      </CroppedFrame>
      <CroppedFrame label="Lead queue">
        <ul className="space-y-1.5">
          {[
            { name: 'Vikram P.', project: 'Andheri West', hot: true },
            { name: 'Sneha R.', project: 'Powai', hot: false },
            { name: 'Karan M.', project: 'Thane', hot: true },
          ].map((l) => (
            <li key={l.name} className="flex justify-between rounded-md bg-slate-50 px-2 py-1.5 text-[10px]">
              <div>
                <p className="font-semibold text-slate-800">{l.name}</p>
                <p className="text-slate-500">{l.project}</p>
              </div>
              {l.hot ? (
                <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[8px] font-bold text-orange-700">HOT</span>
              ) : null}
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="Visit scheduler">
        <p className="text-[11px] font-semibold text-slate-800">Site visit · Sat 11 AM</p>
        <div className="mt-2 flex gap-1">
          <span className="flex-1 rounded-md bg-violet-600 py-1 text-center text-[9px] font-semibold text-white">Confirm</span>
          <span className="flex-1 rounded-md border py-1 text-center text-[9px] font-semibold text-slate-600">Reschedule</span>
        </div>
        <MiniBars heights={[40, 55, 62, 70, 78, 85, 90]} />
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function RealestateProofVisuals() {
  return (
    <SectionVisualGrid cols={2} className="mt-0 max-w-none lg:grid-cols-1">
      <CroppedFrame label="Sales pipeline" exampleWorkspace>
        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
          {[
            { l: 'New', v: '86' },
            { l: 'Visit', v: '47' },
            { l: 'Negotiation', v: '19' },
          ].map((x) => (
            <div key={x.l} className="rounded-md bg-slate-50 py-2 ring-1 ring-slate-100">
              <p className="text-slate-500">{x.l}</p>
              <p className="font-bold text-slate-900">{x.v}</p>
            </div>
          ))}
        </div>
        <MiniBars heights={[45, 52, 58, 65, 72, 80, 88]} accent="bg-violet-500" />
      </CroppedFrame>
      <CroppedFrame label="Broker SLA">
        <p className="text-[10px] text-slate-500">Slowest agent today</p>
        <p className="text-lg font-bold text-slate-900">8m</p>
        <p className="text-[9px] text-emerald-600">Team median 3m</p>
      </CroppedFrame>
      <CroppedFrame label="Template follow-ups">
        <div className="space-y-1 text-[10px]">
          {['site_visit_reminder', 'payment_plan_share', 'tower_launch_v2'].map((t) => (
            <div key={t} className="flex justify-between gap-2">
              <span className="truncate text-slate-700">{t}</span>
              <span className="text-emerald-700">Live</span>
            </div>
          ))}
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function RealestateModulesVisuals() {
  return (
    <SectionVisualGrid cols={2}>
      <CroppedFrame label="Brokerage playbook">
        <ul className="space-y-1.5">
          {['Lead routing', 'Brochure templates', 'Visit flows', 'Manager view'].map((item) => (
            <li key={item} className="flex items-center gap-2 text-[11px] text-slate-700">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="Project desk">
        <Home className="h-8 w-8 text-amber-700" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <KpiTile label="Brokers" value="24" sub="On roster" icon={Users} tone="sky" />
          <KpiTile label="Projects" value="6" sub="Live towers" icon={TrendingUp} tone="violet" />
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function RealestateWorkflowVisuals() {
  return (
    <SectionVisualGrid cols={4}>
      {[
        { step: '1', title: 'Lead', metric: '86 new', icon: MessageSquare },
        { step: '2', title: 'Qualify', metric: '3m reply', icon: Clock },
        { step: '3', title: 'Visit', metric: '47 booked', icon: MapPin },
        { step: '4', title: 'Close', metric: '12 deals', icon: IndianRupee },
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

function RealestateHonestyVisuals() {
  return (
    <SectionVisualGrid cols={2}>
      <CroppedFrame label="Shipped today">
        <div className="flex flex-wrap gap-1.5">
          {['Inbox', 'Assignment', 'Templates', 'Broadcasts'].map((chip) => (
            <span key={chip} className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
              {chip}
            </span>
          ))}
        </div>
      </CroppedFrame>
      <CroppedFrame label="Roadmap">
        <div className="flex flex-wrap gap-1.5">
          {['CRM sync', 'Booking forms'].map((chip) => (
            <span key={chip} className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200/70">
              {chip}
            </span>
          ))}
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

export const realestateSectionVisuals: Partial<Record<IndustrySectionVisualId, ReactNode>> = {
  hero: <RealestateHeroVisuals />,
  problem: <RealestateProblemVisuals />,
  helps: <RealestateHelpsVisuals />,
  proof: <RealestateProofVisuals />,
  modules: <RealestateModulesVisuals />,
  workflow: <RealestateWorkflowVisuals />,
  honesty: <RealestateHonestyVisuals />,
};
