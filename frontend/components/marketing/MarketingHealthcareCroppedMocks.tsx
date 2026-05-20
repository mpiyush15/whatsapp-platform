'use client';

import {
  Activity,
  Calendar,
  Check,
  ClipboardList,
  HeartPulse,
  IndianRupee,
  MessageSquare,
  Pill,
  Stethoscope,
  TrendingDown,
  Users,
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';
import type { IndustrySectionVisualId } from '@/components/marketing/MarketingIndustryMockPrimitives';
import {
  CroppedFrame,
  KpiTile,
  MiniBars,
  ProgressRows,
  SectionVisualGrid,
} from '@/components/marketing/MarketingIndustryMockPrimitives';
import type { ReactNode } from 'react';

function HealthcareHeroVisuals() {
  return (
    <SectionVisualGrid cols={3} exampleWorkspace>
      <KpiTile label="Clinic revenue" value="₹32.6L" sub="This month · +18%" icon={IndianRupee} tone="emerald" />
      <KpiTile label="Appointments" value="86" sub="Today · 12 open slots filled" icon={Calendar} tone="sky" />
      <KpiTile label="No-show rate" value="12%" sub="Down from 28% last quarter" icon={TrendingDown} tone="rose" />
    </SectionVisualGrid>
  );
}

function HealthcareProblemVisuals() {
  return (
    <SectionVisualGrid cols={3}>
      <CroppedFrame label="No-show trend">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-rose-600" />
          <p className="text-xs font-semibold text-slate-800">Weekly no-shows</p>
        </div>
        <p className="mt-2 text-2xl font-bold tabular-nums text-rose-700">28% → 12%</p>
        <p className="text-[10px] text-slate-500">After WhatsApp reminder flows</p>
        <MiniBars heights={[88, 82, 75, 68, 55, 42, 28]} accent="bg-rose-400" />
      </CroppedFrame>
      <CroppedFrame label="Reminder open rate">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-50 p-2 text-center ring-1 ring-slate-200/80">
            <p className="text-[9px] text-slate-500">SMS</p>
            <p className="mt-1 text-sm font-bold text-slate-600">19%</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2 text-center ring-1 ring-emerald-200/80">
            <WhatsAppIcon className="mx-auto h-4 w-4 text-[#128c7e]" />
            <p className="mt-1 text-sm font-bold text-emerald-700">91%</p>
          </div>
        </div>
        <p className="mt-2 text-[9px] text-slate-500">Appointment reminders</p>
      </CroppedFrame>
      <CroppedFrame label="Follow-up gap">
        <p className="text-[10px] text-slate-500">Visit → lab → follow-up</p>
        <ProgressRows
          accent="bg-sky-500"
          rows={[
            { stage: 'Visit done', pct: 100 },
            { stage: 'Lab sent', pct: 72 },
            { stage: 'Result read', pct: 58 },
            { stage: 'Re-booked', pct: 34 },
          ]}
        />
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function HealthcareHelpsVisuals() {
  return (
    <SectionVisualGrid cols={3}>
      <CroppedFrame label="Appointment reminder">
        <div className="rounded-lg bg-[#e7f8ef] p-2.5 ring-1 ring-[#25d366]/20">
          <p className="text-[10px] font-medium text-[#128c7e]">Dr. Mehta · tomorrow 10:30 AM</p>
          <p className="mt-1 text-xs text-slate-800">Confirm or reschedule in one tap</p>
          <div className="mt-2 flex gap-1.5">
            <span className="flex-1 rounded-md bg-[#128c7e] py-1 text-center text-[9px] font-semibold text-white">Confirm</span>
            <span className="flex-1 rounded-md border border-[#128c7e]/40 py-1 text-center text-[9px] font-semibold text-[#128c7e]">
              Reschedule
            </span>
          </div>
        </div>
        <p className="mt-2 text-[9px] text-slate-500">Read · 4m ago</p>
      </CroppedFrame>
      <CroppedFrame label="Patient inbox">
        <ul className="space-y-1.5">
          {[
            { name: 'Priya S.', tag: 'Follow-up', state: 'Urgent' },
            { name: 'Ramesh K.', tag: 'Lab results', state: 'New' },
            { name: 'Anita M.', tag: 'Rx query', state: 'Open' },
          ].map((row) => (
            <li
              key={row.name}
              className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50/80 px-2 py-1.5"
            >
              <div>
                <p className="text-[11px] font-semibold text-slate-800">{row.name}</p>
                <p className="text-[9px] text-slate-500">{row.tag}</p>
              </div>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                  row.state === 'Urgent' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'
                }`}
              >
                {row.state}
              </span>
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="Lab result ping">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-sky-600" />
          <p className="text-[11px] font-semibold text-slate-800">Results ready</p>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          {[
            { l: 'Sent', v: '124' },
            { l: 'Opened', v: '112' },
            { l: 'Booked', v: '41' },
          ].map((s) => (
            <div key={s.l} className="rounded-md bg-slate-50 py-1.5 ring-1 ring-slate-100">
              <p className="text-[8px] uppercase text-slate-500">{s.l}</p>
              <p className="text-xs font-bold tabular-nums text-slate-900">{s.v}</p>
            </div>
          ))}
        </div>
        <MiniBars heights={[40, 52, 48, 65, 72, 80, 88]} accent="bg-sky-500" />
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function HealthcareProofVisuals() {
  return (
    <SectionVisualGrid cols={2} className="mt-0 max-w-none lg:grid-cols-1">
      <CroppedFrame label="Live chat · patients">
        <ul className="space-y-1.5">
          {[
            { name: 'Priya Sharma', preview: 'Can I reschedule to Friday?', time: '2m', unread: 1 },
            { name: 'Ramesh Verma', preview: 'Received lab report, thanks', time: '18m', unread: 0 },
            { name: 'Metro Dental', preview: 'Post-op care instructions', time: '1h', unread: 0 },
          ].map((c) => (
            <li
              key={c.name}
              className={`flex items-center justify-between rounded-md px-2 py-1.5 text-[10px] ${
                c.unread ? 'bg-emerald-50/80 ring-1 ring-emerald-100' : 'bg-slate-50'
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">{c.name}</p>
                <p className="truncate text-slate-500">{c.preview}</p>
              </div>
              <span className="shrink-0 tabular-nums text-slate-400">{c.time}</span>
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="Front desk SLA">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] text-slate-500">Median first reply</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-700">4m</p>
          </div>
          <Stethoscope className="h-8 w-8 text-sky-600/35" />
        </div>
        <MiniBars heights={[45, 50, 42, 38, 35, 32, 28]} />
      </CroppedFrame>
      <CroppedFrame label="Utility templates">
        <div className="space-y-1.5">
          {[
            { name: 'appointment_reminder', status: 'Approved' },
            { name: 'lab_result_ready', status: 'Approved' },
            { name: 'rx_followup_v2', status: 'Approved' },
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

function HealthcareModulesVisuals() {
  return (
    <SectionVisualGrid cols={2}>
      <CroppedFrame label="Clinic playbook">
        <ul className="space-y-1.5">
          {['Appointment reminders', 'Patient inbox', 'Lab result flows', 'Recall broadcasts'].map((item) => (
            <li key={item} className="flex items-center gap-2 text-[11px] text-slate-700">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </CroppedFrame>
      <CroppedFrame label="Multi-branch">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <HeartPulse className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-800">4 clinics · 1 number</p>
            <p className="text-[10px] text-slate-500">Andheri · Bandra · Thane</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <KpiTile label="Coordinators" value="6" sub="On duty today" icon={Users} tone="sky" />
          <KpiTile label="Flows live" value="9" sub="Reminders + lab" icon={Pill} tone="emerald" />
        </div>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

function HealthcareWorkflowVisuals() {
  return (
    <SectionVisualGrid cols={4}>
      {[
        { step: '1', title: 'Book', metric: '64 today', icon: Calendar },
        { step: '2', title: 'Remind', metric: '91% opened', icon: MessageSquare },
        { step: '3', title: 'Care', metric: 'Rx + prep', icon: Pill },
        { step: '4', title: 'Follow-up', metric: '+41 rebooks', icon: Activity },
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

function HealthcareHonestyVisuals() {
  return (
    <SectionVisualGrid cols={2}>
      <CroppedFrame label="Shipped today">
        <div className="flex flex-wrap gap-1.5">
          {['Inbox', 'Templates', 'Reminders', 'Broadcasts'].map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200/80"
            >
              {chip}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-slate-500">Clinic playbooks included</p>
      </CroppedFrame>
      <CroppedFrame label="Roadmap">
        <div className="flex flex-wrap gap-1.5">
          {['EMR sync', 'Rx PDF vault'].map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200/70"
            >
              {chip}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-slate-500">Planned · optional later</p>
      </CroppedFrame>
    </SectionVisualGrid>
  );
}

export const healthcareSectionVisuals: Partial<Record<IndustrySectionVisualId, ReactNode>> = {
  hero: <HealthcareHeroVisuals />,
  problem: <HealthcareProblemVisuals />,
  helps: <HealthcareHelpsVisuals />,
  proof: <HealthcareProofVisuals />,
  modules: <HealthcareModulesVisuals />,
  workflow: <HealthcareWorkflowVisuals />,
  honesty: <HealthcareHonestyVisuals />,
};
