'use client';

import { MarketingSection } from '@/components/marketing/MarketingSection';
import { MarketingSolutionsSimpleGrid } from '@/components/marketing/MarketingSolutionsSimpleGrid';
import {
  solutionsIndustriesSectionCopy,
  solutionsIndustryItems,
} from '@/components/marketing/marketing-solutions-pages-data';

export function MarketingSolutionsIndustriesSection() {
  const copy = solutionsIndustriesSectionCopy;

  return (
    <MarketingSection
      id="industries"
      className="scroll-mt-24"
      eyebrow={copy.eyebrow}
      title={copy.title}
      titleHighlight={copy.titleHighlight}
      subtitle={copy.subtitle}
      tone="light"
      accent="whatsapp"
    >
      <MarketingSolutionsSimpleGrid
        items={solutionsIndustryItems}
        columns="two"
        replysysLabel={copy.replysysHelpsLabel}
      />
    </MarketingSection>
  );
}
