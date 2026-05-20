'use client';

import { ShieldCheck } from 'lucide-react';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import { MarketingVideoPlayer } from '@/components/marketing/MarketingVideoPlayer';
import { whatsAppApiVideoSectionCopy } from '@/components/marketing/marketing-landing-data';
import {
  MARKETING_WA_API_VIDEO_POSTER,
  MARKETING_WA_API_VIDEO_SRC,
} from '@/lib/marketing/assets';

export function MarketingWhatsAppApiVideoSection() {
  const copy = whatsAppApiVideoSectionCopy;

  return (
    <MarketingSection
      id="whatsapp-api-video"
      eyebrow={copy.eyebrow}
      title={copy.title}
      titleHighlight={copy.titleHighlight}
      subtitle={copy.subtitle}
      tone="whisper"
      accent="whatsapp"
    >
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="order-2 lg:order-1">
          <ul className="space-y-5">
            {copy.highlights.map((item, i) => (
              <li key={item.id} className="flex gap-4">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/[0.06] bg-white shadow-sm"
                  aria-hidden
                >
                  <span className="font-mono text-xs font-bold text-[#16a34a]">{String(i + 1).padStart(2, '0')}</span>
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="flex items-center gap-2 text-sm font-semibold text-[#111111] sm:text-base">
                    {item.title}
                    {item.id === 'secure' ? (
                      <ShieldCheck className="marketing-icon-wa h-4 w-4 shrink-0" aria-hidden />
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[#6d6c6b]">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="order-1 lg:order-2">
          <MarketingVideoPlayer
            src={MARKETING_WA_API_VIDEO_SRC}
            poster={MARKETING_WA_API_VIDEO_POSTER || undefined}
            title={copy.videoTitle}
            placeholderHint={copy.placeholderHint}
          />
        </div>
      </div>
    </MarketingSection>
  );
}
