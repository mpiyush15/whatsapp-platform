import { marketingDisplay, marketingSans } from '@/lib/fonts/marketing';
import '@/styles/marketing.css';
import { PublicSiteChrome } from '@/components/marketing/PublicSiteChrome';

export default function PublicMarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`marketing-root flex min-h-screen flex-col ${marketingDisplay.variable} ${marketingSans.variable} font-marketing antialiased`}
    >
      <PublicSiteChrome>{children}</PublicSiteChrome>
    </div>
  );
}
