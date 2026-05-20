'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { GitBranch, Inbox, Send } from 'lucide-react';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import { marketingPillars, pillarsSectionCopy } from '@/components/marketing/marketing-landing-data';
import { MarketingTrustMarquee } from '@/components/marketing/MarketingTrustMarquee';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';

const PILLAR_ICONS = [Inbox, Send, GitBranch];

export function MarketingProductPillarsSection() {
  return (
    <MarketingSection
      id="platform"
      eyebrow={pillarsSectionCopy.eyebrow}
      title={pillarsSectionCopy.titleMain}
      titleHighlight={pillarsSectionCopy.titleHighlight}
      subtitle={pillarsSectionCopy.subtitle}
      tone="whisper"
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {marketingPillars.map((pillar, i) => {
          const Icon = PILLAR_ICONS[i] ?? Inbox;
          return (
            <motion.article
              key={pillar.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="marketing-feature-card flex flex-col rounded-2xl p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4f3ef]">
                  <Icon className="marketing-icon-wa h-5 w-5" strokeWidth={1.75} />
                </span>
                <WhatsAppIcon className="marketing-icon-wa h-5 w-5 opacity-40" />
              </div>
              <h3 className="text-lg font-semibold text-[#111111]">{pillar.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[#6d6c6b]">{pillar.description}</p>
              <Link
                href={pillar.href}
                className="marketing-text-wa mt-5 text-sm font-semibold hover:underline"
              >
                Learn more →
              </Link>
            </motion.article>
          );
        })}
      </div>
      <MarketingTrustMarquee tone="whisper" className="mt-12 sm:mt-14" />
    </MarketingSection>
  );
}
