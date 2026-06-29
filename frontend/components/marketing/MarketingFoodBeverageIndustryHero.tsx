'use client';

import { Utensils, Clock, TrendingUp, Star } from 'lucide-react';
import type { SolutionDetailPageData } from '@/components/marketing/marketing-solution-detail-data';
import {
  KpiTile,
  MockExampleWorkspaceLabel,
} from '@/components/marketing/MarketingIndustryMockPrimitives';
import { MarketingSolutionSplitHero } from '@/components/marketing/MarketingSolutionSplitHero';
import {
  MARKETING_FOOD_BEVERAGE_HERO_ILLUSTRATION_LOCAL,
  MARKETING_FOOD_BEVERAGE_HERO_ILLUSTRATION_URL,
} from '@/lib/marketing/assets';

type MarketingFoodBeverageIndustryHeroProps = {
  page: SolutionDetailPageData;
  onBookDemo?: () => void;
};

function FoodBeverageHeroKpis() {
  return (
    <div className="mt-8">
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <KpiTile label="Reservations Booked" value="+42%" sub="Via WhatsApp automations" icon={Utensils} tone="amber" />
        <KpiTile label="Wait Time Reduced" value="15 min" sub="Digital queue updates" icon={Clock} tone="sky" />
        <KpiTile label="Repeat Diners" value="3.5x" sub="Loyalty offers & alerts" icon={Star} tone="rose" />
      </div>
      <div className="mt-3 text-xs text-slate-500 italic">
        "Stop losing hungry customers to slow phone lines. Recover lost revenue instantly."
      </div>
      <MockExampleWorkspaceLabel className="mt-2 text-right" />
    </div>
  );
}

export function MarketingFoodBeverageIndustryHero({ page, onBookDemo }: MarketingFoodBeverageIndustryHeroProps) {
  return (
    <MarketingSolutionSplitHero
      page={page}
      onBookDemo={onBookDemo}
      illustrationUrl={MARKETING_FOOD_BEVERAGE_HERO_ILLUSTRATION_URL}
      illustrationLocal={MARKETING_FOOD_BEVERAGE_HERO_ILLUSTRATION_LOCAL}
      illustrationAlt="Restaurant owner managing table bookings on WhatsApp"
      footer={<FoodBeverageHeroKpis />}
    />
  );
}
