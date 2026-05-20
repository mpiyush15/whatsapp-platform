'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { trustMarqueeItems } from '@/components/marketing/marketing-landing-data';

function FeatureRow({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center gap-8 pr-8 sm:gap-10 sm:pr-10"
      aria-hidden={ariaHidden}
    >
      {trustMarqueeItems.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-medium text-[#6d6c6b] transition hover:text-[#111111] sm:text-[15px]"
        >
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f0fdf4] ring-1 ring-emerald-200/80"
            aria-hidden
          >
            <Check className="marketing-icon-wa h-3 w-3" strokeWidth={2.5} />
          </span>
          {item.label}
        </Link>
      ))}
    </div>
  );
}

type Props = {
  /** Fade edges to match parent section background */
  tone?: 'default' | 'whisper';
  className?: string;
};

export function MarketingTrustMarquee({ tone = 'whisper', className = '' }: Props) {
  const fadeFrom = tone === 'whisper' ? '#f4f3ef' : '#ffffff';

  return (
    <div
      className={`marketing-trust-marquee relative w-full overflow-hidden bg-transparent py-2 sm:py-3 ${className}`}
      style={
        {
          '--trust-marquee-fade': fadeFrom,
        } as React.CSSProperties
      }
      role="marquee"
      aria-label="What is included with Replysys — see pricing for details"
    >
      <div className="marketing-trust-marquee-track flex w-max items-center">
        <FeatureRow />
        <FeatureRow ariaHidden />
      </div>
    </div>
  );
}
