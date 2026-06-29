'use client';

import {
  Activity,
  CalendarX,
  FileStack,
  MessageCircle,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';
import {
  MiniBars,
  MockExampleWorkspaceLabel,
} from '@/components/marketing/MarketingIndustryMockPrimitives';
import {
  MARKETING_HEALTHCARE_CLINIC_OPS_COMPARE_LOCAL,
  MARKETING_HEALTHCARE_CLINIC_OPS_COMPARE_URL,
} from '@/lib/marketing/assets';
import type { HealthcarePainCard } from '@/components/marketing/marketing-solution-detail-data';

const PAIN_ICONS: Record<HealthcarePainCard['icon'], LucideIcon> = {
  calendar: CalendarX,
  message: MessageCircle,
  users: Users,
  files: FileStack,
};

const PAIN_ICON_TONES: Record<HealthcarePainCard['tone'], string> = {
  rose: 'bg-rose-100 text-rose-600 ring-rose-200/80',
  amber: 'bg-amber-100 text-amber-700 ring-amber-200/80',
  violet: 'bg-violet-100 text-violet-700 ring-violet-200/80',
  sky: 'bg-sky-100 text-sky-700 ring-sky-200/80',
};

type MarketingHealthcareClinicOperationsSectionProps = {
  painCards: readonly HealthcarePainCard[];
};

export function MarketingHealthcareClinicOperationsSection({
  painCards,
}: MarketingHealthcareClinicOperationsSectionProps) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 sm:space-y-10">
      {/* Row 1 — four glossy pain cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3.5">
        {painCards.map((card, i) => {
          const Icon = PAIN_ICONS[card.icon];
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="marketing-problem-glass-card relative rounded-2xl px-3.5 py-4 sm:px-4 sm:py-4"
            >
              <span
                className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-[#a1a1aa] ring-1 ring-black/[0.06]"
                aria-hidden
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </span>
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${PAIN_ICON_TONES[card.tone]}`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <p className="mt-3 pr-6 text-[13px] font-semibold leading-snug text-[#111111] sm:text-sm">
                {card.title}
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#6d6c6b] sm:text-[12px]">{card.body}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Row 2 — before / after comparison image */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_16px_48px_rgba(17,17,17,0.08)] ring-1 ring-black/[0.04]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] bg-[#fafaf9] px-4 py-3 sm:px-5">
          <span className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-700 ring-1 ring-rose-200/80">
            Before — Manual chaos
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-800 ring-1 ring-emerald-200/80">
            With ReplySys — Organized &amp; clear
          </span>
        </div>
        <img
          src={MARKETING_HEALTHCARE_CLINIC_OPS_COMPARE_URL}
          alt="Before: manual clinic reminders and scattered WhatsApp; After: ReplySys clinic dashboard with appointments and workflows"
          width={1400}
          height={720}
          className="h-auto w-full object-cover object-center"
          decoding="async"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src !== MARKETING_HEALTHCARE_CLINIC_OPS_COMPARE_LOCAL) {
              img.src = MARKETING_HEALTHCARE_CLINIC_OPS_COMPARE_LOCAL;
            }
          }}
        />
      </motion.div>

      {/* Row 3 — outcome stats */}
      <div>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm ring-1 ring-black/[0.04] sm:p-5"
          >
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-rose-600" />
              <p className="text-xs font-semibold text-slate-800">Weekly no-shows</p>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-rose-700 sm:text-3xl">28% → 12%</p>
            <p className="mt-1 text-[10px] text-slate-500">After WhatsApp reminder flows</p>
            <MiniBars heights={[88, 82, 75, 68, 55, 42, 28]} accent="bg-rose-400" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm ring-1 ring-black/[0.04] sm:p-5"
          >
            <p className="text-xs font-semibold text-slate-800">Reminder open rate</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-50 p-3 text-center ring-1 ring-slate-200/80">
                <p className="text-[10px] font-medium text-slate-500">SMS</p>
                <p className="mt-1 text-xl font-bold text-slate-600">19%</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-200/80">
                <WhatsAppIcon className="mx-auto h-5 w-5 text-[#128c7e]" />
                <p className="mt-1 text-xl font-bold text-emerald-700">91%</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">Appointment reminders</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm ring-1 ring-black/[0.04] sm:p-5"
          >
            <p className="text-xs font-semibold text-slate-800">Follow-up completion</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">65%</p>
            <p className="mt-1 text-[10px] text-slate-500">Visit → lab → follow-up done</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-sky-400 to-violet-500" />
            </div>
          </motion.div>
        </div>
        <MockExampleWorkspaceLabel className="mt-2 text-right" />
      </div>
    </div>
  );
}
