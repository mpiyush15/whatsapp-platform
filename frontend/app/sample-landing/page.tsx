"use client";
import React from 'react';
import Navbar from '@/components/sample/Navbar';
import Hero from '@/components/sample/Hero';
import CorePillars from '@/components/sample/CorePillars';
import TrustSection from '@/components/sample/TrustSection';
import StatsSection from '@/components/sample/StatsSection';
import SetupAndCTA from '@/components/sample/SetupAndCTA';
import Footer from '@/components/sample/Footer';

export default function ReplySysOfficialLanding() {
  return (
    <div className="min-h-screen bg-white text-[#103928] antialiased font-sans selection:bg-[#25D366]/20 selection:text-[#103928]">
      <Navbar />
      
      <main className="flex flex-col w-full">
        <Hero />
        <CorePillars />
        <TrustSection />
        <StatsSection />
        <SetupAndCTA />
        <Footer />
      </main>
    </div>
  );
}
