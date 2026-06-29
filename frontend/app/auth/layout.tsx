import { MarketingNavbar } from '@/components/marketing/MarketingNavbar';
import { marketingDisplay, marketingSans } from '@/lib/fonts/marketing';
import '@/styles/marketing.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`marketing-root min-h-screen ${marketingDisplay.variable} ${marketingSans.variable} font-marketing antialiased`}
    >
      <MarketingNavbar />
      <div className="pt-[4.25rem] sm:pt-24">{children}</div>
    </div>
  );
}
