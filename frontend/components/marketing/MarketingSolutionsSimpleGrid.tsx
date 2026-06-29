'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { SolutionsSimpleItem } from '@/components/marketing/marketing-solutions-pages-data';

type MarketingSolutionsSimpleGridProps = {
  items: SolutionsSimpleItem[];
  columns: 'two' | 'three';
  replysysLabel: string;
};

export function MarketingSolutionsSimpleGrid({
  items,
  columns,
  replysysLabel,
}: MarketingSolutionsSimpleGridProps) {
  const gridClass =
    columns === 'three'
      ? 'grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12'
      : 'grid gap-10 sm:grid-cols-2 sm:gap-12';

  return (
    <div className={gridClass}>
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.article
            id={item.id}
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="text-left"
          >
            <span className="marketing-icon-wa mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-black/[0.06] bg-white/80 shadow-sm">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#111111] sm:text-xl">{item.title}</h3>
            <p className="mt-1.5 text-sm font-medium text-[#52525b]">{item.tagline}</p>
            <p className="mt-3 text-sm leading-relaxed text-[#6d6c6b]">{item.description}</p>
            <p className="marketing-text-wa mt-4 text-xs font-semibold uppercase tracking-[0.1em]">
              {replysysLabel}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#3f3f46]">{item.replysysSolution}</p>
            <Link
              href={item.href}
              className="marketing-text-wa mt-4 inline-flex items-center gap-1 text-sm font-semibold transition hover:gap-2"
            >
              {item.linkLabel}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </motion.article>
        );
      })}
    </div>
  );
}
