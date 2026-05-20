'use client';

import { MarketingFeaturesVerticalCallout } from '@/components/marketing/MarketingFeaturesVerticalCallout';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import { featuresEdtechVerticalCallout } from '@/components/marketing/marketing-features-pages-data';

export function MarketingFeaturesEdtechCalloutSection() {
  const { section } = featuresEdtechVerticalCallout;

  return (
    <MarketingSection
      id={section.id}
      eyebrow={section.eyebrow}
      title={section.title}
      titleHighlight={section.titleHighlight}
      subtitle={section.subtitle}
      tone="light"
      accent="whatsapp"
    >
      <MarketingFeaturesVerticalCallout config={featuresEdtechVerticalCallout} />
    </MarketingSection>
  );
}
