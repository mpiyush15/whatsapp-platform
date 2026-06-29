'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { SolutionDetailPageData } from '@/components/marketing/marketing-solution-detail-data';

type MarketingSolutionSplitHeroProps = {
  page: SolutionDetailPageData;
  onBookDemo?: () => void;
  illustrationUrl: string;
  illustrationLocal: string;
  illustrationAlt: string;
  titleClassName?: string;
  footer?: ReactNode;
};

export function MarketingSolutionSplitHero({
  page,
  onBookDemo,
  illustrationUrl,
  illustrationLocal,
  illustrationAlt,
  titleClassName = 'marketing-hero-title--ecommerce-split',
  footer,
}: MarketingSolutionSplitHeroProps) {
  const hero = page.hero;
  const [imgSrc, setImgSrc] = useState(illustrationUrl);

  return (
    <main className="marketing-hero-bg relative flex flex-col pt-20 sm:pt-24">
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-10 lg:py-12">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col items-start text-left"
          >
            {hero.kicker ? (
              <p className="max-w-xl text-sm font-medium italic leading-relaxed text-[#52525b] sm:text-[1.05rem]">
                {hero.kicker}
              </p>
            ) : null}

            <h1
              className={`marketing-hero-title marketing-hero-title--solutions ${titleClassName} mt-4 w-full text-balance text-[#111111] lg:mt-5`}
            >
              <span className="block">{hero.title}</span>
              <span className="text-gradient-marketing mt-1.5 block">{hero.titleHighlight}</span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#6d6c6b] sm:text-lg">{hero.subtitle}</p>

            {hero.outcomeStrip && hero.outcomeStrip.length > 0 ? (
              <div className="mt-5 flex max-w-xl flex-wrap gap-2">
                {hero.outcomeStrip.map((label) => (
                  <span
                    key={label}
                    className="rounded-lg border border-black/[0.08] bg-white/85 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#52525b] shadow-sm"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={onBookDemo}
                className="marketing-cta-primary h-12 w-full rounded-xl px-8 text-sm font-semibold sm:w-auto"
              >
                {hero.ctaBookDemo}
              </button>
              <Link
                href="/auth/register"
                className="marketing-cta-outline-wa flex h-12 w-full items-center justify-center rounded-xl px-8 text-sm font-semibold sm:w-auto"
              >
                {hero.ctaGetStarted}
              </Link>
            </div>

            {hero.ctaFootnote ? (
              <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-[#52525b]">
                <span className="text-gradient-marketing">{hero.ctaFootnote}</span>
              </p>
            ) : null}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="flex w-full items-center justify-center lg:justify-end"
          >
            <div className="w-full max-w-[min(100%,480px)] overflow-hidden rounded-2xl">
              <img
                src={imgSrc}
                alt={illustrationAlt}
                width={1024}
                height={1024}
                className="h-auto w-full object-contain"
                decoding="async"
                fetchPriority="high"
                onError={() => {
                  if (imgSrc !== illustrationLocal) {
                    setImgSrc(illustrationLocal);
                  }
                }}
              />
            </div>
          </motion.div>
        </div>

        {footer}
      </section>
    </main>
  );
}
