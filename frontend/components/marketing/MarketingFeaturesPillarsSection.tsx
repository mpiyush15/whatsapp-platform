'use client';

import { MarketingFeaturesPillarCard } from '@/components/marketing/MarketingFeaturesPillarCard';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import {
  featuresPillarsSectionCopy,
  marketingFeaturesPillars,
} from '@/components/marketing/marketing-features-pages-data';

export function MarketingFeaturesPillarsSection() {
  return (
    <MarketingSection
      id="platform-pillars"
      eyebrow={featuresPillarsSectionCopy.eyebrow}
      title={featuresPillarsSectionCopy.title}
      titleHighlight={featuresPillarsSectionCopy.titleHighlight}
      subtitle={featuresPillarsSectionCopy.subtitle}
      tone="light"
      accent="whatsapp"
    >
      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        {marketingFeaturesPillars.map((pillar, index) => (
          <MarketingFeaturesPillarCard
            key={pillar.id}
            index={pillar.index}
            accent={pillar.accent}
            label={pillar.label}
            title={pillar.title}
            description={pillar.description}
            bullets={pillar.bullets}
            icon={pillar.icon}
            animationIndex={index}
          />
        ))}
      </div>
    </MarketingSection>
  );
}
