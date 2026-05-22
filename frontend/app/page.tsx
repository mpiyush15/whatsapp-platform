import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingHomePage } from '@/components/marketing/MarketingHomePage';
import { marketingDisplay, marketingSans } from '@/lib/fonts/marketing';
import '@/styles/marketing.css';

export default function HomePage() {
  return (
    <div
      className={`marketing-root flex min-h-screen flex-col ${marketingDisplay.variable} ${marketingSans.variable} font-marketing antialiased`}
    >
      <div className="flex-1">
        <MarketingHomePage />
      </div>
      <MarketingFooter />
    </div>
  );
}
