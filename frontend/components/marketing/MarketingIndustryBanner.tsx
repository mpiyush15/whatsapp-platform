'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';

const INDUSTRY_LABELS: Record<string, string> = {
  healthcare: 'Healthcare & clinics',
  education: 'Education & edtech',
  ecommerce: 'E-commerce & D2C',
  realestate: 'Real estate',
  'food-beverage': 'Food & beverage',
  'financial-services': 'Financial services',
  'saas-tech': 'SaaS & technology',
  'travel-tourism': 'Travel & tourism',
};

type MarketingIndustryBannerProps = {
  /** Override auto-detected label from pathname */
  industryLabel?: string;
};

/** Slim strip on legacy /solutions/* pages — links back to Replysys marketing. */
export function MarketingIndustryBanner({ industryLabel: industryLabelProp }: MarketingIndustryBannerProps) {
  const pathname = usePathname();
  const segment = pathname?.split('/').filter(Boolean).pop() ?? '';
  const industryLabel = industryLabelProp ?? INDUSTRY_LABELS[segment];
  return (
    <div className="border-b border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-white to-violet-50/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <WhatsAppIcon className="marketing-icon-wa h-4 w-4 shrink-0" aria-hidden />
          <p className="text-sm text-[#3f3f46]">
            {industryLabel ? (
              <>
                <span className="font-semibold text-[#111111]">{industryLabel}</span>
                <span className="text-[#71717a]"> · </span>
              </>
            ) : null}
            <span>
              Run this playbook on{' '}
              <span className="font-semibold text-[#111111]">Replysys</span> — official WhatsApp Cloud API.
            </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Link
            href="/solutions#industries"
            className="text-xs font-medium text-[#52525b] transition hover:text-[#111111]"
          >
            All industries
          </Link>
          <Link
            href="/marketing"
            className="inline-flex items-center gap-1 rounded-lg bg-[#111111] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#27272a]"
          >
            Explore Replysys
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
