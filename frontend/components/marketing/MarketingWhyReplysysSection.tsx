'use client';

import { Ban, Building2, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import { whyReplysysCopy } from '@/components/marketing/marketing-landing-data';

const rowIcons: Record<string, LucideIcon> = {
  app: Smartphone,
  bulk: Ban,
  bsp: Building2,
};

function CompareRow({
  row,
  index,
}: {
  row: (typeof whyReplysysCopy.rows)[number];
  index: number;
}) {
  const Icon = rowIcons[row.id] ?? Building2;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.06, duration: 0.45 }}
      className="grid gap-4 border-b border-black/[0.06] py-6 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_1px_minmax(0,1.15fr)] sm:items-start sm:gap-6 sm:py-7"
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${row.themTone}`}
          aria-hidden
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a1a1aa]">Compared to</p>
          <h3 className="mt-1 text-base font-semibold text-[#111111] sm:text-lg">{row.vs}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#6d6c6b]">{row.them}</p>
        </div>
      </div>

      <div className="hidden bg-black/[0.06] sm:block" aria-hidden />

      <div className="marketing-why-replysys-win rounded-xl border p-4 sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gradient-marketing">
          With Replysys
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#3f3f46] sm:text-[15px]">{row.us}</p>
        {row.usBullets && row.usBullets.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {row.usBullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[13px] text-[#52525b]">
                <span className="marketing-why-replysys-win-dot mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden />
                {b}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </motion.article>
  );
}

export function MarketingWhyReplysysSection() {
  const copy = whyReplysysCopy;

  return (
    <MarketingSection
      id="why-replysys"
      eyebrow={copy.eyebrow}
      title={copy.title}
      titleHighlight={copy.titleHighlight}
      subtitle={copy.subtitle}
      tone="whisper"
      accent="whatsapp"
    >
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-black/[0.06] bg-white px-5 shadow-[0_12px_40px_rgba(17,17,17,0.06)] ring-1 ring-black/[0.04] sm:px-8">
        {copy.rows.map((row, i) => (
          <CompareRow key={row.id} row={row} index={i} />
        ))}
      </div>
    </MarketingSection>
  );
}
