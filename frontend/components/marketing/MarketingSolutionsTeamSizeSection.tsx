'use client';

import { MarketingSection } from '@/components/marketing/MarketingSection';
import { MarketingSolutionsSimpleGrid } from '@/components/marketing/MarketingSolutionsSimpleGrid';
import {
  solutionsTeamSizeItems,
  solutionsTeamSizeSectionCopy,
} from '@/components/marketing/marketing-solutions-pages-data';

export function MarketingSolutionsTeamSizeSection() {
  const copy = solutionsTeamSizeSectionCopy;

  return (
    <MarketingSection
      id="team-size"
      className="scroll-mt-24"
      eyebrow={copy.eyebrow}
      title={copy.title}
      titleHighlight={copy.titleHighlight}
      subtitle={copy.subtitle}
      tone="light"
      accent="whatsapp"
    >
      <MarketingSolutionsSimpleGrid
        items={solutionsTeamSizeItems}
        columns="three"
        replysysLabel={copy.replysysHelpsLabel}
      />
    </MarketingSection>
  );
}
