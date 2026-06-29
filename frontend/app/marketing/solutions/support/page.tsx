'use client';

import { useState } from 'react';
import { BookDemoModal } from '@/components/BookDemoModal';
import { MarketingNavbar } from '@/components/marketing/MarketingNavbar';
import { MarketingSolutionDetailLayout } from '@/components/marketing/MarketingSolutionDetailLayout';
import { supportSolutionDetail } from '@/components/marketing/marketing-solution-detail-data';

export default function MarketingSolutionsSupportPage() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <>
      <MarketingNavbar />
      <MarketingSolutionDetailLayout
        page={supportSolutionDetail}
        onBookDemo={() => setDemoOpen(true)}
      />
      <BookDemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
