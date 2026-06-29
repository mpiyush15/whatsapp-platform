'use client';

import type { ReactNode } from 'react';
import { MessageSquare, ShoppingCart, TrendingUp, Truck } from 'lucide-react';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';
import type { IndustrySectionVisualId } from '@/components/marketing/MarketingIndustryMockPrimitives';
import {
  CroppedFrame,
  KpiTile,
  MiniBars,
  ProgressRows,
  SectionVisualGrid,
} from '@/components/marketing/MarketingIndustryMockPrimitives';

function EcommerceProblemVisuals() {
  return (
    <SectionVisualGrid cols={3}>
      <CroppedFrame label="Cart abandonment">
        <p className="text-[10px] text-slate-500">Checkout started → paid</p>
        <ProgressRows
          accent="bg-amber-500"
          rows={[
            { stage: 'Add to cart', pct: 100 },
            { stage: 'Checkout', pct: 42 },
            { stage: 'Paid', pct: 28 },
          ]}
        />
        <p className="mt-2 text-xs font-semibold text-amber-700">70% drop without WA nudge</p>
      </CroppedFrame>
      <CroppedFrame label="WISMO tickets">
        <p className="text-2xl font-bold tabular-nums text-slate-900">-52%</p>
        <p className="text-[10px] text-slate-500">Support tickets after proactive WA updates</p>
        <MiniBars heights={[90, 85, 78, 65, 55, 48, 42]} accent="bg-emerald-500" />
      </CroppedFrame>
      <CroppedFrame label="Channel reach">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-50 p-2 text-center ring-1 ring-slate-200/80">
            <p className="text-[9px] text-slate-500">Email</p>
            <p className="text-sm font-bold text-slate-600">14%</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2 text-center ring-1 ring-emerald-200/80">
            <WhatsAppIcon className="mx-auto h-4 w-4 text-[#128c7e]" />
            <p className="text-sm font-bold text-emerald-700">89%</p>
          </div>
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function EcommerceHelpsVisuals() {
  return (
    <SectionVisualGrid cols={3}>
      <CroppedFrame label="Cart recovery">
        <div className="rounded-lg bg-[#e7f8ef] p-2.5 ring-1 ring-[#25d366]/20">
          <p className="text-[10px] text-[#128c7e]">You left items in your cart</p>
          <p className="mt-1 text-sm font-bold text-slate-900">₹2,499 · 2 items</p>
          <span className="mt-2 block rounded-md bg-[#128c7e] py-1 text-center text-[9px] font-semibold text-white">
            Complete order
          </span>
        </div>
      </CroppedFrame>
      <CroppedFrame label="Order thread">
        <ul className="space-y-1.5 text-[10px]">
          {[
            { s: 'Packed', t: '10:42 AM' },
            { s: 'Out for delivery', t: '2:15 PM' },
            { s: 'Delivered', t: '6:08 PM' },
          ].map((row) => (
            <li key={row.s} className="flex justify-between rounded-md bg-slate-50 px-2 py-1">
              <span className="font-medium text-slate-800">{row.s}</span>
              <span className="text-slate-500">{row.t}</span>
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="Flash sale blast">
        <p className="text-[11px] font-semibold text-slate-800">VIP weekend · 20% off</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          {[
            { l: 'Sent', v: '8.2k' },
            { l: 'CTR', v: '12%' },
            { l: 'Orders', v: '640' },
          ].map((x) => (
            <div key={x.l} className="rounded-md bg-slate-50 py-1.5 ring-1 ring-slate-100">
              <p className="text-[8px] uppercase text-slate-500">{x.l}</p>
              <p className="text-xs font-bold text-slate-900">{x.v}</p>
            </div>
          ))}
        </div>
        <MiniBars heights={[50, 62, 70, 85, 92, 88, 95]} />
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function EcommerceProofVisuals() {
  return (
    <SectionVisualGrid cols={2} className="mt-0 max-w-none lg:grid-cols-1">
      <CroppedFrame label="Campaign performance">
        <p className="text-[10px] text-slate-500">Abandoned cart · 7d</p>
        <p className="text-2xl font-bold text-emerald-700">38% recovered</p>
        <MiniBars heights={[55, 60, 58, 65, 72, 78, 82]} />
      </CroppedFrame>
      <CroppedFrame label="Top segments">
        <ul className="space-y-1 text-[10px]">
          {['VIP repeat', 'Churn-risk', 'COD pending'].map((s, i) => (
            <li key={s} className="flex justify-between rounded-md px-2 py-1 even:bg-slate-50">
              <span>{s}</span>
              <span className="font-semibold tabular-nums">{['1.2k', '890', '420'][i]}</span>
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="Agent pickup">
        <p className="text-[10px] text-slate-500">High-AOV chats assigned</p>
        <p className="text-xl font-bold text-slate-900">18</p>
        <p className="text-[9px] text-emerald-600">Avg reply 3m</p>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function EcommerceWorkflowVisuals() {
  return (
    <SectionVisualGrid cols={4}>
      {[
        { step: '1', title: 'Capture', metric: 'WA widget', icon: MessageSquare },
        { step: '2', title: 'Recover', metric: '₹14L/mo', icon: ShoppingCart },
        { step: '3', title: 'Ship', metric: 'Live tracking', icon: Truck },
        { step: '4', title: 'Repeat', metric: '+34% LTV', icon: TrendingUp },
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

function EcommerceHonestyVisuals() {
  return (
    <SectionVisualGrid cols={2}>
      <CroppedFrame label="Shipped today">
        <div className="flex flex-wrap gap-1.5">
          {['Campaigns', 'Inbox', 'Flows', 'Templates'].map((chip) => (
            <span key={chip} className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
              {chip}
            </span>
          ))}
        </div>
      </CroppedFrame>
      <CroppedFrame label="Roadmap">
        <div className="flex flex-wrap gap-1.5">
          {['Shopify sync', 'COD flows'].map((chip) => (
            <span key={chip} className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200/70">
              {chip}
            </span>
          ))}
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

export const ecommerceSectionVisuals: Partial<Record<IndustrySectionVisualId, ReactNode>> = {
  problem: <EcommerceProblemVisuals />,
  helps: <EcommerceHelpsVisuals />,
  proof: <EcommerceProofVisuals />,
  workflow: <EcommerceWorkflowVisuals />,
  honesty: <EcommerceHonestyVisuals />,
};
