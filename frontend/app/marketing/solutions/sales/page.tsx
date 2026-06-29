'use client';

import { useState } from 'react';
import { BookDemoModal } from '@/components/BookDemoModal';
import { MarketingNavbar } from '@/components/marketing/MarketingNavbar';
import { MarketingSalesSolutionHero } from '@/components/marketing/MarketingSalesSolutionHero';
import { MarketingSolutionDetailLayout } from '@/components/marketing/MarketingSolutionDetailLayout';
import { salesSolutionDetail } from '@/components/marketing/marketing-solution-detail-data';

export default function MarketingSolutionsSalesPage() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <>
      <MarketingNavbar />
      <MarketingSolutionDetailLayout
        page={salesSolutionDetail}
        onBookDemo={() => setDemoOpen(true)}
        heroOverride={
          <MarketingSalesSolutionHero page={salesSolutionDetail} onBookDemo={() => setDemoOpen(true)} />
        }
      />
      <BookDemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
