'use client';

import { useState } from 'react';
import { BookDemoModal } from '@/components/BookDemoModal';
import { MarketingSolutionsCtaSection } from '@/components/marketing/MarketingSolutionsCtaSection';
import { MarketingSolutionsIndustriesSection } from '@/components/marketing/MarketingSolutionsIndustriesSection';
import { MarketingSolutionsPlatformSection } from '@/components/marketing/MarketingSolutionsPlatformSection';
import { MarketingSolutionsTeamSizeSection } from '@/components/marketing/MarketingSolutionsTeamSizeSection';
import { MarketingSolutionsUseCasesSection } from '@/components/marketing/MarketingSolutionsUseCasesSection';
import { MarketingNavbar } from '@/components/marketing/MarketingNavbar';
import { MarketingSolutionsHero } from '@/components/marketing/MarketingSolutionsHero';

export default function MarketingSolutionsPage() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <>
      <MarketingNavbar />
      <main className="marketing-hero-bg relative flex min-h-[100dvh] min-h-[100svh] flex-col pt-20 sm:pt-24">
        <MarketingSolutionsHero onBookDemo={() => setDemoOpen(true)} />
      </main>
      <MarketingSolutionsUseCasesSection />
      <MarketingSolutionsTeamSizeSection />
      <MarketingSolutionsPlatformSection />
      <MarketingSolutionsIndustriesSection />
      <MarketingSolutionsCtaSection onBookDemo={() => setDemoOpen(true)} />
      <BookDemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
