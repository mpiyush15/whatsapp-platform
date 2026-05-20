'use client';

import { motion } from 'framer-motion';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import { MarketingCapabilitySnippet } from '@/components/marketing/MarketingCapabilitySnippets';
import { capabilitiesSectionCopy, marketingCapabilities } from '@/components/marketing/marketing-landing-data';
import type { CapabilityMockId } from '@/components/marketing/marketing-capability-mock-data';

export function MarketingCapabilitiesSection() {
  return (
    <MarketingSection
      id="features"
      eyebrow={capabilitiesSectionCopy.eyebrow}
      title={capabilitiesSectionCopy.titleMain}
      titleHighlight={capabilitiesSectionCopy.titleHighlight}
      subtitle={capabilitiesSectionCopy.subtitle}
      tone="whisper"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {marketingCapabilities.map((cap, i) => (
          <motion.article
            key={cap.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: i * 0.07, duration: 0.4 }}
            className="marketing-feature-card marketing-capability-card overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_2px_16px_rgba(17,17,17,0.05)]"
          >
            <MarketingCapabilitySnippet type={cap.mock as CapabilityMockId} />
            <div className="p-5 sm:p-6">
              <h3 className="text-base font-semibold tracking-tight text-[#111111] sm:text-lg">
                {cap.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6d6c6b]">{cap.body}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </MarketingSection>
  );
}
