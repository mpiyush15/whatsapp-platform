'use client';

import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingNavbar } from '@/components/marketing/MarketingNavbar';

type PublicSiteChromeProps = {
  children: React.ReactNode;
  /** Extra top padding below fixed nav (default accounts for navbar) */
  contentClassName?: string;
};

/** Shared marketing nav + footer for legacy public pages (solutions, legal, contact, etc.) */
export function PublicSiteChrome({ children, contentClassName = 'pt-20 sm:pt-24' }: PublicSiteChromeProps) {
  return (
    <>
      <MarketingNavbar />
      <div className={contentClassName}>{children}</div>
      <MarketingFooter />
    </>
  );
}
