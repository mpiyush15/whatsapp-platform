'use client';

import { Handshake, MessageSquare, Users } from 'lucide-react';
import type { SolutionDetailPageData } from '@/components/marketing/marketing-solution-detail-data';
import {
  KpiTile,
  MockExampleWorkspaceLabel,
} from '@/components/marketing/MarketingIndustryMockPrimitives';
import { MarketingSolutionSplitHero } from '@/components/marketing/MarketingSolutionSplitHero';
import {
  MARKETING_SALES_SOLUTION_HERO_LOCAL,
  MARKETING_SALES_SOLUTION_HERO_URL,
} from '@/lib/marketing/assets';

type MarketingSalesSolutionHeroProps = {
  page: SolutionDetailPageData;
  onBookDemo?: () => void;
};

function SalesHeroKpis() {
  return (
    <div className="mt-8">
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <KpiTile label="New replies" value="128" sub="Inbound this week" icon={MessageSquare} tone="violet" />
        <KpiTile label="Qualified" value="42" sub="Sales-ready threads" icon={Users} tone="sky" />
        <KpiTile label="Closed won" value="18" sub="Won on WhatsApp" icon={Handshake} tone="emerald" />
      </div>
      <MockExampleWorkspaceLabel className="mt-2 text-right" />
    </div>
  );
}

export function MarketingSalesSolutionHero({ page, onBookDemo }: MarketingSalesSolutionHeroProps) {
  return (
    <MarketingSolutionSplitHero
      page={page}
      onBookDemo={onBookDemo}
      illustrationUrl={MARKETING_SALES_SOLUTION_HERO_URL}
      illustrationLocal={MARKETING_SALES_SOLUTION_HERO_LOCAL}
      illustrationAlt="WhatsApp sales pipeline from replies to revenue"
      footer={<SalesHeroKpis />}
    />
  );
}
