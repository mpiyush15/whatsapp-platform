'use client';

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { FeaturesVerticalCalloutConfig } from '@/components/marketing/marketing-features-pages-data';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';

type MarketingFeaturesVerticalCalloutProps = {
  config: FeaturesVerticalCalloutConfig;
};

export function MarketingFeaturesVerticalCallout({ config }: MarketingFeaturesVerticalCalloutProps) {
  const {
    tagLabel,
    badge,
    body,
    bullets,
    cta,
    ctaHref,
    modulePanelLabel,
    modules,
    theme,
  } = config;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5 }}
      className={`marketing-features-vertical-callout marketing-features-vertical-callout--${theme.variant} overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(17,17,17,0.06)]`}
    >
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${theme.tagPill}`}
            >
              <WhatsAppIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
              {tagLabel}
            </span>
            <span
              className={`rounded-md border px-2.5 py-1 text-[10px] font-semibold ${theme.badge}`}
            >
              {badge}
            </span>
          </div>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-[#52525b] sm:text-[1.0625rem]">{body}</p>

          <ul className="mt-6 space-y-2 text-sm text-[#3f3f46]">
            {bullets.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${theme.bulletDot}`} aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <Link
              href={ctaHref}
              className="marketing-cta-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
            >
              {cta}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className={`border-t border-black/[0.06] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10 ${theme.panel}`}>
          <p className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#a1a1aa]">
            {modulePanelLabel}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map((mod, i) => (
              <ModuleTile key={mod.id} mod={mod} index={i} iconBoxClass={theme.iconBox} hoverBorderClass={theme.moduleHover} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ModuleTile({
  mod,
  index,
  iconBoxClass,
  hoverBorderClass,
}: {
  mod: { id: string; title: string; description: string; icon: LucideIcon };
  index: number;
  iconBoxClass: string;
  hoverBorderClass: string;
}) {
  const Icon = mod.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.06 + index * 0.05 }}
      className={`rounded-xl border border-black/[0.06] bg-white/90 p-4 shadow-sm backdrop-blur-sm transition hover:shadow-md ${hoverBorderClass}`}
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${iconBoxClass}`}>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-[#111111]">{mod.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#6d6c6b]">{mod.description}</p>
    </motion.div>
  );
}
