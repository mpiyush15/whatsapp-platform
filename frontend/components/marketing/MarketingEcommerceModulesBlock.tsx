'use client';

import { useState } from 'react';
import { Check, MessageSquare, ShoppingBag, ShoppingCart } from 'lucide-react';
import type { SolutionDetailPageData } from '@/components/marketing/marketing-solution-detail-data';
import { KpiTile } from '@/components/marketing/MarketingIndustryMockPrimitives';
import {
  MARKETING_ECOMMERCE_PLAYBOOK_IMAGE_LOCAL,
  MARKETING_ECOMMERCE_PLAYBOOK_IMAGE_URL,
} from '@/lib/marketing/assets';

type MarketingEcommerceModulesBlockProps = {
  modules: SolutionDetailPageData['modules'];
};

export function MarketingEcommerceModulesBlock({ modules }: MarketingEcommerceModulesBlockProps) {
  const [imgSrc, setImgSrc] = useState(MARKETING_ECOMMERCE_PLAYBOOK_IMAGE_URL);

  return (
    <div className="mx-auto mt-10 grid max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-10">
      <div className="overflow-hidden rounded-2xl ring-1 ring-black/[0.06]">
        <img
          src={imgSrc}
          alt="Online market growth and ecommerce analytics"
          width={1024}
          height={1024}
          className="h-auto w-full object-cover"
          decoding="async"
          onError={() => {
            if (imgSrc !== MARKETING_ECOMMERCE_PLAYBOOK_IMAGE_LOCAL) {
              setImgSrc(MARKETING_ECOMMERCE_PLAYBOOK_IMAGE_LOCAL);
            }
          }}
        />
      </div>

      <div className="flex flex-col gap-6">
        <ul className="flex flex-col gap-3">
          {modules.items.map((item) => (
            <li key={item.label} className="flex items-center gap-3 text-sm text-[#3f3f46] sm:text-base">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              <span className="text-left">{item.label}</span>
              {!item.shipped ? (
                <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                  Soon
                </span>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="rounded-xl border border-black/[0.08] bg-white p-4 shadow-[0_10px_36px_rgba(17,17,17,0.07)] ring-1 ring-black/[0.04]">
          <div className="flex items-center gap-3 border-b border-black/[0.06] pb-3">
            <ShoppingBag className="h-8 w-8 text-violet-600" />
            <div>
              <p className="text-xs font-semibold text-slate-800">Shopify + WhatsApp</p>
              <p className="text-[10px] text-slate-500">One brand number · D2C ops</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <KpiTile label="Flows" value="5" sub="WISMO + returns" icon={MessageSquare} tone="sky" />
            <KpiTile label="COD confirm" value="92%" sub="Template sends" icon={ShoppingCart} tone="emerald" />
          </div>
        </div>
      </div>
    </div>
  );
}
