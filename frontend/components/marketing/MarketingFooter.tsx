'use client';

import Link from 'next/link';
import {
  marketingFooterColumns,
  marketingFooterCompanyLinks,
  marketingFooterCopy,
  marketingFooterProductLinks,
} from '@/components/marketing/marketing-footer-data';

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

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="marketing-footer border-t border-emerald-950/40 bg-emerald-900">
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
            <p className="mt-6 max-w-sm text-sm font-bold leading-relaxed text-white">
              {marketingFooterCopy.officialPlatformLine}
            </p>
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
