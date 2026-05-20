'use client';

import { IndianRupee, Package, TrendingUp } from 'lucide-react';
import type { SolutionDetailPageData } from '@/components/marketing/marketing-solution-detail-data';
import {
  KpiTile,
  MockExampleWorkspaceLabel,
} from '@/components/marketing/MarketingIndustryMockPrimitives';
import { MarketingSolutionSplitHero } from '@/components/marketing/MarketingSolutionSplitHero';
import {
  MARKETING_ECOMMERCE_HERO_ILLUSTRATION_LOCAL,
  MARKETING_ECOMMERCE_HERO_ILLUSTRATION_URL,
} from '@/lib/marketing/assets';

type MarketingEcommerceIndustryHeroProps = {
  page: SolutionDetailPageData;
  onBookDemo?: () => void;
};

function EcommerceHeroKpis() {
  return (
    <div className="mt-8">
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <KpiTile label="Recovered GMV" value="₹14.2L" sub="Cart recovery · 30 days" icon={IndianRupee} tone="emerald" />
        <KpiTile label="Orders updated" value="2,840" sub="Shipped on WhatsApp" icon={Package} tone="sky" />
        <KpiTile label="Repeat buyers" value="+34%" sub="Opt-in nurture list" icon={TrendingUp} tone="violet" />
      </div>
      <MockExampleWorkspaceLabel className="mt-2 text-right" />
    </div>
  );
}

export function MarketingEcommerceIndustryHero({ page, onBookDemo }: MarketingEcommerceIndustryHeroProps) {
  return (
    <MarketingSolutionSplitHero
      page={page}
      onBookDemo={onBookDemo}
      illustrationUrl={MARKETING_ECOMMERCE_HERO_ILLUSTRATION_URL}
      illustrationLocal={MARKETING_ECOMMERCE_HERO_ILLUSTRATION_LOCAL}
      illustrationAlt="Online store and shopping cart on WhatsApp"
      footer={<EcommerceHeroKpis />}
    />
  );
}
