'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { BookDemoModal } from '@/components/BookDemoModal';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import { MarketingSolutionsCtaSection } from '@/components/marketing/MarketingSolutionsCtaSection';
import { MarketingSolutionsSimpleGrid } from '@/components/marketing/MarketingSolutionsSimpleGrid';
import { solutionsIndustriesHubCopy, solutionsIndustryHubItems } from '@/components/marketing/marketing-solutions-pages-data';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';

export default function SolutionsHubPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const copy = solutionsIndustriesHubCopy;

  return (
    <>
      <main className="marketing-hero-bg relative flex flex-col pt-20 sm:pt-24">
        <section className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-4 py-10 text-center sm:px-8 sm:py-14">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/80 px-4 py-2 text-[11px] font-medium tracking-[0.12em] shadow-sm">
              <span className="marketing-badge-dot--wa h-2 w-2 rounded-full" aria-hidden />
              <span className="marketing-text-wa uppercase">Industries · WhatsApp Cloud API</span>
            </div>

            <h1 className="marketing-hero-title marketing-hero-title--solutions w-full text-balance text-[#111111]">
              <span className="block">{copy.title}</span>
              <span className="text-gradient-marketing mt-2 block">{copy.titleHighlight}</span>
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-[#6d6c6b] sm:text-lg">{copy.subtitle}</p>

            <div className="flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                className="marketing-cta-primary h-12 w-full rounded-xl px-8 text-sm font-semibold sm:w-auto"
              >
                {copy.ctaDemo}
              </button>
              <Link
                href="/auth/register"
                className="marketing-cta-outline-wa flex h-12 w-full items-center justify-center rounded-xl px-8 text-sm font-semibold sm:w-auto"
              >
                {copy.ctaStart}
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      <MarketingSection
        id="industries"
        className="scroll-mt-24"
        eyebrow={copy.gridEyebrow}
        title={copy.gridTitle}
        titleHighlight={copy.gridTitleHighlight}
        subtitle={copy.gridSubtitle}
        tone="light"
        accent="whatsapp"
      >
        <MarketingSolutionsSimpleGrid
          items={solutionsIndustryHubItems}
          columns="two"
          replysysLabel={copy.replysysHelpsLabel}
        />
      </MarketingSection>

      <MarketingSection
        id="solutions-how-to"
        eyebrow="How to use this hub"
        title="Pick your vertical,"
        titleHighlight="see the playbook"
        subtitle="Each page maps your industry pains to Replysys inbox, templates, flows, and campaigns — same modern stack as our use-case solutions."
        tone="whisper"
      >
        <ol className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          {copy.steps.map((step, i) => (
            <li key={step.title} className="flex gap-3 text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-violet-100 text-xs font-bold text-[#27272a] ring-1 ring-black/[0.06]">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-[#111111]">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[#6d6c6b]">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </MarketingSection>

      <section className="border-t border-black/[0.06] bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <WhatsAppIcon className="marketing-icon-wa mx-auto h-10 w-10" />
          <p className="mt-4 text-sm text-[#6d6c6b]">
            Also exploring by team size or platform setup?{' '}
            <Link href="/marketing/solutions" className="font-semibold text-[#128c7e] hover:underline">
              View all solutions
              <ArrowRight className="ml-0.5 inline h-3.5 w-3.5" aria-hidden />
            </Link>
          </p>
        </div>
      </section>

      <MarketingSolutionsCtaSection onBookDemo={() => setDemoOpen(true)} />
      <BookDemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
