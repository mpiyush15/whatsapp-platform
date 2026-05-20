'use client';

/**
 * Stable v2 — More power section with full dashboard mocks:
 * Agents, Templates, Campaign retargeting, Follow-up automation.
 */
import { MarketingSection } from '@/components/marketing/MarketingSection';
import { MarketingAdvancedFeatureMock } from '@/components/marketing/MarketingAdvancedFeatureMocks.stable';
import {
  advancedFeaturesSectionCopy,
  marketingAdvancedFeatures,
} from '@/components/marketing/marketing-advanced-features-mock-data';

export function MarketingAdvancedFeaturesSectionStable() {
  return (
    <MarketingSection
      id="advanced-features"
      eyebrow={advancedFeaturesSectionCopy.eyebrow}
      title={advancedFeaturesSectionCopy.titleMain}
      titleHighlight={advancedFeaturesSectionCopy.titleHighlight}
      subtitle={advancedFeaturesSectionCopy.subtitle}
      tone="whisper"
    >
      <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
        {marketingAdvancedFeatures.map((feature) => (
          <article
            key={feature.id}
            className={`marketing-advanced-card flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_2px_16px_rgba(17,17,17,0.05)] ${
              feature.size === 'tall' ? 'marketing-advanced-card--tall' : 'marketing-advanced-card--compact'
            }`}
          >
            <div className="p-5 sm:p-6 lg:p-7">
              <h3 className="text-lg font-semibold tracking-tight text-[#111111] sm:text-xl">
                {feature.title}
              </h3>
              {feature.paragraphs.map((p) => (
                <p key={p} className="mt-2 text-sm leading-relaxed text-[#6d6c6b]">
                  {p}
                </p>
              ))}
            </div>
            <div className={`mt-auto flex-1 px-3 pb-3 pt-0 sm:px-4 sm:pb-4 ${feature.tintClass}`}>
              <MarketingAdvancedFeatureMock id={feature.id} />
            </div>
          </article>
        ))}
      </div>
    </MarketingSection>
  );
}
