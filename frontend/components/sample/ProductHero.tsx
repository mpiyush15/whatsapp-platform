"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function ProductHero() {
  return (
    <section className="bg-[#115B4C] px-6 py-20 overflow-hidden font-sans relative min-h-[calc(100vh-72px)] flex items-center">
      
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#25D366_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03]"></div>

      <div className="mx-auto w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        
        {/* LEFT COLUMN: SIMPLE CAPABILITIES */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-8 text-left"
        >
          
          <div className="inline-flex items-center gap-2 rounded-full border border-[#25D366]/30 bg-[#25D366]/10 px-3 py-1 text-xs font-bold text-[#25D366] uppercase tracking-wider">
            <span>🚀</span> The ReplySys Engine
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-[#D9FDD3] sm:text-5xl lg:text-6xl leading-[1.1]">
            Your complete <br />
            <span className="text-[#25D366]">customer growth engine.</span>
          </h1>

          <p className="max-w-lg text-lg text-white/80 leading-relaxed">
            Everything your team needs to build automated welcome menus, blast promotional offers, and handle thousands of support chats—without writing a single line of code.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <a 
              href="/trial" 
              className="inline-flex justify-center items-center rounded-full bg-[#25D366] px-8 py-4 text-base font-extrabold text-[#115B4C] shadow-lg transition-all hover:bg-white hover:-translate-y-0.5"
            >
              Start Building Free
            </a>
            <a 
              href="#features" 
              className="inline-flex justify-center items-center gap-2 rounded-full border border-white/30 bg-transparent px-8 py-4 text-base font-bold text-[#D9FDD3] transition-all hover:bg-white/10"
            >
              See all features &rarr;
            </a>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: THE "SIMPLE METRICS" VISUAL */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="relative flex justify-center lg:justify-end"
        >
          
          {/* Main Floating Dashboard UI (No Code!) */}
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#1C1E21] p-6 shadow-2xl">
            
            {/* UI Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-[#25D366]/20 rounded-full flex items-center justify-center text-[#25D366] text-xl">📢</div>
                <div>
                  <div className="text-white font-bold">Summer Sale Broadcast</div>
                  <div className="text-xs text-[#25D366] font-mono">Status: Active Right Now</div>
                </div>
              </div>
            </div>

            {/* Easy to read metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">Messages Sent</div>
                <div className="text-2xl font-bold text-white">12,450</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">Open Rate</div>
                <div className="text-2xl font-bold text-[#25D366]">98.2%</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/5 col-span-2">
                <div className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">Total Sales Generated</div>
                <div className="text-2xl font-bold text-[#D9FDD3]">$14,290.00</div>
              </div>
            </div>

            {/* Overlapping "Success" Notification (WhatsApp Bubble Style) */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="absolute -bottom-6 -left-6 rounded-2xl rounded-tr-sm bg-[#d9fdd3] p-3.5 shadow-xl flex items-center gap-3 border border-[#c8ebd2] z-20"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#008069] text-white text-lg shadow-sm">
                💸
              </div>
              <div>
                <div className="text-sm font-bold text-[#1c1e21]">New order received!</div>
                <div className="text-xs text-[#008069] font-medium mt-0.5">via WhatsApp Checkout</div>
              </div>
            </motion.div>

          </div>
        </motion.div>

      </div>
    </section>
  );
}
