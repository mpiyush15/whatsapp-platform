"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function ProductCTA() {
  return (
    <section className="bg-[#115B4C] py-24 px-6 relative overflow-hidden font-sans border-b border-gray-800">
      
      {/* Background Graphic Elements */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 h-96 w-96 rounded-full bg-[#25D366] opacity-10 blur-[80px]"></div>
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-96 w-96 rounded-full bg-[#008069] opacity-20 blur-[80px]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
        className="mx-auto max-w-4xl text-center relative z-10 space-y-8"
      >
        
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Ready to build your <br className="hidden md:block" />
          <span className="text-[#25D366]">customer growth engine?</span>
        </h2>
        
        <p className="text-xl text-[#D9FDD3] max-w-2xl mx-auto leading-relaxed">
          Join hundreds of smart businesses using ReplySys to automate their support and scale their sales on WhatsApp. No credit card required to start.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6">
          <a 
            href="/trial" 
            className="inline-flex justify-center items-center rounded-full bg-[#25D366] px-10 py-5 text-lg font-extrabold text-[#115B4C] shadow-2xl transition-all hover:bg-white hover:-translate-y-1"
          >
            Start Your Free Trial
          </a>
          <a 
            href="/demo" 
            className="inline-flex justify-center items-center rounded-full border-2 border-white/20 bg-transparent px-10 py-5 text-lg font-bold text-white transition-all hover:bg-white/10"
          >
            Talk to Sales
          </a>
        </div>

        <p className="mt-6 text-sm text-white/50 font-medium">
          Setup takes under 5 minutes. Official Meta Partner.
        </p>

      </motion.div>
    </section>
  );
}
