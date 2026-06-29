'use client';

import { Calendar, IndianRupee, TrendingDown } from 'lucide-react';
import type { SolutionDetailPageData } from '@/components/marketing/marketing-solution-detail-data';
import {
  KpiTile,
  MockExampleWorkspaceLabel,
} from '@/components/marketing/MarketingIndustryMockPrimitives';
import { MarketingSolutionSplitHero } from '@/components/marketing/MarketingSolutionSplitHero';
import {
  MARKETING_HEALTHCARE_HERO_DOCTOR_LOCAL,
  MARKETING_HEALTHCARE_HERO_DOCTOR_URL,
} from '@/lib/marketing/assets';

type MarketingHealthcareIndustryHeroProps = {
  page: SolutionDetailPageData;
  onBookDemo?: () => void;
};

function HealthcareHeroKpis() {
  return (
    <div className="mt-8">
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <KpiTile label="Clinic revenue" value="₹32.6L" sub="This month · +18%" icon={IndianRupee} tone="emerald" />
        <KpiTile label="Appointments" value="86" sub="Today · 12 open slots filled" icon={Calendar} tone="sky" />
        <KpiTile label="No-show rate" value="12%" sub="Down from 28% last quarter" icon={TrendingDown} tone="rose" />
      </div>
      <MockExampleWorkspaceLabel className="mt-2 text-right" />
    </div>
  );
}

export function MarketingHealthcareIndustryHero({ page, onBookDemo }: MarketingHealthcareIndustryHeroProps) {
  return (
    <MarketingSolutionSplitHero
      page={page}
      onBookDemo={onBookDemo}
      illustrationUrl={MARKETING_HEALTHCARE_HERO_DOCTOR_URL}
      illustrationLocal={MARKETING_HEALTHCARE_HERO_DOCTOR_LOCAL}
      illustrationAlt="Doctor with WhatsApp appointment reminders, follow-ups, and prescriptions"
      titleClassName="marketing-hero-title--healthcare-split"
      footer={<HealthcareHeroKpis />}
    />
  );
}
