'use client';

import { MarketingFeatureCard } from '@/components/marketing/MarketingFeatureCard';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import {
  featuresGridSectionCopy,
  marketingFeatureCards,
} from '@/components/marketing/marketing-features-pages-data';

export function MarketingFeaturesGridSection() {
  return (
    <MarketingSection
      id="features-grid"
      eyebrow={featuresGridSectionCopy.eyebrow}
      title={featuresGridSectionCopy.title}
      titleHighlight={featuresGridSectionCopy.titleHighlight}
      subtitle={featuresGridSectionCopy.subtitle}
      tone="whisper"
      accent="whatsapp"
    >
      <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {marketingFeatureCards.map((feature, index) => (
          <MarketingFeatureCard
            key={feature.id}
            title={feature.title}
            description={feature.description}
            category={feature.category}
            icon={feature.icon}
            status={feature.status}
            index={index}
          />
        ))}
      </div>
    </MarketingSection>
  );
}
