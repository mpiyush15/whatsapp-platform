import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingNavbar } from '@/components/marketing/MarketingNavbar';
import { marketingDisplay, marketingSans } from '@/lib/fonts/marketing';
import '@/styles/marketing.css';

export default function SolutionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`marketing-root flex min-h-screen flex-col ${marketingDisplay.variable} ${marketingSans.variable} font-marketing antialiased`}
    >
      <MarketingNavbar />
      <div className="flex-1">{children}</div>
      <MarketingFooter />
    </div>
  );
}
