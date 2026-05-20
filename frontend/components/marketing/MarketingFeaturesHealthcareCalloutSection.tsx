'use client';

import { MarketingFeaturesVerticalCallout } from '@/components/marketing/MarketingFeaturesVerticalCallout';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import { featuresHealthcareVerticalCallout } from '@/components/marketing/marketing-features-pages-data';

export function MarketingFeaturesHealthcareCalloutSection() {
  const { section } = featuresHealthcareVerticalCallout;

  return (
    <MarketingSection
      id={section.id}
      eyebrow={section.eyebrow}
      title={section.title}
      titleHighlight={section.titleHighlight}
      subtitle={section.subtitle}
      tone="whisper"
      accent="whatsapp"
    >
      <MarketingFeaturesVerticalCallout config={featuresHealthcareVerticalCallout} />
    </MarketingSection>
  );
}
