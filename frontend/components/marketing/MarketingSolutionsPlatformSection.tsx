'use client';

import { MarketingSection } from '@/components/marketing/MarketingSection';
import { MarketingSolutionsSimpleGrid } from '@/components/marketing/MarketingSolutionsSimpleGrid';
import {
  solutionsPlatformItems,
  solutionsPlatformSectionCopy,
} from '@/components/marketing/marketing-solutions-pages-data';

export function MarketingSolutionsPlatformSection() {
  const copy = solutionsPlatformSectionCopy;

  return (
    <MarketingSection
      id="platform"
      className="scroll-mt-24"
      eyebrow={copy.eyebrow}
      title={copy.title}
      titleHighlight={copy.titleHighlight}
      subtitle={copy.subtitle}
      tone="whisper"
      accent="whatsapp"
    >
      <MarketingSolutionsSimpleGrid
        items={solutionsPlatformItems}
        columns="three"
        replysysLabel={copy.replysysHelpsLabel}
      />
    </MarketingSection>
  );
}
