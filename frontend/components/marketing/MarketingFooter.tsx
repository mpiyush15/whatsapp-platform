'use client';

import Link from 'next/link';
import {
  marketingFooterColumns,
  marketingFooterCompanyLinks,
  marketingFooterCopy,
  marketingFooterProductLinks,
} from '@/components/marketing/marketing-footer-data';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-gray-200">{title}</h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={`${title}-${link.label}`}>
            <Link
              href={link.href}
              className="text-sm text-gray-400 transition hover:text-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetaPartnerBadge() {
  return (
    <div className="marketing-footer-meta-badge inline-flex max-w-xs flex-col gap-2 rounded-xl border border-[#e4e4e7] bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0081fb]"
          aria-hidden
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="white" aria-hidden>
            <path d="M12 2C6.48 2 2 6.15 2 11.25c0 2.87 1.44 5.43 3.69 7.1L4.5 22l3.94-2.17c1.05.29 2.16.45 3.31.45 5.52 0 10-4.15 10-9.25S17.52 2 12 2z" />
          </svg>
        </span>
        <div>
          <p className="text-xs font-semibold text-[#111111]">{marketingFooterCopy.metaBadgeTitle}</p>
          <p className="text-[11px] text-[#6d6c6b]">{marketingFooterCopy.metaBadgeSubtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 border-t border-[#f4f4f5] pt-2">
        <WhatsAppIcon className="marketing-icon-wa h-4 w-4 shrink-0" />
        <span className="text-[11px] font-medium text-[#128c7e]">WhatsApp Cloud API</span>
      </div>
    </div>
  );
}

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="marketing-footer border-t border-white/[0.08]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <Link href="/marketing" className="inline-block">
              <span className="font-marketing-display text-2xl font-bold tracking-tight text-white">
                replysys
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-400">
              {marketingFooterCopy.tagline}
            </p>
            <div className="mt-6">
              <MetaPartnerBadge />
            </div>
            <p className="mt-5 text-xs text-gray-500">{marketingFooterCopy.companyLine}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8 lg:grid-cols-5">
            <FooterColumn title="Product" links={marketingFooterProductLinks} />
            {marketingFooterColumns.map((col) => (
              <FooterColumn key={col.title} title={col.title} links={col.links} />
            ))}
            <FooterColumn title="Company" links={marketingFooterCompanyLinks} />
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.08] pt-8 sm:flex-row">
          <p className="text-center text-xs text-gray-400 sm:text-left">
            © {year} Replysys. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
            <Link
              href="/auth/login"
              className="text-xs font-medium text-gray-400 transition hover:text-white"
            >
              Open app
            </Link>
            <Link
              href="/auth/register"
              className="text-xs font-medium text-gray-400 transition hover:text-white"
            >
              Start free trial
            </Link>
            <Link
              href="/contact"
              className="marketing-cta-outline-wa rounded-lg px-3 py-1.5 text-xs font-semibold transition"
            >
              Book a demo
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
