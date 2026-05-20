'use client';

/**
 * Stable v2 — post-hero marketing sections (broadcast through final CTA).
 */
import { MarketingAdvancedFeaturesSectionStable } from '@/components/marketing/MarketingAdvancedFeaturesSection.stable';
import { MarketingBroadcastSection } from '@/components/marketing/MarketingBroadcastSection';
import { MarketingCapabilitiesSection } from '@/components/marketing/MarketingCapabilitiesSection';
import { MarketingFaqSection } from '@/components/marketing/MarketingFaqSection';
import { MarketingFinalCtaSection } from '@/components/marketing/MarketingFinalCtaSection';
import { MarketingProductPillarsSection } from '@/components/marketing/MarketingProductPillarsSection';
import { MarketingTrustApiSection } from '@/components/marketing/MarketingTrustApiSection';
import { MarketingWhyWhatsAppSection } from '@/components/marketing/MarketingWhyWhatsAppSection';

export function MarketingPostHeroStable() {
  return (
    <>
      <MarketingBroadcastSection />
      <MarketingProductPillarsSection />
      <MarketingWhyWhatsAppSection />
      <MarketingCapabilitiesSection />
      <MarketingTrustApiSection />
      <MarketingAdvancedFeaturesSectionStable />
      <MarketingFaqSection />
      <MarketingFinalCtaSection />
    </>
  );
}
