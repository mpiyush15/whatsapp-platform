'use client';

import type { ReactNode } from 'react';
import type { IndustrySlug } from '@/components/marketing/marketing-industry-detail-data';
import type { IndustrySectionVisualId } from '@/components/marketing/MarketingIndustryMockPrimitives';
import { educationSectionVisuals } from '@/components/marketing/MarketingEducationCroppedMocks';
import { healthcareSectionVisuals } from '@/components/marketing/MarketingHealthcareCroppedMocks';
import { ecommerceSectionVisuals } from '@/components/marketing/MarketingEcommerceCroppedMocks';
import { realestateSectionVisuals } from '@/components/marketing/MarketingRealestateCroppedMocks';
import { foodBeverageSectionVisuals } from '@/components/marketing/MarketingFoodBeverageCroppedMocks';
import { financialServicesSectionVisuals } from '@/components/marketing/MarketingFinancialServicesCroppedMocks';
import { travelTourismSectionVisuals } from '@/components/marketing/MarketingTravelTourismCroppedMocks';
import { saasTechSectionVisuals } from '@/components/marketing/MarketingSaasTechCroppedMocks';

const industrySectionVisualsBySlug: Partial<
  Record<IndustrySlug, Partial<Record<IndustrySectionVisualId, ReactNode>>>
> = {
  healthcare: healthcareSectionVisuals,
  education: educationSectionVisuals,
  ecommerce: ecommerceSectionVisuals,
  realestate: realestateSectionVisuals,
  'food-beverage': foodBeverageSectionVisuals,
  'financial-services': financialServicesSectionVisuals,
  'travel-tourism': travelTourismSectionVisuals,
  'saas-tech': saasTechSectionVisuals,
};

export function getIndustrySectionVisuals(
  slug: IndustrySlug,
): Partial<Record<IndustrySectionVisualId, ReactNode>> | undefined {
  return industrySectionVisualsBySlug[slug];
}
