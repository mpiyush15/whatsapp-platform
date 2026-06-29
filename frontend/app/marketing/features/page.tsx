'use client';

import { useState } from 'react';
import { BookDemoModal } from '@/components/BookDemoModal';
import { MarketingFeaturesGridSection } from '@/components/marketing/MarketingFeaturesGridSection';
import { MarketingFeaturesCompareSection } from '@/components/marketing/MarketingFeaturesCompareSection';
import { MarketingFeaturesCtaSection } from '@/components/marketing/MarketingFeaturesCtaSection';
import { MarketingFeaturesEdtechCalloutSection } from '@/components/marketing/MarketingFeaturesEdtechCalloutSection';
import { MarketingFeaturesHealthcareCalloutSection } from '@/components/marketing/MarketingFeaturesHealthcareCalloutSection';
import { MarketingFeaturesPillarsSection } from '@/components/marketing/MarketingFeaturesPillarsSection';
import { MarketingFeaturesHero } from '@/components/marketing/MarketingFeaturesHero';
import { MarketingNavbar } from '@/components/marketing/MarketingNavbar';

export default function MarketingFeaturesPage() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <>
      <MarketingNavbar />
      <main className="marketing-hero-bg relative flex min-h-[100dvh] min-h-[100svh] flex-col pt-20 sm:pt-24">
        <MarketingFeaturesHero onBookDemo={() => setDemoOpen(true)} />
      </main>
      <MarketingFeaturesGridSection />
      <MarketingFeaturesPillarsSection />
      <MarketingFeaturesHealthcareCalloutSection />
      <MarketingFeaturesEdtechCalloutSection />
      <MarketingFeaturesCompareSection />
      <MarketingFeaturesCtaSection onBookDemo={() => setDemoOpen(true)} />
      <BookDemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
