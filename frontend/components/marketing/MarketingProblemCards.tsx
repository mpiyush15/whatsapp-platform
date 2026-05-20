'use client';

import { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { marketingProblems } from '@/components/marketing/marketing-landing-data';

const CARD_SCROLL_GAP = 20;

export function MarketingProblemCards() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollByCard = useCallback((direction: 'prev' | 'next') => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-problem-card]');
    const step = (card?.offsetWidth ?? 480) + CARD_SCROLL_GAP;
    el.scrollBy({ left: direction === 'next' ? step : -step, behavior: 'smooth' });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45 }}
      className="relative -mx-4 sm:-mx-6"
    >
      <motion.div
        ref={scrollRef}
        className="marketing-problems-scroll flex gap-5 px-4 pb-4 sm:px-6"
        role="region"
        aria-label="Common WhatsApp business problems"
        tabIndex={0}
      >
        {marketingProblems.map((problem, i) => (
          <motion.article
            key={problem.label}
            data-problem-card
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: i * 0.06, duration: 0.45 }}
            className="marketing-problem-card flex w-[min(88vw,400px)] shrink-0 snap-start flex-col overflow-hidden rounded-[1.75rem] bg-white sm:w-[440px] lg:w-[480px]"
          >
            <motion.div className="flex flex-col p-8 pb-6 sm:p-10 sm:pb-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
                {problem.label}
              </p>
              <h3 className="mt-4 font-marketing-display text-[1.625rem] font-bold leading-[1.15] tracking-[-0.03em] text-[#111111] sm:text-[1.875rem]">
                {problem.title}
              </h3>
              <p className="mt-4 text-[15px] leading-relaxed text-[#6d6c6b]">{problem.description}</p>
            </motion.div>

            <motion.div className="relative mx-4 mb-4 mt-auto min-h-[220px] overflow-hidden rounded-2xl bg-[#f5f5f7] sm:mx-6 sm:mb-6 sm:min-h-[280px]">
              {problem.imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={problem.imageSrc}
                  alt={problem.title}
                  className="h-full min-h-[220px] w-full object-contain object-center sm:min-h-[280px]"
                />
              ) : (
                <motion.div
                  className="flex min-h-[220px] items-center justify-center sm:min-h-[280px]"
                  aria-hidden
                >
                  <problem.icon className="h-12 w-12 text-[#d4d4d8]" strokeWidth={1.25} />
                </motion.div>
              )}
            </motion.div>
          </motion.article>
        ))}
      </motion.div>

      <motion.div className="pointer-events-none absolute inset-y-0 right-3 z-10 hidden items-center sm:flex sm:right-5">
        <button
          type="button"
          onClick={() => scrollByCard('next')}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[#1d1d1f] shadow-[0_2px_16px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.06] transition hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.14)]"
          aria-label="Scroll to next problem"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
        </button>
      </motion.div>

      <motion.div className="mt-4 flex justify-end gap-2 px-4 sm:hidden">
        <button
          type="button"
          onClick={() => scrollByCard('prev')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1d1d1f] shadow-md ring-1 ring-black/[0.06]"
          aria-label="Previous problem"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollByCard('next')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1d1d1f] shadow-md ring-1 ring-black/[0.06]"
          aria-label="Next problem"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </motion.div>
    </motion.div>
  );
}
