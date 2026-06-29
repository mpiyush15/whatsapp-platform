'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { finalCtaCopy } from '@/components/marketing/marketing-landing-data';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';

export function MarketingFinalCtaSection() {
  return (
    <section className="border-t border-black/[0.06] bg-white py-20 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto max-w-3xl px-4 text-center sm:px-6"
      >
        <WhatsAppIcon className="marketing-icon-wa mx-auto h-10 w-10" />
        <h2 className="marketing-section-title mt-5 text-[#111111]">
          <span className="marketing-section-title__line">{finalCtaCopy.title}</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-[#6d6c6b] sm:text-lg">{finalCtaCopy.subtitle}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/auth/register" className="marketing-cta-primary rounded-xl px-7 py-3 text-sm font-semibold">
            {finalCtaCopy.primary}
          </Link>
          <Link
            href="/contact"
            className="marketing-cta-outline-wa rounded-xl px-7 py-3 text-sm font-semibold transition"
          >
            {finalCtaCopy.secondary}
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
