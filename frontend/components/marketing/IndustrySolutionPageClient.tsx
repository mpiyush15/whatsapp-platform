'use client';

import { useState } from 'react';
import { BookDemoModal } from '@/components/BookDemoModal';
import { getIndustrySectionVisuals } from '@/components/marketing/industry-section-visuals';
import { MarketingEcommerceIndustryHero } from '@/components/marketing/MarketingEcommerceIndustryHero';
import { MarketingHealthcareIndustryHero } from '@/components/marketing/MarketingHealthcareIndustryHero';
import { MarketingFoodBeverageIndustryHero } from '@/components/marketing/MarketingFoodBeverageIndustryHero';
import { MarketingEcommerceModulesBlock } from '@/components/marketing/MarketingEcommerceModulesBlock';
import { MarketingSolutionDetailLayout } from '@/components/marketing/MarketingSolutionDetailLayout';
import {
  industryDetailBySlug,
  type IndustrySlug,
} from '@/components/marketing/marketing-industry-detail-data';

type IndustrySolutionPageClientProps = {
  slug: IndustrySlug;
};

export function IndustrySolutionPageClient({ slug }: IndustrySolutionPageClientProps) {
  const [demoOpen, setDemoOpen] = useState(false);
  const page = industryDetailBySlug[slug];

  if (!page) {
    return null;
  }

  return (
    <>
      <MarketingSolutionDetailLayout
        page={page}
        onBookDemo={() => setDemoOpen(true)}
        heroOverride={
          slug === 'ecommerce' ? (
            <MarketingEcommerceIndustryHero page={page} onBookDemo={() => setDemoOpen(true)} />
          ) : slug === 'healthcare' ? (
            <MarketingHealthcareIndustryHero page={page} onBookDemo={() => setDemoOpen(true)} />
          ) : slug === 'food-beverage' ? (
            <MarketingFoodBeverageIndustryHero page={page} onBookDemo={() => setDemoOpen(true)} />
          ) : undefined
        }
        modulesOverride={
          slug === 'ecommerce' ? <MarketingEcommerceModulesBlock modules={page.modules} /> : undefined
        }
        sectionVisuals={getIndustrySectionVisuals(slug)}
      />
      <BookDemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
