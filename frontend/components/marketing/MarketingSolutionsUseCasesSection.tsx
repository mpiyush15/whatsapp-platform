'use client';

import { MarketingSection } from '@/components/marketing/MarketingSection';
import { MarketingSolutionsSimpleGrid } from '@/components/marketing/MarketingSolutionsSimpleGrid';
import { SOLUTION_DETAIL_ROUTES } from '@/components/marketing/marketing-solution-detail-data';
import {
  solutionsUseCases,
  solutionsUseCasesSectionCopy,
} from '@/components/marketing/marketing-solutions-pages-data';

export function MarketingSolutionsUseCasesSection() {
  const copy = solutionsUseCasesSectionCopy;

  const items = solutionsUseCases.map((item) => ({
    ...item,
    href: SOLUTION_DETAIL_ROUTES[item.id] ?? `#${item.id}`,
    linkLabel: SOLUTION_DETAIL_ROUTES[item.id] ? 'View solution' : 'View use case',
  }));

  return (
    <MarketingSection
      id="use-cases"
      className="scroll-mt-24"
      eyebrow={copy.eyebrow}
      title={copy.title}
      titleHighlight={copy.titleHighlight}
      subtitle={copy.subtitle}
      tone="whisper"
      accent="whatsapp"
    >
      <MarketingSolutionsSimpleGrid
        items={items}
        columns="two"
        replysysLabel={copy.replysysHelpsLabel}
      />
    </MarketingSection>
  );
}
