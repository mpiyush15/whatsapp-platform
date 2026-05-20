import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { marketingDisplay, marketingSans } from '@/lib/fonts/marketing';
import type { Metadata } from 'next';
import '@/styles/marketing.css';

export const metadata: Metadata = {
  title: 'Replysys — WhatsApp growth platform',
  description: 'Live inbox, campaigns, automation, and analytics on WhatsApp Business API.',
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`marketing-root flex min-h-screen flex-col ${marketingDisplay.variable} ${marketingSans.variable} font-marketing antialiased`}
    >
      <div className="flex-1">{children}</div>
      <MarketingFooter />
    </div>
  );
}
