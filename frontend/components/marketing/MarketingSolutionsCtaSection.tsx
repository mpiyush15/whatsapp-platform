'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { solutionsCtaCopy } from '@/components/marketing/marketing-solutions-pages-data';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';

type MarketingSolutionsCtaSectionProps = {
  onBookDemo?: () => void;
};

export function MarketingSolutionsCtaSection({ onBookDemo }: MarketingSolutionsCtaSectionProps) {
  const copy = solutionsCtaCopy;

  return (
    <section id="solutions-cta" className="border-t border-black/[0.06] bg-white py-20 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto max-w-3xl px-4 text-center sm:px-6"
      >
        <WhatsAppIcon className="marketing-icon-wa mx-auto h-10 w-10" />
        <h2 className="marketing-section-title mt-5 text-[#111111]">
          <span className="marketing-section-title__line">{copy.title}</span>
          <span className="marketing-section-title__line marketing-section-title__line--gradient text-gradient-marketing">
            {copy.titleHighlight}
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#6d6c6b] sm:text-lg">
          {copy.subtitle}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <button
            type="button"
            onClick={onBookDemo}
            className="marketing-cta-primary h-12 w-full rounded-xl px-8 text-sm font-semibold sm:min-w-[160px] sm:w-auto"
          >
            {copy.primary}
          </button>
          <Link
            href={copy.secondaryHref}
            className="marketing-cta-outline-wa flex h-12 w-full items-center justify-center rounded-xl px-8 text-sm font-semibold sm:min-w-[160px] sm:w-auto"
          >
            {copy.secondary}
          </Link>
        </div>
        <Link
          href={copy.tertiaryHref}
          className="marketing-text-wa mt-5 inline-block text-sm font-semibold hover:underline"
        >
          {copy.tertiary} →
        </Link>
      </motion.div>
    </section>
  );
}
