'use client';

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  solutionsHeroIndustries,
  solutionsHeroUseCases,
  solutionsPageHeroCopy,
} from '@/components/marketing/marketing-solutions-pages-data';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';

type MarketingSolutionsHeroProps = {
  onBookDemo?: () => void;
};

function HeroChip({ label, href, icon: Icon }: { label: string; href: string; icon: LucideIcon }) {
  const className =
    'inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/90 px-3.5 py-2 text-xs font-medium text-[#52525b] shadow-sm transition hover:border-black/[0.1] hover:bg-white hover:text-[#111111] sm:text-[13px]';

  if (href.startsWith('/')) {
    return (
      <Link href={href} className={className}>
        <Icon className="marketing-icon-wa h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        {label}
      </Link>
    );
  }

  return (
    <a href={href} className={className}>
      <Icon className="marketing-icon-wa h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
      {label}
    </a>
  );
}

export function MarketingSolutionsHero({ onBookDemo }: MarketingSolutionsHeroProps) {
  const copy = solutionsPageHeroCopy;

  return (
    <section
      id="hero"
      className="marketing-solutions-hero relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-10 text-center sm:px-8 sm:py-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex w-full flex-col items-center gap-8 sm:gap-10 lg:gap-11"
      >
        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-black/[0.06] bg-white/80 px-4 py-2 text-[11px] font-medium tracking-[0.12em] shadow-sm backdrop-blur-sm sm:text-xs">
          <span className="marketing-badge-dot--wa h-2.5 w-2.5 shrink-0 rounded-full" aria-hidden />
          <WhatsAppIcon className="marketing-icon-wa h-4 w-4 shrink-0" />
          <span className="marketing-text-wa uppercase">{copy.eyebrow}</span>
        </div>

        <h1 className="marketing-hero-title marketing-hero-title--solutions w-full text-balance text-[#111111]">
          <span className="block">{copy.titleLine1}</span>
          <span className="text-gradient-marketing mt-2 block sm:mt-4">{copy.titleHighlight}</span>
        </h1>

        <p className="marketing-solutions-hero-subtitle max-w-3xl tracking-[-0.01em] text-[#6d6c6b]">
          {copy.subtitle}
        </p>

        <div className="w-full max-w-3xl space-y-5">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a1a1aa]">
              {copy.useCaseHeading}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {solutionsHeroUseCases.map((chip) => (
                <HeroChip key={chip.id} label={chip.label} href={chip.href} icon={chip.icon} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a1a1aa]">
              {copy.industryHeading}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {solutionsHeroIndustries.map((chip) => (
                <HeroChip key={chip.id} label={chip.label} href={chip.href} icon={chip.icon} />
              ))}
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45 }}
          className="flex w-full max-w-lg flex-col gap-4 sm:max-w-none sm:flex-row sm:justify-center"
        >
          <button
            type="button"
            onClick={onBookDemo}
            className="marketing-cta-primary h-14 w-full rounded-xl px-10 text-base font-semibold tracking-[-0.02em] sm:min-w-[180px] sm:w-auto"
          >
            {copy.ctaBookDemo}
          </button>
          <a
            href={copy.ctaExploreHref}
            className="marketing-cta-outline-wa flex h-14 w-full items-center justify-center rounded-xl px-10 text-base font-semibold tracking-[-0.02em] sm:min-w-[180px] sm:w-auto"
          >
            {copy.ctaExplore}
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
