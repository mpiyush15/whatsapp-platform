'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { trustApiSectionCopy } from '@/components/marketing/marketing-landing-data';
import { MarketingWhatsAppPhoneMock } from '@/components/marketing/MarketingWhatsAppPhoneMock';

export function MarketingTrustApiSection() {
  const { eyebrow, titleMain, titleHighlight, subtitle, verificationSteps, cta, ctaHref } =
    trustApiSectionCopy;

  return (
    <section id="api" className="bg-white py-16 sm:py-20 lg:py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.45 }}
        className="mx-auto max-w-6xl px-4 sm:px-6"
      >
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div className="text-left">
            <span className="marketing-badge mb-4 inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-[#fafaf9] px-3 py-1 text-xs font-medium text-[#525252]">
              <span className="marketing-badge-dot marketing-badge-dot--wa" aria-hidden />
              {eyebrow}
            </span>

            <h2 className="marketing-hero-title text-left text-[1.75rem] font-bold tracking-tight text-[#171717] sm:text-4xl lg:text-[2.35rem]">
              {titleMain}{' '}
              <span className="text-gradient-marketing">{titleHighlight}</span>
            </h2>

            <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#525252] sm:text-base">
              {subtitle}
            </p>

            <ol className="mt-5 space-y-2.5 sm:mt-6">
              {verificationSteps.map((item) => (
                <li key={item.step} className="flex gap-3">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0fdf4] text-xs font-bold text-emerald-700 ring-1 ring-emerald-200"
                    aria-hidden
                  >
                    {item.step}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-semibold leading-snug text-[#171717]">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#6d6c6b] sm:text-sm">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 sm:mt-7">
              <Link
                href={ctaHref}
                className="marketing-cta-primary inline-flex rounded-xl px-6 py-3 text-sm font-semibold"
              >
                {cta}
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full lg:mx-0 lg:ml-auto">
            <div
              className="marketing-broadcast-mock-glow pointer-events-none absolute -inset-8 -z-10 rounded-[2rem] opacity-70"
              aria-hidden
            />
            <MarketingWhatsAppPhoneMock />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
