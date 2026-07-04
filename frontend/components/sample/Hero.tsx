"use client";

import React from 'react';
import { motion } from 'framer-motion';
import WhatsAppMockup from './WhatsAppMockup';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#FCF5EC] px-6 py-20 md:px-[5%] md:py-32">
      <div className="mx-auto max-w-[1400px] grid grid-cols-1 lg:grid-cols-[70%_30%] gap-12 items-center">
        
        {/* Left Column (70%) */}
        <div className="flex flex-col items-start text-left">
          {/* Trust Pill */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#25D366]/30 bg-[#25D366]/10 px-4 py-1.5 shadow-sm"
          >
            <span className="text-sm font-bold text-[#008069]">✨ Official Meta Business Partner Member</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="mt-4 max-w-4xl text-5xl font-extrabold tracking-tight text-[#1C1E21] md:text-6xl lg:text-7xl leading-tight"
          >
            The easiest way for your team to sell and support on <span className="text-[#008069]">WhatsApp.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-[#667781] md:text-xl"
          >
            Bring your entire staff under one official business number. Send bulk campaigns without getting blocked, automate your replies, and stop missing messages—zero coding required.
          </motion.p>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-start w-full sm:w-auto"
          >
            <a 
              href="/start-trial" 
              className="flex w-full sm:w-auto items-center justify-center rounded-full bg-[#008069] px-8 py-4 text-lg font-bold text-[#FFFFFF] shadow-sm transition-all hover:bg-[#006653] hover:shadow-md"
            >
              Start Free Trial
            </a>
            <a 
              href="#how-it-works" 
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full px-8 py-4 text-lg font-bold text-[#1C1E21] transition-all hover:bg-gray-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5v14l11-7z" />
              </svg>
              See How It Works ↓
            </a>
          </motion.div>
        </div>
        
        {/* Right Column (30%) */}
        <div className="flex flex-col items-center justify-center w-full h-full relative z-10">
          <WhatsAppMockup />
        </div>
        
      </div>
    </section>
  );
}
