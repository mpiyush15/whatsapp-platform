'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { customerSpotlightCopy } from '@/components/marketing/marketing-landing-data';
import {
  MARKETING_CUSTOMER_PLANT_IN_GARDEN_LOCAL,
  MARKETING_CUSTOMER_PLANT_IN_GARDEN_URL,
  MARKETING_CUSTOMER_VAIBHAV_LOGO_LOCAL,
  MARKETING_CUSTOMER_VAIBHAV_LOGO_URL,
} from '@/lib/marketing/assets';

export function MarketingCustomerSpotlight() {
  const copy = customerSpotlightCopy;
  const [logoSrc, setLogoSrc] = useState(MARKETING_CUSTOMER_VAIBHAV_LOGO_URL);
  const [storeSrc, setStoreSrc] = useState(MARKETING_CUSTOMER_PLANT_IN_GARDEN_URL);

  return (
    <section className="border-t border-black/[0.06] bg-[#fafaf9] py-12 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.45 }}
        className="mx-auto max-w-5xl px-4 sm:px-6"
      >
        <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_16px_48px_rgba(17,17,17,0.07)] ring-1 ring-black/[0.04]">
          <div className="grid lg:grid-cols-[1fr_280px]">
            <div className="flex flex-col justify-center p-6 sm:p-8 lg:border-r lg:border-black/[0.06]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#128c7e]">
                {copy.eyebrow}
              </p>
              <p className="mt-3 text-lg font-semibold text-[#111111] sm:text-xl">
                {copy.company} · <span className="text-[#52525b]">{copy.brand}</span>
              </p>
              <p className="mt-1 text-sm text-[#6d6c6b]">
                {copy.brandHint} — {copy.headline}
              </p>

              <blockquote className="mt-5 border-l-2 border-[#128c7e]/40 pl-4">
                <p className="text-base leading-relaxed text-[#3f3f46] sm:text-[1.0625rem]">
                  &ldquo;{copy.quote}&rdquo;
                </p>
                <footer className="mt-3 text-xs text-[#a1a1aa]">{copy.attribution}</footer>
              </blockquote>

              <ul className="mt-5 flex flex-wrap gap-2">
                {copy.outcomes.map((item) => (
                  <li
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-[#fafaf9] px-3 py-1.5 text-[11px] font-medium text-[#52525b]"
                  >
                    <Check className="h-3 w-3 text-[#128c7e]" strokeWidth={2.5} aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col bg-[#fafaf9]">
              <div className="flex items-center justify-center bg-[#111111] px-6 py-5">
                <img
                  src={logoSrc}
                  alt={`${copy.company} logo`}
                  className="h-9 w-auto max-w-[200px] object-contain"
                  onError={() => {
                    if (logoSrc !== MARKETING_CUSTOMER_VAIBHAV_LOGO_LOCAL) {
                      setLogoSrc(MARKETING_CUSTOMER_VAIBHAV_LOGO_LOCAL);
                    }
                  }}
                />
              </div>
              <div className="relative min-h-[160px] flex-1 sm:min-h-[200px] lg:min-h-[220px]">
                <img
                  src={storeSrc}
                  alt={`${copy.brand} online store`}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                  onError={() => {
                    if (storeSrc !== MARKETING_CUSTOMER_PLANT_IN_GARDEN_LOCAL) {
                      setStoreSrc(MARKETING_CUSTOMER_PLANT_IN_GARDEN_LOCAL);
                    }
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-3">
                  <p className="text-[11px] font-semibold text-white">{copy.brand} storefront</p>
                  <p className="text-[10px] text-white/85">Live ecommerce · WhatsApp on Replysys</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
