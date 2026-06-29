'use client';

import type { ReactNode } from 'react';
import { Check, Clock, IndianRupee, MapPin, MessageSquare, TrendingUp, UtensilsCrossed, Users } from 'lucide-react';
import type { IndustrySectionVisualId } from '@/components/marketing/MarketingIndustryMockPrimitives';
import {
  CroppedFrame,
  KpiTile,
  MiniBars,
  SectionVisualGrid,
} from '@/components/marketing/MarketingIndustryMockPrimitives';

function FoodHeroVisuals() {
  return (
    <SectionVisualGrid cols={3} exampleWorkspace>
      <KpiTile label="Direct orders" value="₹9.8L" sub="WA channel · 7 days" icon={IndianRupee} tone="emerald" />
      <KpiTile label="Pickup show-up" value="85%" sub="Ready pings sent" icon={Clock} tone="sky" />
      <KpiTile label="Repeat visits" value="+40%" sub="Loyalty broadcasts" icon={TrendingUp} tone="violet" />
    </SectionVisualGrid>
  );
}

function FoodProblemVisuals() {
  return (
    <SectionVisualGrid cols={3}>
      <CroppedFrame label="No-show pickups">
        <p className="text-2xl font-bold text-amber-700">32%</p>
        <p className="text-[10px] text-slate-500">Before ready alerts</p>
        <MiniBars heights={[88, 82, 75, 68, 55, 42, 32]} accent="bg-amber-500" />
      </CroppedFrame>
      <CroppedFrame label="Aggregator dependency">
        <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
          <div className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
            <p className="text-slate-500">Aggregator</p>
            <p className="font-bold text-slate-700">68%</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2 ring-1 ring-emerald-200">
            <p className="text-emerald-700">Direct WA</p>
            <p className="font-bold text-emerald-800">32% → 48%</p>
          </div>
        </div>
      </CroppedFrame>
      <CroppedFrame label="Promo waste">
        <p className="text-[10px] text-slate-500">Blast → redemption</p>
        <p className="text-xl font-bold text-slate-900">12%</p>
        <p className="text-[9px] text-emerald-600">Targeted slow-hour ↑ 28%</p>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function FoodHelpsVisuals() {
  return (
    <SectionVisualGrid cols={3}>
      <CroppedFrame label="Order status">
        <ul className="space-y-1 text-[10px]">
          {['Confirmed', 'Preparing', 'Ready for pickup'].map((s, i) => (
            <li key={s} className={`rounded-md px-2 py-1 ${i === 2 ? 'bg-emerald-50 font-semibold text-emerald-800' : 'bg-slate-50 text-slate-700'}`}>
              {s}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[9px] text-slate-500">Order #2841 · ETA 12 min</p>
      </CroppedFrame>
      <CroppedFrame label="Outlet routing">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-orange-600" />
          <p className="text-xs font-semibold text-slate-800">Bandra kitchen</p>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">3 agents · 14 open chats</p>
        <KpiTile label="Avg wait" value="2m" sub="First reply" icon={MessageSquare} tone="sky" />
      </CroppedFrame>
      <CroppedFrame label="Slow-hour offer">
        <p className="text-[11px] font-semibold text-slate-800">Tuesday 3–6 PM · 20% off</p>
        <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[9px]">
          {[
            { l: 'Sent', v: '1.2k' },
            { l: 'Redeemed', v: '186' },
            { l: 'Lift', v: '+28%' },
          ].map((x) => (
            <div key={x.l} className="rounded bg-slate-50 py-1.5">
              <p className="text-slate-500">{x.l}</p>
              <p className="font-bold text-slate-900">{x.v}</p>
            </div>
          ))}
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function FoodProofVisuals() {
  return (
    <SectionVisualGrid cols={2} className="mt-0 max-w-none lg:grid-cols-1">
      <CroppedFrame label="Outlet campaigns">
        <p className="text-[10px] text-slate-500">City-wide vs hyper-local</p>
        <MiniBars heights={[40, 48, 55, 62, 70, 78, 85]} accent="bg-orange-500" />
      </CroppedFrame>
      <CroppedFrame label="Guest feedback">
        <p className="text-2xl font-bold text-emerald-700">4.6★</p>
        <p className="text-[10px] text-slate-500">Post-pickup WA survey</p>
      </CroppedFrame>
      <CroppedFrame label="Loyalty list">
        <p className="text-[10px] text-slate-500">Opt-in regulars</p>
        <p className="text-xl font-bold text-slate-900">8.4k</p>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function FoodModulesVisuals() {
  return (
    <SectionVisualGrid cols={2}>
      <CroppedFrame label="F&B playbook">
        <ul className="space-y-1.5">
          {['Order lifecycle', 'Pickup alerts', 'Loyalty promos', 'Per-outlet inbox'].map((item) => (
            <li key={item} className="flex items-center gap-2 text-[11px] text-slate-700">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="Brand scale">
        <UtensilsCrossed className="h-8 w-8 text-orange-600" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <KpiTile label="Outlets" value="18" sub="One WA brand" icon={MapPin} tone="amber" />
          <KpiTile label="VIP guests" value="8.4k" sub="Opt-in list" icon={Users} tone="emerald" />
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function FoodWorkflowVisuals() {
  return (
    <SectionVisualGrid cols={4}>
      {[
        { step: '1', title: 'Order', metric: 'QR → WA', icon: MessageSquare },
        { step: '2', title: 'Kitchen', metric: 'Live status', icon: UtensilsCrossed },
        { step: '3', title: 'Pickup', metric: '85% show', icon: Clock },
        { step: '4', title: 'Loyalty', metric: '+40% repeat', icon: TrendingUp },
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

function FoodHonestyVisuals() {
  return (
    <SectionVisualGrid cols={2}>
      <CroppedFrame label="Shipped today">
        <div className="flex flex-wrap gap-1.5">
          {['Templates', 'Broadcasts', 'Inbox', 'Flows'].map((chip) => (
            <span key={chip} className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
              {chip}
            </span>
          ))}
        </div>
      </CroppedFrame>
      <CroppedFrame label="Roadmap">
        <div className="flex flex-wrap gap-1.5">
          {['POS triggers', 'Table booking'].map((chip) => (
            <span key={chip} className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200/70">
              {chip}
            </span>
          ))}
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

export const foodBeverageSectionVisuals: Partial<Record<IndustrySectionVisualId, ReactNode>> = {
  hero: <FoodHeroVisuals />,
  problem: <FoodProblemVisuals />,
  helps: <FoodHelpsVisuals />,
  proof: <FoodProofVisuals />,
  modules: <FoodModulesVisuals />,
  workflow: <FoodWorkflowVisuals />,
  honesty: <FoodHonestyVisuals />,
};
