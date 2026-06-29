'use client';

import { motion } from 'framer-motion';
import { MarketingProblemCards } from '@/components/marketing/MarketingProblemCards';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import { problemsSectionCopy } from '@/components/marketing/marketing-landing-data';

export function MarketingProblemsSection() {
  return (
    <MarketingSection
      id="problem"
      eyebrow={problemsSectionCopy.eyebrow}
      title={problemsSectionCopy.titleMain}
      titleHighlight={problemsSectionCopy.titleHighlight}
      subtitle={problemsSectionCopy.subtitle}
      tone="whisper"
    >
      <MarketingProblemCards />

      <motion.aside
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto mt-12 max-w-4xl rounded-2xl border border-black/[0.06] bg-gradient-to-br from-white via-white to-[#faf5ff] px-6 py-10 text-center sm:mt-14 sm:px-10 sm:py-14"
      >
        <h3 className="marketing-section-title text-[#111111]">
          <span className="marketing-section-title__line">{problemsSectionCopy.calloutTitle}</span>
        </h3>
        <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-relaxed text-[#52525b] sm:mt-6 sm:text-lg sm:leading-[1.6] lg:text-xl">
          {problemsSectionCopy.calloutBody}
        </p>
      </motion.aside>
    </MarketingSection>
  );
}
