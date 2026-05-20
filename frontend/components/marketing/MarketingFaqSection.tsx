'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import { marketingFaqItems } from '@/components/marketing/marketing-landing-data';

export function MarketingFaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <MarketingSection
      id="faq"
      eyebrow="FAQ"
      title="Questions teams ask"
      titleHighlight="before they switch"
      subtitle="Straight answers about API setup, pricing, and who Replysys is for."
      tone="whisper"
    >
      <div className="mx-auto max-w-3xl space-y-3">
        {marketingFaqItems.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={item.q} className="marketing-faq-item overflow-hidden rounded-xl">
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={open}
              >
                <span className="font-semibold text-[#111111]">{item.q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-[#6d6c6b] transition ${open ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {open ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <p className="border-t border-black/[0.06] px-5 pb-4 pt-2 text-sm leading-relaxed text-[#6d6c6b]">
                      {item.a}
                    </p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </MarketingSection>
  );
}
