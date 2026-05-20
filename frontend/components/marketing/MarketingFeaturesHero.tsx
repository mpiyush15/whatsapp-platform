'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { featuresPageHeroCopy } from '@/components/marketing/marketing-features-pages-data';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';

type MarketingFeaturesHeroProps = {
  onBookDemo?: () => void;
};

export function MarketingFeaturesHero({ onBookDemo }: MarketingFeaturesHeroProps) {
  const copy = featuresPageHeroCopy;

  return (
    <section
      id="hero"
      className="marketing-features-hero relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-10 text-center sm:px-8 sm:py-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex w-full max-w-8xl flex-col items-center gap-8 sm:gap-10 lg:gap-12"
      >
        <motion.div className="inline-flex max-w-full items-center gap-2 rounded-full border border-black/[0.06] bg-white/80 px-4 py-2 text-[11px] font-medium tracking-[0.12em] shadow-sm backdrop-blur-sm sm:text-xs">
          <span className="marketing-badge-dot--wa h-2.5 w-2.5 shrink-0 rounded-full" aria-hidden />
          <WhatsAppIcon className="marketing-icon-wa h-4 w-4 shrink-0" />
          <span className="marketing-text-wa uppercase">{copy.eyebrow}</span>
        </motion.div>

        <h1 className="marketing-hero-title marketing-hero-title--features w-full text-balance text-[#111111]">
          <span className="block">{copy.titleLine1}</span>
          <span className="text-gradient-marketing mt-2 block sm:mt-4">{copy.titleHighlight}</span>
        </h1>

        <p className="marketing-features-hero-subtitle max-w-3xl tracking-[-0.01em] text-[#6d6c6b]">
          {copy.subtitle}
        </p>

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
          <Link
            href="/auth/register"
            className="marketing-cta-outline-wa flex h-14 w-full items-center justify-center rounded-xl px-10 text-base font-semibold tracking-[-0.02em] sm:min-w-[180px] sm:w-auto"
          >
            {copy.ctaGetStarted}
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
