'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { BadgeCheck, ChevronLeft, MoreVertical, Phone, Video } from 'lucide-react';

const TEMPLATE_IMAGE =
  'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=640&q=80';

export function MarketingWhatsAppPhoneMock() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      className="marketing-wa-phone-mock pointer-events-none mx-auto w-full max-w-[292px] select-none sm:max-w-[320px]"
      aria-hidden
    >
      <div className="relative rounded-[2.25rem] bg-[#1a1a1a] p-[3px] shadow-[0_28px_56px_-12px_rgba(0,0,0,0.22)] ring-1 ring-black/10">
        <div
          className="absolute left-1/2 top-[6px] z-20 h-[22px] w-[88px] -translate-x-1/2 rounded-full bg-[#1a1a1a]"
          aria-hidden
        />

        <div className="overflow-hidden rounded-[2rem] bg-[#efeae2]">
          <div className="flex items-center justify-between bg-[#008069] px-5 pb-1 pt-7 text-[11px] font-medium text-white">
            <span>9:41</span>
            <div className="flex items-center gap-1 opacity-95">
              <span className="h-[10px] w-[14px] rounded-[2px] border border-white/90" />
              <span className="h-[9px] w-[14px] rounded-sm bg-white/90" />
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-[#008069] px-3 pb-3 pt-1 text-white">
            <ChevronLeft className="h-5 w-5 shrink-0 opacity-90" strokeWidth={2} />
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/20">
              <span className="text-sm font-semibold tracking-tight">SV</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="truncate text-[15px] font-semibold leading-tight">StyleVault Co.</p>
                <BadgeCheck
                  className="h-[18px] w-[18px] shrink-0 fill-[#53bdeb] text-[#008069]"
                  strokeWidth={0}
                />
              </div>
              <p className="text-[11px] font-medium text-white/80">Business account</p>
            </div>
            <div className="flex shrink-0 items-center gap-4 pr-0.5 opacity-95">
              <Video className="h-[18px] w-[18px]" strokeWidth={2} />
              <Phone className="h-[17px] w-[17px]" strokeWidth={2} />
              <MoreVertical className="h-[18px] w-[18px]" strokeWidth={2} />
            </div>
          </div>

          <div
            className="relative min-h-[368px] px-3 pb-5 pt-4 sm:min-h-[388px]"
            style={{
              backgroundColor: '#efeae2',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23d1c9bf' fill-opacity='0.22'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40z'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          >
            <div className="mb-3 flex justify-center">
              <span className="rounded-lg bg-white/90 px-2.5 py-1 text-[10px] font-medium text-[#54656f] shadow-sm">
                Today
              </span>
            </div>

            <div className="mr-6 max-w-[94%]">
              <div className="overflow-hidden rounded-xl rounded-tl-sm bg-white shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
                <div className="relative aspect-[1.05/1] w-full overflow-hidden bg-stone-100">
                  <Image
                    src={TEMPLATE_IMAGE}
                    alt=""
                    fill
                    className="object-cover object-center"
                    sizes="280px"
                    unoptimized
                  />
                  <span className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                    Marketing
                  </span>
                </div>

                <div className="px-3 pb-1 pt-2.5">
                  <p className="text-[13px] font-semibold leading-snug text-[#111b21]">
                    Flat 30% off — new arrivals
                  </p>
                  <p className="mt-1.5 text-[12px] leading-[1.35] text-[#54656f]">
                    Hi {'{{name}}'}, your exclusive style drop is live. Shop curated looks before
                    sizes run out. Valid till Sunday.
                  </p>
                  <p className="mt-2 text-[10px] text-[#8696a0]">StyleVault Co.</p>
                </div>

                <div className="border-t border-[#e9edef]">
                  <div className="flex items-center justify-center border-b border-[#e9edef] py-2.5 text-[13px] font-medium text-[#008069]">
                    Shop now
                  </div>
                  <div className="flex items-center justify-center py-2.5 text-[13px] font-medium text-[#008069]">
                    View catalog
                  </div>
                </div>
              </div>

              <div className="mt-1 flex items-center justify-end gap-1 pr-0.5 text-[10px] text-[#8696a0]">
                <span>10:24 AM</span>
                <span className="text-[#53bdeb]">✓✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="marketing-text-wa mt-5 text-center text-xs font-semibold tracking-wide sm:text-sm">
        Powered by Meta Cloud API
      </p>
    </motion.div>
  );
}
