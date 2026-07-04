"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function PricingComponent() {
  return (
    <div className="bg-[#F8FAFC] font-sans pb-24">
      
      {/* SECTION 1: THE DARK PRICING HERO */}
      <section className="bg-[#1C1E21] pt-24 pb-40 px-6 relative overflow-hidden text-center border-b border-gray-800">
        
        {/* Background Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-[#008069] opacity-20 blur-[100px] pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-3xl mx-auto space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#25D366]/30 bg-[#25D366]/10 px-3 py-1 text-xs font-bold text-[#25D366] uppercase tracking-wider">
            <span>💎</span> Transparent Pricing
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Pricing that scales with <br />
            <span className="text-[#25D366]">your customer growth.</span>
          </h1>
          
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            Start for free. Upgrade when you need more power. No hidden fees, and Meta's official conversation charges are passed through exactly at cost.
          </p>

          {/* Monthly/Annually Toggle */}
          <div className="flex items-center justify-center gap-4 pt-6">
            <span className="text-sm font-bold text-white">Monthly</span>
            <div className="relative inline-flex h-7 w-14 cursor-pointer items-center rounded-full bg-[#008069] transition-colors">
              <span className="translate-x-8 inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm"></span>
            </div>
            <span className="text-sm font-bold text-gray-400">Annually <span className="text-[#25D366] text-xs ml-1">(Save 20%)</span></span>
          </div>
        </motion.div>
      </section>

      {/* SECTION 2: THE OVERLAPPING PRICING GRID */}
      <section className="mx-auto max-w-7xl px-6 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

          {/* TIER 1: STARTER */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xl flex flex-col h-full"
          >
            <h3 className="text-xl font-bold text-[#1c1e21]">Starter</h3>
            <p className="text-sm text-gray-500 mt-2 min-h-[40px]">Perfect for small teams moving away from the standard WhatsApp app.</p>
            
            <div className="my-6">
              <span className="text-4xl font-black text-[#1c1e21]">$49</span>
              <span className="text-gray-500 font-medium">/month</span>
            </div>

            <a href="/trial" className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 text-[#1c1e21] font-bold text-center hover:border-[#008069] hover:text-[#008069] transition-colors mb-8">
              Start 14-Day Free Trial
            </a>

            <div className="space-y-4 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">What's included</div>
              <ul className="space-y-3 text-sm text-gray-600 font-medium">
                <li className="flex gap-3"><span className="text-[#008069]">✓</span> Up to 3 Team Members</li>
                <li className="flex gap-3"><span className="text-[#008069]">✓</span> Shared Team Inbox</li>
                <li className="flex gap-3"><span className="text-[#008069]">✓</span> Basic Chatbot Builder</li>
                <li className="flex gap-3"><span className="text-[#008069]">✓</span> Standard Support</li>
              </ul>
            </div>
          </motion.div>

          {/* TIER 2: PROFESSIONAL (HIGHLIGHTED) */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-[#115B4C] rounded-3xl border border-[#25D366]/30 p-8 shadow-2xl flex flex-col h-full relative transform md:-translate-y-4"
          >
            {/* Popular Badge */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#25D366] text-[#115B4C] text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
              Most Popular
            </div>

            <h3 className="text-xl font-bold text-white">Professional</h3>
            <p className="text-sm text-[#D9FDD3]/80 mt-2 min-h-[40px]">For growing businesses needing advanced automation and broadcasts.</p>
            
            <div className="my-6">
              <span className="text-4xl font-black text-white">$149</span>
              <span className="text-[#D9FDD3]/60 font-medium">/month</span>
            </div>

            <a href="/trial" className="w-full py-3 px-4 rounded-xl bg-[#25D366] text-[#115B4C] font-extrabold text-center shadow-lg hover:bg-white hover:-translate-y-0.5 transition-all mb-8">
              Start 14-Day Free Trial
            </a>

            <div className="space-y-4 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-[#D9FDD3]/60 mb-4">Everything in Starter, plus</div>
              <ul className="space-y-3 text-sm text-white font-medium">
                <li className="flex gap-3"><span className="text-[#25D366]">✓</span> Up to 10 Team Members</li>
                <li className="flex gap-3"><span className="text-[#25D366]">✓</span> Smart Broadcast Engine</li>
                <li className="flex gap-3"><span className="text-[#25D366]">✓</span> Advanced API Routing</li>
                <li className="flex gap-3"><span className="text-[#25D366]">✓</span> E-commerce Integrations</li>
                <li className="flex gap-3"><span className="text-[#25D366]">✓</span> Priority Support</li>
              </ul>
            </div>
          </motion.div>

          {/* TIER 3: ENTERPRISE */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xl flex flex-col h-full"
          >
            <h3 className="text-xl font-bold text-[#1c1e21]">Enterprise</h3>
            <p className="text-sm text-gray-500 mt-2 min-h-[40px]">Custom infrastructure and dedicated support for large scale operations.</p>
            
            <div className="my-6">
              <span className="text-4xl font-black text-[#1c1e21]">Custom</span>
            </div>

            <a href="/demo" className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 text-[#1c1e21] font-bold text-center hover:border-[#1c1e21] transition-colors mb-8">
              Talk to Sales
            </a>

            <div className="space-y-4 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Everything in Pro, plus</div>
              <ul className="space-y-3 text-sm text-gray-600 font-medium">
                <li className="flex gap-3"><span className="text-[#008069]">✓</span> Unlimited Team Members</li>
                <li className="flex gap-3"><span className="text-[#008069]">✓</span> Dedicated Success Manager</li>
                <li className="flex gap-3"><span className="text-[#008069]">✓</span> Custom SLA Guarantees</li>
                <li className="flex gap-3"><span className="text-[#008069]">✓</span> Custom Engineering Support</li>
              </ul>
            </div>
          </motion.div>

        </div>
      </section>
      
    </div>
  );
}
