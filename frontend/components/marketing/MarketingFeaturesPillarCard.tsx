'use client';

import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { FeaturesPillarAccent } from '@/components/marketing/marketing-features-pages-data';

const ACCENT_STYLES: Record<
  FeaturesPillarAccent,
  { card: string; label: string; icon: string; index: string; bullet: string }
> = {
  messaging: {
    card: 'marketing-features-pillar-card--messaging',
    label: 'bg-sky-50 text-sky-900 border-sky-200/80',
    icon: 'bg-sky-50 text-sky-700 border-sky-200/70',
    index: 'text-sky-200/90',
    bullet: 'text-sky-700',
  },
  growth: {
    card: 'marketing-features-pillar-card--growth',
    label: 'bg-orange-50 text-orange-900 border-orange-200/80',
    icon: 'bg-orange-50 text-orange-800 border-orange-200/70',
    index: 'text-orange-200/90',
    bullet: 'text-orange-700',
  },
  intelligence: {
    card: 'marketing-features-pillar-card--intelligence',
    label: 'bg-violet-50 text-violet-900 border-violet-200/80',
    icon: 'bg-violet-50 text-violet-800 border-violet-200/70',
    index: 'text-violet-200/90',
    bullet: 'text-violet-700',
  },
};

type MarketingFeaturesPillarCardProps = {
  index: string;
  accent: FeaturesPillarAccent;
  label: string;
  title: string;
  description: string;
  bullets: readonly string[];
  icon: LucideIcon;
  animationIndex?: number;
};

export function MarketingFeaturesPillarCard({
  index,
  accent,
  label,
  title,
  description,
  bullets,
  icon: Icon,
  animationIndex = 0,
}: MarketingFeaturesPillarCardProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{ duration: 0.5, delay: animationIndex * 0.08 }}
      className={`marketing-features-pillar-card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-7 shadow-[0_4px_24px_rgba(17,17,17,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(17,17,17,0.09)] sm:p-8 ${styles.card}`}
    >
      <span
        className={`pointer-events-none absolute -right-2 -top-4 select-none font-mono text-[5.5rem] font-bold leading-none tracking-[-0.06em] ${styles.index}`}
        aria-hidden
      >
        {index}
      </span>

      <div className="relative flex items-start justify-between gap-4">
        <span
          className={`inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${styles.label}`}
        >
          {label}
        </span>
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-sm transition group-hover:scale-105 ${styles.icon}`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      </div>

      <h3 className="relative mt-6 text-xl font-semibold tracking-[-0.02em] text-[#111111] sm:text-[1.35rem]">
        {title}
      </h3>
      <p className="relative mt-3 text-sm leading-relaxed text-[#6d6c6b] sm:text-[0.9375rem]">{description}</p>

      <ul className="relative mt-6 flex flex-1 flex-col gap-2.5">
        {bullets.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-[#3f3f46]">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/[0.06] ${styles.bullet}`}
              aria-hidden
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            {item}
          </li>
        ))}
      </ul>

      <Link
        href="#features-grid"
        className="marketing-text-wa relative mt-8 inline-flex items-center gap-1 text-sm font-semibold transition hover:gap-2"
      >
        Explore capabilities
        <span aria-hidden>→</span>
      </Link>
    </motion.article>
  );
}
