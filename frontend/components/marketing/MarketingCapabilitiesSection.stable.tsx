'use client';

/**
 * Stable v1 — icon + text cards only (no dashboard snippets).
 * Kept for reference / rollback.
 */
import { motion } from 'framer-motion';
import { BarChart3, Bot, ListChecks, Users } from 'lucide-react';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import { capabilitiesSectionCopy, marketingCapabilities } from '@/components/marketing/marketing-landing-data';

const CAP_ICONS = [Users, BarChart3, Bot, ListChecks];

export function MarketingCapabilitiesSectionStable() {
  return (
    <MarketingSection
      id="features"
      eyebrow={capabilitiesSectionCopy.eyebrow}
      title={capabilitiesSectionCopy.titleMain}
      titleHighlight={capabilitiesSectionCopy.titleHighlight}
      subtitle={capabilitiesSectionCopy.subtitle}
      tone="whisper"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {marketingCapabilities.map((cap, i) => {
          const Icon = CAP_ICONS[i] ?? Users;
          return (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="marketing-feature-card flex gap-4 rounded-2xl p-5 sm:p-6"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-black/[0.06]">
                <Icon className="marketing-icon-wa h-5 w-5" strokeWidth={1.75} />
              </span>
              <div>
                <h3 className="font-semibold text-[#111111]">{cap.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#6d6c6b]">{cap.body}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </MarketingSection>
  );
}
