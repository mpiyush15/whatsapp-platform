import React from 'react';
import Navbar from '@/components/sample/Navbar';
import Footer from '@/components/sample/Footer';
import PricingComponent from '@/components/sample/PricingComponent';

export const metadata = {
  title: 'Pricing | ReplySys',
  description: 'Simple, transparent pricing for growing businesses on WhatsApp.',
};

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen font-sans bg-gray-50">
      {/* Global Navigation */}
      <Navbar />
      
      {/* Main Content Area */}
      <main className="flex flex-col w-full flex-grow pt-[60px] md:pt-[72px] bg-[#1C1E21]">
        <PricingComponent />
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
