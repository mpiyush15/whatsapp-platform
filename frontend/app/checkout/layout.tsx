import { marketingDisplay, marketingSans } from '@/lib/fonts/marketing';
import '@/styles/marketing.css';

/** Checkout keeps existing payment logic; layout adds marketing fonts only. */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`marketing-root min-h-screen ${marketingDisplay.variable} ${marketingSans.variable} font-marketing antialiased bg-[#fafafa]`}
    >
      {children}
    </div>
  );
}
