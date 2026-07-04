"use client";
import React from 'react';
import Navbar from '@/components/sample/Navbar';
import ProductHero from '@/components/sample/ProductHero';
import FeatureVisualBuilder from '@/components/sample/FeatureVisualBuilder';
import FeatureInbox from '@/components/sample/FeatureInbox';
import FeatureBroadcast from '@/components/sample/FeatureBroadcast';
import ProductCTA from '@/components/sample/ProductCTA';
import Footer from '@/components/sample/Footer';

export default function ProductPage() {
  return (
    <div className="flex min-h-screen flex-col font-sans bg-white">
      <Navbar />
      
      <main className="flex flex-col w-full flex-grow">
        <ProductHero />
        <FeatureVisualBuilder />
        <FeatureInbox />
        <FeatureBroadcast />
        <ProductCTA />
      </main>

      <Footer />
    </div>
  );
}
