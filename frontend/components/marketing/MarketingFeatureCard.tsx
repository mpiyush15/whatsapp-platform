'use client';

import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import type { FeatureCardCategory, FeatureCardStatus } from '@/components/marketing/marketing-features-pages-data';

const CATEGORY_STYLES: Record<FeatureCardCategory, string> = {
  Chats: 'bg-sky-50 text-sky-800 border-sky-200/80',
  Marketing: 'bg-orange-50 text-orange-900 border-orange-200/80',
  Reports: 'bg-violet-50 text-violet-900 border-violet-200/80',
};

type MarketingFeatureCardProps = {
  title: string;
  description: string;
  category: FeatureCardCategory;
  icon: LucideIcon;
  status?: FeatureCardStatus;
  index?: number;
};

export function MarketingFeatureCard({
  title,
  description,
  category,
  icon: Icon,
  status = 'shipped',
  index = 0,
}: MarketingFeatureCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      className="marketing-feature-grid-card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_16px_rgba(17,17,17,0.04)] transition duration-300 hover:-translate-y-0.5 hover:border-black/[0.1] hover:shadow-[0_12px_40px_rgba(17,17,17,0.08)] sm:p-7"
    >
      <div className="marketing-feature-grid-card__mesh pointer-events-none absolute inset-0 opacity-[0.45]" aria-hidden />

      <div className="relative flex items-start justify-between gap-3">
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] ${CATEGORY_STYLES[category]}`}
        >
          {category}
        </span>
        {status === 'partial' ? (
          <span className="rounded-md border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900">
            Beta
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-[#a1a1aa]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            Live
          </span>
        )}
      </div>

      <div className="relative mt-5 flex h-12 w-12 items-center justify-center rounded-xl border border-black/[0.06] bg-[#fafaf9] shadow-sm transition group-hover:border-black/[0.08] group-hover:bg-white">
        <Icon className="h-5 w-5 text-[#3f3f46]" strokeWidth={1.75} />
      </div>

      <h3 className="relative mt-5 text-lg font-semibold tracking-[-0.02em] text-[#111111]">{title}</h3>
      <p className="relative mt-2 flex-1 text-sm leading-relaxed text-[#6d6c6b]">{description}</p>

      <div
        className="relative mt-6 flex items-center gap-2 border-t border-black/[0.05] pt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[#a1a1aa]"
        aria-hidden
      >
        <span className="text-[#d4d4d8]">//</span>
        <span className="text-[#71717a]">whatsapp.cloud</span>
      </div>
    </motion.article>
  );
}
