'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookDemoModal } from '@/components/BookDemoModal';
import { MarketingBrandMarquee } from '@/components/marketing/MarketingBrandMarquee';
import { MarketingCampaignsDashboardMock } from '@/components/marketing/MarketingCampaignsDashboardMock';
import { MarketingNavbar } from '@/components/marketing/MarketingNavbar';
import { heroSectionCopy } from '@/components/marketing/marketing-landing-data';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';
import { MarketingCustomerSpotlight } from '@/components/marketing/MarketingCustomerSpotlight';
import { MarketingPostHero } from '@/components/marketing/MarketingPostHero';
import { MarketingProblemsSection } from '@/components/marketing/MarketingProblemsSection';
import { MarketingWhyReplysysSection } from '@/components/marketing/MarketingWhyReplysysSection';
import { MarketingWhatsAppApiVideoSection } from '@/components/marketing/MarketingWhatsAppApiVideoSection';

function highlightWhatsAppText(text: string) {
  const parts = text.split(/(WhatsApp)/g);
  return parts.map((part, index) =>
    part === 'WhatsApp' ? (
      <span key={`${part}-${index}`} className="text-emerald-600">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function MarketingHomePage() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <>
      <MarketingNavbar />
      <main className="marketing-hero-bg relative flex min-h-screen flex-col pt-20 sm:pt-24">
        <section className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-4 pt-2 text-center sm:px-6 sm:pt-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-black/[0.06] bg-white/80 px-3 py-1.5 text-[10px] font-medium tracking-[0.1em] shadow-sm backdrop-blur-sm sm:mb-8 sm:px-4 sm:text-[11px] sm:tracking-[0.12em]"
          >
            <span className="marketing-badge-dot--wa h-2 w-2 shrink-0 rounded-full" aria-hidden />
            <WhatsAppIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span className="uppercase text-[#52525b]">{highlightWhatsAppText(heroSectionCopy.eyebrow)}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="marketing-hero-title marketing-hero-title--lead w-full max-w-[22rem] text-balance text-[#111111] sm:max-w-4xl"
          >
            <span className="block">{highlightWhatsAppText(heroSectionCopy.titleLine1)}</span>
            <span className="text-gradient-marketing mt-1 block sm:mt-2">{heroSectionCopy.titleHighlight}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-5 max-w-[21rem] text-sm leading-[1.6] tracking-[-0.01em] text-[#6d6c6b] sm:mt-7 sm:max-w-2xl sm:text-lg sm:leading-[1.55]"
          >
            {highlightWhatsAppText(heroSectionCopy.subtitle)}
          </motion.p>

          <motion.ul
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6 flex w-full max-w-2xl flex-col gap-2 sm:mt-8 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3"
          >
            {heroSectionCopy.benefits.map((benefit) => (
              <li
                key={benefit}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-black/[0.06] bg-white/90 px-3.5 py-2 text-xs font-medium text-[#52525b] shadow-sm sm:text-[13px]"
              >
                <WhatsAppIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                {benefit}
              </li>
            ))}
          </motion.ul>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-8 flex w-full max-w-md flex-col gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:justify-center"
          >
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              className="marketing-cta-primary h-12 w-full rounded-xl px-8 text-[15px] font-semibold tracking-[-0.02em] transition sm:w-auto"
            >
              {heroSectionCopy.ctaBookDemo}
            </button>
            <Link
              href="/pricing"
              className="marketing-cta-outline-wa flex h-12 w-full items-center justify-center rounded-xl px-8 text-[15px] font-semibold tracking-[-0.02em] transition sm:w-auto"
            >
              {heroSectionCopy.ctaSeePlans}
            </Link>
          </motion.div>
        </section>

        <section className="relative z-0 mt-6 w-full flex-1 overflow-x-hidden sm:mt-4">
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-0 sm:px-4"
          >
            <div className="marketing-hero-mock-stage relative w-full">
              <div className="marketing-hero-glow pointer-events-none absolute -inset-2 rounded-xl sm:-inset-3 sm:rounded-2xl" aria-hidden />
              <MarketingCampaignsDashboardMock />
            </div>
            <MarketingBrandMarquee />
          </motion.div>
        </section>

        <MarketingPostHero />
        <MarketingCustomerSpotlight />
        <MarketingProblemsSection />
        <MarketingWhyReplysysSection />
        <MarketingWhatsAppApiVideoSection />
      </main>
      <BookDemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
