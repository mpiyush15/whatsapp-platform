'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Megaphone, Sparkles, Calendar } from 'lucide-react';
import { broadcastSectionCopy } from './marketing-landing-data';
import { MarketingBroadcastDashboardMock } from './MarketingBroadcastDashboardMock';

const BULLET_ICONS = [Megaphone, Sparkles, Calendar] as const;

export function MarketingBroadcastSection() {
  const { eyebrow, titleMain, titleHighlight, subtitle, bullets, cta, ctaHref } =
    broadcastSectionCopy;

  return (
    <section id="broadcast" className="bg-white py-16 sm:py-20 lg:py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.45 }}
        className="mx-auto max-w-6xl px-4 sm:px-6"
      >
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          {/* Left — copy & CTAs (left-aligned, not centered) */}
          <div className="text-left">
            <span className="marketing-badge mb-4 inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-[#fafaf9] px-3 py-1 text-xs font-medium text-[#525252]">
              <span className="marketing-badge-dot marketing-badge-dot--wa" aria-hidden />
              {eyebrow}
            </span>

            <h2 className="marketing-hero-title text-left text-[1.75rem] font-bold tracking-tight text-[#171717] sm:text-4xl lg:text-[2.35rem]">
              {titleMain}{' '}
              <span className="text-gradient-marketing">{titleHighlight}</span>
            </h2>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#525252] sm:text-lg">
              {subtitle}
            </p>

            <ul className="mt-8 space-y-5">
              {bullets.map((item, i) => {
                const Icon = BULLET_ICONS[i] ?? Megaphone;
                return (
                  <li key={item.title} className="flex gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#bbf7d0]/80 bg-[#f0fdf4]">
                      <Icon className="marketing-icon-wa h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <motion.div className="min-w-0 pt-0.5">
                      <p className="text-sm font-semibold text-[#171717] sm:text-base">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-[#525252]">{item.body}</p>
                    </motion.div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8">
              <Link
                href={ctaHref}
                className="marketing-cta-wa-solid inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
              >
                {cta}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          {/* Right — cropped dashboard mock from hero */}
          <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:ml-auto lg:max-w-none">
            <motion.div
              className="marketing-broadcast-mock-glow pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] opacity-70"
              aria-hidden
            />
            <MarketingBroadcastDashboardMock />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
