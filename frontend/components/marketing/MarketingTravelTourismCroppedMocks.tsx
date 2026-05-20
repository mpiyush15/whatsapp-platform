'use client';

import type { ReactNode } from 'react';
import { Check, Clock, IndianRupee, MapPin, MessageSquare, Plane, Ticket, TrendingUp } from 'lucide-react';
import type { IndustrySectionVisualId } from '@/components/marketing/MarketingIndustryMockPrimitives';
import {
  CroppedFrame,
  KpiTile,
  MiniBars,
  SectionVisualGrid,
} from '@/components/marketing/MarketingIndustryMockPrimitives';

function TravelHeroVisuals() {
  return (
    <SectionVisualGrid cols={3} exampleWorkspace>
      <KpiTile label="Bookings assisted" value="₹24.5L" sub="WA quotes · 14 days" icon={IndianRupee} tone="emerald" />
      <KpiTile label="Cancellations saved" value="38" sub="Save offers sent" icon={Ticket} tone="sky" />
      <KpiTile label="Repeat travelers" value="+50%" sub="Loyalty segment" icon={TrendingUp} tone="violet" />
    </SectionVisualGrid>
  );
}

function TravelProblemVisuals() {
  return (
    <SectionVisualGrid cols={3}>
      <CroppedFrame label="Itinerary anxiety">
        <p className="text-[10px] text-slate-500">Calls before departure</p>
        <p className="text-2xl font-bold text-rose-700">-62%</p>
        <MiniBars heights={[95, 88, 80, 70, 58, 45, 35]} accent="bg-sky-500" />
      </CroppedFrame>
      <CroppedFrame label="Voucher delivery">
        <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
          <div className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
            <p className="text-slate-500">Email</p>
            <p className="font-bold text-slate-600">22%</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2 ring-1 ring-emerald-200">
            <p className="font-bold text-emerald-700">WA 93%</p>
          </div>
        </div>
      </CroppedFrame>
      <CroppedFrame label="Upsell attach">
        <p className="text-xl font-bold text-slate-900">+18%</p>
        <p className="text-[10px] text-slate-500">Meals & insurance in-thread</p>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function TravelHelpsVisuals() {
  return (
    <SectionVisualGrid cols={3}>
      <CroppedFrame label="Booking confirmed">
        <div className="rounded-lg bg-[#e7f8ef] p-2.5 ring-1 ring-[#25d366]/20">
          <p className="text-[10px] text-[#128c7e]">PNR · DEL → GOI</p>
          <p className="mt-1 text-xs font-bold text-slate-900">12 Jun · 06:40</p>
          <span className="mt-2 block text-[9px] text-slate-600">E-ticket attached</span>
        </div>
      </CroppedFrame>
      <CroppedFrame label="Travel-day update">
        <ul className="space-y-1 text-[10px]">
          {['Gate change · T1', 'Pickup 4:10 AM', 'Hotel check-in 2 PM'].map((s) => (
            <li key={s} className="rounded-md bg-sky-50 px-2 py-1 text-sky-900">
              {s}
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="Cancellation save">
        <p className="text-[11px] font-semibold text-slate-800">Hold fare · 24h</p>
        <p className="mt-1 text-sm text-emerald-700">₹2,400 credit if you rebook</p>
        <MiniBars heights={[50, 58, 65, 72, 80, 88, 92]} />
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function TravelProofVisuals() {
  return (
    <SectionVisualGrid cols={2} className="mt-0 max-w-none lg:grid-cols-1">
      <CroppedFrame label="Seasonal campaigns">
        <p className="text-[10px] text-slate-500">Long weekend blast</p>
        <p className="text-2xl font-bold text-emerald-700">4.2k replies</p>
        <MiniBars heights={[45, 55, 70, 85, 78, 90, 95]} />
      </CroppedFrame>
      <CroppedFrame label="Agent desk">
        <p className="text-[10px] text-slate-500">Change requests today</p>
        <p className="text-xl font-bold text-slate-900">64</p>
        <p className="text-[9px] text-slate-500">Median handle 6m</p>
      </CroppedFrame>
      <CroppedFrame label="Destinations">
        <ul className="space-y-1 text-[10px]">
          {['Goa packages', 'Dubai summer', 'Kerala monsoon'].map((d, i) => (
            <li key={d} className="flex justify-between rounded-md px-2 py-1 even:bg-slate-50">
              <span>{d}</span>
              <span className="font-semibold">{[820, 540, 310][i]}</span>
            </li>
          ))}
        </ul>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function TravelModulesVisuals() {
  return (
    <SectionVisualGrid cols={2}>
      <CroppedFrame label="Travel playbook">
        <ul className="space-y-1.5">
          {['Booking confirms', 'Day-of updates', 'Save offers', 'Loyalty promos'].map((item) => (
            <li key={item} className="flex items-center gap-2 text-[11px] text-slate-700">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="OTA desk">
        <Plane className="h-8 w-8 text-sky-600" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <KpiTile label="Agents" value="12" sub="Shift live" icon={MessageSquare} tone="sky" />
          <KpiTile label="Locales" value="6" sub="Template sets" icon={MapPin} tone="violet" />
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function TravelWorkflowVisuals() {
  return (
    <SectionVisualGrid cols={4}>
      {[
        { step: '1', title: 'Quote', metric: 'WA hold', icon: MessageSquare },
        { step: '2', title: 'Book', metric: 'Voucher', icon: Ticket },
        { step: '3', title: 'Travel', metric: 'Live pings', icon: Plane },
        { step: '4', title: 'Return', metric: 'Loyalty', icon: TrendingUp },
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

function TravelHonestyVisuals() {
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
          {['GDS triggers', 'Visa checklist'].map((chip) => (
            <span key={chip} className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200/70">
              {chip}
            </span>
          ))}
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

export const travelTourismSectionVisuals: Partial<Record<IndustrySectionVisualId, ReactNode>> = {
  hero: <TravelHeroVisuals />,
  problem: <TravelProblemVisuals />,
  helps: <TravelHelpsVisuals />,
  proof: <TravelProofVisuals />,
  modules: <TravelModulesVisuals />,
  workflow: <TravelWorkflowVisuals />,
  honesty: <TravelHonestyVisuals />,
};
