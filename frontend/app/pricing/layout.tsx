import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { marketingDisplay, marketingSans } from '@/lib/fonts/marketing';
import '@/styles/marketing.css';

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`marketing-root flex min-h-screen flex-col ${marketingDisplay.variable} ${marketingSans.variable} font-marketing antialiased`}
    >
      <div className="flex-1">{children}</div>
      <MarketingFooter />
    </div>
  );
}
