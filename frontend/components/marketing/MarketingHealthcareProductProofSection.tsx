'use client';

import type { ReactNode } from 'react';
import {
  Bell,
  Calendar,
  Check,
  FileText,
  MessageSquare,
  Shield,
  Stethoscope,
  UserCheck,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';
import { MiniBars } from '@/components/marketing/MarketingIndustryMockPrimitives';
import type { SolutionDetailPageData } from '@/components/marketing/marketing-solution-detail-data';

type HealthcareProof = NonNullable<SolutionDetailPageData['proof']>;

const FEATURE_ICONS: Record<'users' | 'message' | 'shield', LucideIcon> = {
  users: Users,
  message: MessageSquare,
  shield: Shield,
};

const FEATURE_TONES: Record<'violet' | 'emerald' | 'sky', string> = {
  violet: 'bg-violet-100 text-violet-700 ring-violet-200/80',
  emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-200/80',
  sky: 'bg-sky-100 text-sky-700 ring-sky-200/80',
};

const JOURNEY_ICONS: Record<
  NonNullable<HealthcareProof['journeySteps']>[number]['icon'],
  LucideIcon
> = {
  calendar: Calendar,
  bell: Bell,
  user: UserCheck,
  document: FileText,
  followup: Users,
};

const JOURNEY_TONES: Record<'violet' | 'emerald' | 'sky' | 'orange', string> = {
  violet: 'bg-violet-100 text-violet-700 ring-violet-200/70',
  emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-200/70',
  sky: 'bg-sky-100 text-sky-700 ring-sky-200/70',
  orange: 'bg-orange-100 text-orange-700 ring-orange-200/70',
};

const JOURNEY_CHECK: Record<'violet' | 'emerald' | 'sky' | 'orange', string> = {
  violet: 'bg-violet-600',
  emerald: 'bg-emerald-600',
  sky: 'bg-sky-600',
  orange: 'bg-orange-500',
};

const STAFF_AVATARS = [
  { initials: 'AK', bg: 'bg-violet-200 text-violet-800' },
  { initials: 'PS', bg: 'bg-sky-200 text-sky-800' },
  { initials: 'RV', bg: 'bg-emerald-200 text-emerald-800' },
  { initials: 'AM', bg: 'bg-amber-200 text-amber-800' },
];

function MockCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-black/[0.06] bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] sm:p-3.5 ${className}`}
    >
      {children}
    </div>
  );
}

function LiveActivityCard() {
  const events = [
    { text: 'Reminder sent to Priya S.', time: '2m ago' },
    { text: 'Lab report shared with Ramesh V.', time: '5m ago' },
    { text: 'Follow-up assigned to Anita M.', time: '8m ago' },
  ];
  return (
    <MockCard className="w-[min(100%,13.5rem)]">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
          <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#52525b]">Live activity</p>
      </div>
      <ul className="mt-2.5 space-y-2">
        {events.map((e) => (
          <li key={e.text} className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-medium leading-snug text-[#27272a]">{e.text}</p>
              <p className="text-[9px] text-[#a1a1aa]">{e.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </MockCard>
  );
}

function FrontDeskSlaCard() {
  return (
    <MockCard className="relative w-[min(100%,13.5rem)] overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#a1a1aa]">Front desk SLA</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 ring-1 ring-emerald-200/80">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          Online
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <p className="text-[10px] text-[#71717a]">Median first reply</p>
          <p className="text-2xl font-bold tabular-nums text-emerald-700">4m</p>
        </div>
        <Stethoscope className="h-9 w-9 text-sky-500/25" aria-hidden />
      </div>
      <MiniBars heights={[52, 48, 44, 40, 36, 32, 28]} accent="bg-sky-400" />
    </MockCard>
  );
}

function LiveChatPatientsCard() {
  const chats = [
    {
      name: 'Priya Sharma',
      preview: 'Can I reschedule to Friday?',
      time: '2m',
      badge: 'NEW',
      badgeClass: 'bg-emerald-100 text-emerald-800',
      avatar: 'PS',
      avatarBg: 'bg-violet-200 text-violet-800',
    },
    {
      name: 'Ramesh Verma',
      preview: 'Received lab report, thanks',
      time: '18m',
      badge: 'OPEN',
      badgeClass: 'bg-sky-100 text-sky-800',
      avatar: 'RV',
      avatarBg: 'bg-sky-200 text-sky-800',
    },
    {
      name: 'Metro Dental',
      preview: 'Post-op care instructions',
      time: '1h',
      badge: 'PENDING',
      badgeClass: 'bg-violet-100 text-violet-800',
      avatar: 'MD',
      avatarBg: 'bg-amber-200 text-amber-800',
    },
  ];
  return (
    <MockCard className="w-[min(100%,17.5rem)]">
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#a1a1aa]">Live chat · patients</p>
      <div className="mt-2 flex gap-1 border-b border-black/[0.06] pb-2 text-[9px] font-semibold text-[#a1a1aa]">
        <span className="border-b-2 border-[#128c7e] pb-1 text-[#27272a]">All chats</span>
        <span className="pb-1 pl-2">Assigned</span>
      </div>
      <ul className="mt-2 space-y-2">
        {chats.map((c) => (
          <li key={c.name} className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${c.avatarBg}`}
            >
              {c.avatar}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className="truncate text-[11px] font-semibold text-[#111111]">{c.name}</p>
                <span className="shrink-0 text-[9px] tabular-nums text-[#a1a1aa]">{c.time}</span>
              </div>
              <p className="truncate text-[10px] text-[#71717a]">{c.preview}</p>
            </div>
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${c.badgeClass}`}>
              {c.badge}
            </span>
          </li>
        ))}
      </ul>
    </MockCard>
  );
}

function AssignedToCard() {
  return (
    <MockCard className="w-[min(100%,11.5rem)]">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
          <Users className="h-3 w-3" strokeWidth={2.5} />
        </span>
        <p className="text-[10px] font-semibold text-[#27272a]">Assigned to</p>
      </div>
      <p className="mt-1 text-[11px] font-bold text-[#111111]">Front Desk</p>
      <div className="mt-2 flex items-center">
        {['FD', 'AK', 'PS'].map((initials, i) => (
          <span
            key={initials}
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[9px] font-bold text-slate-700 ${i > 0 ? '-ml-2' : ''}`}
          >
            {initials}
          </span>
        ))}
        <span className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[9px] font-semibold text-[#71717a]">
          +2
        </span>
      </div>
    </MockCard>
  );
}

function UtilityTemplatesCard() {
  const templates = [
    { name: 'appointment_reminder', status: 'Approved' },
    { name: 'lab_result_ready', status: 'Approved' },
    { name: 'rx_followup_v2', status: 'Approved' },
  ];
  return (
    <MockCard className="w-[min(100%,13rem)]">
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#a1a1aa]">Utility templates</p>
      <ul className="mt-2 space-y-1.5">
        {templates.map((t) => (
          <li key={t.name} className="flex items-center justify-between gap-2">
            <span className="truncate font-mono text-[9px] font-medium text-[#3f3f46]">{t.name}</span>
            <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-800">
              {t.status}
            </span>
          </li>
        ))}
      </ul>
    </MockCard>
  );
}

function WhatsAppPreviewCard() {
  return (
    <MockCard className="relative w-[min(100%,14.5rem)] overflow-visible pb-4">
      <div className="mb-2 flex items-center gap-2 border-b border-black/[0.06] pb-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-200 text-[10px] font-bold text-violet-800">
          PS
        </span>
        <div>
          <p className="text-[11px] font-semibold text-[#111111]">Priya Sharma</p>
          <p className="text-[9px] text-[#a1a1aa]">online</p>
        </div>
      </div>
      <div className="space-y-2 rounded-xl bg-[#e5ddd5]/40 p-2">
        <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-none bg-[#dcf8c6] px-2 py-1.5 text-[10px] leading-snug text-[#111111] shadow-sm">
          Hi, I need to reschedule my appointment to Friday please.
        </div>
        <div className="max-w-[85%] rounded-lg rounded-tl-none bg-white px-2 py-1.5 text-[10px] leading-snug text-[#111111] shadow-sm">
          Sure Priya — we have 10:30 AM or 4:00 PM on Friday. Which works?
        </div>
        <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-none bg-[#dcf8c6] px-2 py-1.5 text-[10px] leading-snug text-[#111111] shadow-sm">
          10:30 AM works. Thank you!
        </div>
      </div>
      <div
        className="absolute -bottom-3 -right-3 flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.06] bg-white shadow-lg"
        aria-hidden
      >
        <WhatsAppIcon className="h-6 w-6 text-[#128c7e]" />
      </div>
    </MockCard>
  );
}

function MockCollage() {
  return (
    <div className="relative mx-auto min-h-[28rem] w-full max-w-xl sm:min-h-[32rem] lg:mx-0 lg:max-w-none">
      {/* faint connector dots */}
      <div
        className="pointer-events-none absolute left-[38%] top-[28%] hidden h-24 w-px border-l border-dashed border-violet-300/50 lg:block"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[32%] top-[22%] hidden h-20 w-px border-l border-dashed border-violet-300/50 lg:block"
        aria-hidden
      />

      <div className="absolute left-0 top-0 z-20">
        <LiveActivityCard />
      </div>
      <div className="absolute right-0 top-0 z-20">
        <FrontDeskSlaCard />
      </div>
      <div className="absolute left-1/2 top-[4.5rem] z-30 -translate-x-1/2">
        <LiveChatPatientsCard />
      </div>
      <div className="absolute right-0 top-[11rem] z-20 hidden sm:block">
        <AssignedToCard />
      </div>
      <div className="absolute bottom-[7.5rem] left-0 z-20">
        <UtilityTemplatesCard />
      </div>
      <div className="absolute bottom-0 right-0 z-40 sm:right-2">
        <WhatsAppPreviewCard />
      </div>
      <div
        className="absolute bottom-[6.5rem] left-[42%] z-10 hidden h-11 w-11 items-center justify-center rounded-xl border border-black/[0.06] bg-white shadow-md sm:flex"
        aria-hidden
      >
        <WhatsAppIcon className="h-6 w-6 text-[#128c7e]" />
      </div>
    </div>
  );
}

function PatientJourneyBar({
  steps,
}: {
  steps: NonNullable<HealthcareProof['journeySteps']>;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white/90 px-4 py-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] sm:px-6 sm:py-6">
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#a1a1aa]">
        Patient journey workflow
      </p>
      <ol className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        {steps.map((step, i) => {
          const Icon = JOURNEY_ICONS[step.icon];
          return (
            <li key={step.title} className="flex flex-1 items-center gap-2 sm:flex-col sm:gap-2 sm:text-center">
              <div className="relative flex shrink-0 flex-col items-center">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${JOURNEY_TONES[step.tone]}`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <span
                  className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-white ${JOURNEY_CHECK[step.tone]}`}
                >
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              </div>
              <p className="text-[11px] font-semibold leading-snug text-[#27272a] sm:max-w-[7rem]">{step.title}</p>
              {i < steps.length - 1 ? (
                <span
                  className="ml-auto hidden h-px flex-1 bg-gradient-to-r from-[#e4e4e7] to-transparent sm:ml-0 sm:mt-0 sm:block sm:h-0 sm:w-full sm:flex-none sm:border-t sm:border-dashed sm:border-[#d4d4d8]"
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

type MarketingHealthcareProductProofSectionProps = {
  proof: HealthcareProof;
};

export function MarketingHealthcareProductProofSection({ proof }: MarketingHealthcareProductProofSectionProps) {
  const features = proof.features ?? [];
  const journeySteps = proof.journeySteps ?? [];
  const staffCount = proof.staffActive ?? 12;

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-x-12 lg:gap-y-0 xl:gap-x-16">
        {/* Left — copy */}
        <div className="text-left">
          <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-700 ring-1 ring-violet-200/70">
            {proof.eyebrow}
          </span>
          <h2 className="marketing-section-title mt-4 text-left text-[#111111]">
            <span className="marketing-section-title__line">{proof.title}</span>
            <span className="marketing-section-title__line mt-0.5">
              <span className="text-gradient-marketing">{proof.titleGradient ?? proof.titleHighlight}</span>
              {proof.titleAccent ? (
                <span className="text-[#6d28d9]"> {proof.titleAccent}</span>
              ) : null}
            </span>
          </h2>
          {proof.subtitle ? (
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#6d6c6b] sm:text-base">{proof.subtitle}</p>
          ) : null}

          <ul className="mt-8 space-y-5">
            {features.map((f) => {
              const Icon = FEATURE_ICONS[f.icon];
              return (
                <li key={f.title} className="flex gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ${FEATURE_TONES[f.tone]}`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#111111]">{f.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#6d6c6b]">{f.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-black/[0.06] bg-white px-4 py-2.5 shadow-sm">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              active
            </span>
            <div className="flex items-center">
              {STAFF_AVATARS.map((a, i) => (
                <span
                  key={a.initials}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold ${a.bg} ${i > 0 ? '-ml-2' : ''}`}
                >
                  {a.initials}
                </span>
              ))}
            </div>
            <p className="text-sm text-[#71717a]">
              <span className="font-semibold tabular-nums text-[#27272a]">{staffCount}</span> staff members active now
            </p>
          </div>
        </div>

        {/* Right — mock collage */}
        <MockCollage />
      </div>

      {journeySteps.length > 0 ? <PatientJourneyBar steps={journeySteps} /> : null}
    </div>
  );
}
