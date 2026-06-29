'use client';

import type { ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  GraduationCap,
  IndianRupee,
  Mail,
  MessageSquare,
  TrendingUp,
  Users,
} from 'lucide-react';
import { MockExampleWorkspaceLabel } from '@/components/marketing/MarketingIndustryMockPrimitives';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';

function CroppedFrame({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_10px_36px_rgba(17,17,17,0.07)] ring-1 ring-black/[0.04] ${className}`}
    >
      <div className="flex items-center justify-between border-b border-black/[0.06] bg-[#fafaf9] px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#71717a]">{label}</span>
        <span className="h-1.5 w-1.5 rounded-full bg-[#25d366]" aria-hidden />
      </div>
      <div className="p-3 sm:p-3.5">{children}</div>
    </div>
  );
}

function MiniBars({ heights, accent = 'bg-[#128c7e]' }: { heights: number[]; accent?: string }) {
  const max = Math.max(...heights);
  return (
    <div className="flex h-14 items-end justify-between gap-1 pt-1">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`w-full max-w-[10px] rounded-t-sm ${accent}`}
          style={{
            height: `${Math.round((h / max) * 100)}%`,
            minHeight: 4,
            opacity: i === heights.length - 1 ? 1 : 0.55,
          }}
        />
      ))}
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'emerald',
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof IndianRupee;
  tone?: 'emerald' | 'violet' | 'sky' | 'amber';
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200/80',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200/80',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200/80',
  };
  return (
    <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ${tones[tone]}`}>
          <Icon className="h-3 w-3" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-1.5 text-lg font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-[9px] text-slate-500">{sub}</p>
    </div>
  );
}

function SectionVisualGrid({
  children,
  cols = 3,
  className = '',
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  const grid =
    cols === 2
      ? 'sm:grid-cols-2'
      : cols === 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-2 lg:grid-cols-3';
  return (
    <div className={`mx-auto mt-8 grid max-w-5xl gap-3.5 ${grid} ${className}`.trim()}>{children}</div>
  );
}

export function EducationHeroVisuals() {
  return (
    <div className="mx-auto max-w-5xl">
      <SectionVisualGrid cols={3}>
        <KpiTile
          label="Coaching revenue"
          value="₹18.4L"
          sub="This month · +22%"
          icon={IndianRupee}
          tone="emerald"
        />
        <KpiTile
          label="Active batches"
          value="24"
          sub="JEE · NEET · Foundation"
          icon={BookOpen}
          tone="violet"
        />
        <KpiTile
          label="Parent threads"
          value="1,842"
          sub="Open rate 94% on WA"
          icon={MessageSquare}
          tone="sky"
        />
      </SectionVisualGrid>
      <MockExampleWorkspaceLabel className="mt-2 text-right" />
    </div>
  );
}

export function EducationProblemVisuals() {
  return (
    <SectionVisualGrid cols={3}>
      <CroppedFrame label="Fee defaults">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <p className="text-xs font-semibold text-slate-800">Term 2 collection</p>
        </div>
        <p className="mt-2 text-2xl font-bold tabular-nums text-amber-700">18%</p>
        <p className="text-[10px] text-slate-500">Outstanding vs email-only reminders</p>
        <MiniBars heights={[32, 38, 45, 52, 58, 62, 68]} accent="bg-amber-500" />
      </CroppedFrame>
      <CroppedFrame label="Channel open rate">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-50 p-2 text-center ring-1 ring-slate-200/80">
            <Mail className="mx-auto h-4 w-4 text-slate-400" />
            <p className="mt-1 text-sm font-bold text-slate-600">12%</p>
            <p className="text-[9px] text-slate-500">Email</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2 text-center ring-1 ring-emerald-200/80">
            <WhatsAppIcon className="mx-auto h-4 w-4 text-[#128c7e]" />
            <p className="mt-1 text-sm font-bold text-emerald-700">94%</p>
            <p className="text-[9px] text-emerald-600">WhatsApp</p>
          </div>
        </div>
      </CroppedFrame>
      <CroppedFrame label="Admission drop-off">
        <p className="text-[10px] text-slate-500">Inquiry → enrolled</p>
        <div className="mt-2 space-y-1.5">
          {[
            { stage: 'Inquiry', pct: 100 },
            { stage: 'Counselor call', pct: 62 },
            { stage: 'Campus visit', pct: 38 },
            { stage: 'Enrolled', pct: 14 },
          ].map((row) => (
            <div key={row.stage} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[9px] text-slate-600">{row.stage}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${row.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

export function EducationHelpsVisuals() {
  return (
    <SectionVisualGrid cols={3}>
      <CroppedFrame label="Fee reminder">
        <div className="rounded-lg bg-[#e7f8ef] p-2.5 ring-1 ring-[#25d366]/20">
          <p className="text-[10px] font-medium text-[#128c7e]">Term 2 fee · due 5 Jun</p>
          <p className="mt-1 text-base font-bold text-slate-900">₹42,500</p>
          <button
            type="button"
            className="mt-2 w-full rounded-md bg-[#128c7e] py-1 text-[10px] font-semibold text-white"
          >
            Pay now
          </button>
        </div>
        <p className="mt-2 text-[9px] text-slate-500">Read · 2m ago</p>
      </CroppedFrame>
      <CroppedFrame label="Admission inbox">
        <ul className="space-y-1.5">
          {[
            { name: 'Arjun K.', tag: 'Grade 11', state: 'Hot' },
            { name: 'Meera S.', tag: 'NEET batch', state: 'Tour' },
            { name: 'Rohan P.', tag: 'Foundation', state: 'New' },
          ].map((lead) => (
            <li
              key={lead.name}
              className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50/80 px-2 py-1.5"
            >
              <div>
                <p className="text-[11px] font-semibold text-slate-800">{lead.name}</p>
                <p className="text-[9px] text-slate-500">{lead.tag}</p>
              </div>
              <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-violet-700">
                {lead.state}
              </span>
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="Parent broadcast">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-800">Exam schedule · Grade 10</p>
          <Bell className="h-3.5 w-3.5 text-slate-400" />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          {[
            { l: 'Sent', v: '480' },
            { l: 'Read', v: '451' },
            { l: 'Replies', v: '38' },
          ].map((s) => (
            <div key={s.l} className="rounded-md bg-slate-50 py-1.5 ring-1 ring-slate-100">
              <p className="text-[8px] uppercase text-slate-500">{s.l}</p>
              <p className="text-xs font-bold tabular-nums text-slate-900">{s.v}</p>
            </div>
          ))}
        </div>
        <MiniBars heights={[55, 62, 70, 78, 85, 90, 96]} />
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

export function EducationProofVisuals() {
  return (
    <SectionVisualGrid cols={2} className="mt-0 max-w-none lg:grid-cols-1">
      <CroppedFrame label="Delivery rate">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] text-slate-500">Last broadcast</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-700">96.8%</p>
          </div>
          <BarChart3 className="h-8 w-8 text-emerald-600/40" />
        </div>
        <MiniBars heights={[72, 68, 80, 88, 84, 92, 97]} />
      </CroppedFrame>
      <CroppedFrame label="Segments">
        <ul className="space-y-1">
          {['Grade 9 parents', 'Grade 10 parents', 'NEET 2026', 'Fee defaulters'].map((seg, i) => (
            <li
              key={seg}
              className="flex items-center justify-between rounded-md px-2 py-1 text-[10px] text-slate-700 even:bg-slate-50"
            >
              <span className="truncate">{seg}</span>
              <span className="tabular-nums font-semibold text-slate-900">{[412, 388, 156, 42][i]}</span>
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="Template status">
        <div className="space-y-1.5">
          {[
            { name: 'fee_reminder_v3', status: 'Approved' },
            { name: 'exam_alert_term2', status: 'Approved' },
            { name: 'admission_followup', status: 'Approved' },
          ].map((t) => (
            <div key={t.name} className="flex items-center justify-between gap-2 text-[10px]">
              <span className="truncate font-medium text-slate-700">{t.name}</span>
              <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800">
                {t.status}
              </span>
            </div>
          ))}
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

export function EducationModulesVisuals() {
  return (
    <SectionVisualGrid cols={2}>
      <CroppedFrame label="Playbook checklist">
        <ul className="space-y-1.5">
          {['Fee campaigns', 'Admission inbox', 'Parent segments', 'Campus visit flow'].map((item) => (
            <li key={item} className="flex items-center gap-2 text-[11px] text-slate-700">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="Coaching ops">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-800">3 centers · 1 number</p>
            <p className="text-[10px] text-slate-500">Kota · Delhi · Online</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <KpiTile label="Counselors" value="8" sub="Assigned today" icon={Users} tone="sky" />
          <KpiTile label="Flows live" value="6" sub="Admissions + fees" icon={TrendingUp} tone="violet" />
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

export function EducationWorkflowVisuals() {
  return (
    <SectionVisualGrid cols={4}>
      {[
        { step: '1', title: 'Lead in', metric: '48 today', icon: MessageSquare },
        { step: '2', title: 'Nurture', metric: '12 tours', icon: Users },
        { step: '3', title: 'Enroll', metric: '+6 seats', icon: BookOpen },
        { step: '4', title: 'Retain', metric: '₹8.2L fees', icon: IndianRupee },
      ].map((card) => (
        <CroppedFrame key={card.step} label={`Step ${card.step}`}>
          <card.icon className="h-4 w-4 text-[#128c7e]" />
          <p className="mt-2 text-xs font-semibold text-slate-800">{card.title}</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">{card.metric}</p>
        </CroppedFrame>
      ))}
    </SectionVisualGrid>
  );
}

export function EducationHonestyVisuals() {
  return (
    <SectionVisualGrid cols={2}>
      <CroppedFrame label="Shipped today">
        <div className="flex flex-wrap gap-1.5">
          {['Inbox', 'Templates', 'Broadcasts', 'Flows'].map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200/80"
            >
              {chip}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-slate-500">Education playbooks included</p>
      </CroppedFrame>
      <CroppedFrame label="Roadmap">
        <div className="flex flex-wrap gap-1.5">
          {['SIS sync', 'Attendance alerts'].map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200/70"
            >
              {chip}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-slate-500">Planned · not required to start</p>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

import type { IndustrySectionVisualId } from '@/components/marketing/MarketingIndustryMockPrimitives';

export type { IndustrySectionVisualId };

export const educationSectionVisuals: Partial<Record<IndustrySectionVisualId, ReactNode>> = {
  hero: <EducationHeroVisuals />,
  problem: <EducationProblemVisuals />,
  helps: <EducationHelpsVisuals />,
  proof: <EducationProofVisuals />,
  modules: <EducationModulesVisuals />,
  workflow: <EducationWorkflowVisuals />,
  honesty: <EducationHonestyVisuals />,
};
