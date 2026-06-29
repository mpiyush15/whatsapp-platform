'use client';

import { Check, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import {
  featuresCompareSectionCopy,
  featuresIncludedToday,
  featuresRoadmap,
} from '@/components/marketing/marketing-features-pages-data';

export function MarketingFeaturesCompareSection() {
  const copy = featuresCompareSectionCopy;

  return (
    <MarketingSection
      id="compare-honest"
      eyebrow={copy.eyebrow}
      title={copy.title}
      titleHighlight={copy.titleHighlight}
      subtitle={copy.subtitle}
      tone="whisper"
      accent="whatsapp"
    >
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="marketing-features-compare-card marketing-features-compare-card--included rounded-2xl border border-black/[0.06] bg-white p-7 sm:p-8"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-700">
              <Check className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div>
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#111111]">Included today</h3>
              <p className="text-xs text-[#6d6c6b]">Live in production for new projects</p>
            </div>
          </div>

          <ul className="mt-6 space-y-3">
            {featuresIncludedToday.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-[#3f3f46]">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80"
                  aria-hidden
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.06, duration: 0.45 }}
          className="marketing-features-compare-card marketing-features-compare-card--roadmap rounded-2xl border border-dashed border-black/[0.12] bg-white/70 p-7 sm:p-8"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200/80 bg-amber-50 text-amber-800">
              <Clock className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#111111]">On the roadmap</h3>
              <p className="text-xs text-[#6d6c6b]">Planned — we won’t claim these until they ship</p>
            </div>
          </div>

          <ul className="mt-6 space-y-4">
            {featuresRoadmap.map((item) => (
              <li key={item.id} className="border-t border-black/[0.05] pt-4 first:border-t-0 first:pt-0">
                <p className="text-sm font-semibold text-[#111111]">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[#6d6c6b]">{item.description}</p>
              </li>
            ))}
          </ul>
        </motion.article>
      </div>
    </MarketingSection>
  );
}
