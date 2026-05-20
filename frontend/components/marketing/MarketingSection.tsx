'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type MarketingSectionProps = {
  id: string;
  eyebrow: string;
  title: string;
  titleHighlight?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  tone?: 'light' | 'whisper';
  /** Green WhatsApp accent on eyebrow dot + label (text only, no green backgrounds) */
  accent?: 'default' | 'whatsapp';
};

export function MarketingSection({
  id,
  eyebrow,
  title,
  titleHighlight,
  subtitle,
  children,
  className = '',
  tone = 'whisper',
  accent = 'default',
}: MarketingSectionProps) {
  const bg = tone === 'whisper' ? 'bg-[#f4f3ef]' : 'bg-white';

  return (
    <section id={id} className={`${bg} py-20 sm:py-28 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-6xl px-4 sm:px-6"
      >
        <motion.div className="mx-auto w-full max-w-5xl text-center sm:max-w-6xl">
          <p
            className={`mb-6 inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/80 px-4 py-1.5 text-[11px] font-medium tracking-[0.12em] shadow-sm ${
              accent === 'whatsapp' ? 'marketing-text-wa' : 'text-[#52525b]'
            }`}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${accent === 'whatsapp' ? 'marketing-badge-dot--wa' : 'marketing-badge-dot'}`}
              aria-hidden
            />
            {eyebrow}
          </p>
          <h2 className="marketing-hero-title text-[2rem] text-[#111111] sm:text-4xl lg:text-[3.25rem]">
            {titleHighlight ? (
              <>
                <span className="block sm:whitespace-nowrap">{title}</span>
                <span className="text-gradient-marketing mt-1.5 block">{titleHighlight}</span>
              </>
            ) : (
              title
            )}
          </h2>
          {subtitle ? (
            <p className="mx-auto mt-5 max-w-3xl text-[1.0625rem] leading-[1.55] tracking-[-0.01em] text-[#6d6c6b] sm:text-lg">
              {subtitle}
            </p>
          ) : null}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="mt-14"
        >
          {children}
        </motion.div>
      </motion.div>
    </section>
  );
}
