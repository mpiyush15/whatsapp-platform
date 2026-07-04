"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function FeatureBroadcast() {
  return (
    <section className="bg-white py-20 px-6 font-sans overflow-hidden min-h-[calc(100vh-72px)] flex items-center">
      <div className="mx-auto w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* LEFT COLUMN: THE NARRATIVE */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true }}
          className="space-y-6 lg:pr-8"
        >
          
          {/* Tag */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#008069]/20 bg-[#008069]/10 px-3 py-1 text-xs font-bold text-[#008069] uppercase tracking-wider">
            <span>🚀</span> Smart Broadcasts
          </div>
          
          {/* Headline */}
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1c1e21] sm:text-4xl lg:text-5xl leading-tight">
            Blast promotional offers that actually get read.
          </h2>
          
          {/* Body Text */}
          <p className="text-lg text-gray-600 leading-relaxed">
            Stop sending emails into the spam folder. Send bulk WhatsApp campaigns to thousands of opted-in customers at once. Use interactive buttons and product lists to drive 98% open rates and turn cold leads into instant sales.
          </p>
        </motion.div>

        {/* RIGHT COLUMN: THE UI MOCKUP (Campaign Builder) */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          viewport={{ once: true }}
          className="relative flex justify-center w-full"
        >
          
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] bg-[#25D366] opacity-10 blur-[60px] rounded-full pointer-events-none"></div>

          {/* Canvas Container */}
          <div className="relative w-full max-w-[500px] bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-2xl flex flex-col shrink-0">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                <div className="font-bold text-[#1c1e21] text-sm">New Campaign</div>
                <div className="text-[10px] text-gray-500">Draft • Unsaved</div>
              </div>
              <button className="bg-[#008069] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-[#006653] transition-colors">
                Send Now 🚀
              </button>
            </div>

            <div className="p-5 flex gap-6 bg-[#F8FAFC]">
              
              {/* Left Side: Setup Controls */}
              <div className="w-1/2 space-y-4">
                
                {/* Audience Selection */}
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">1. Audience</div>
                  <div className="bg-white border border-gray-200 p-2.5 rounded-lg shadow-sm flex justify-between items-center cursor-pointer">
                    <span className="text-xs font-bold text-[#1c1e21]">VIP Customers</span>
                    <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded-full">4,500</span>
                  </div>
                </div>

                {/* Template Selection */}
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">2. Message Template</div>
                  <div className="bg-white border border-gray-200 p-2.5 rounded-lg shadow-sm flex items-center justify-between cursor-pointer border-l-4 border-l-[#25D366]">
                    <span className="text-xs font-bold text-[#1c1e21]">Summer_Sale_v2</span>
                    <span className="text-[10px] text-green-600 font-bold">Approved</span>
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">3. Schedule</div>
                  <div className="bg-white border border-gray-200 p-2.5 rounded-lg shadow-sm">
                    <span className="text-xs text-gray-600 font-medium flex items-center gap-2">
                      📅 Send Immediately
                    </span>
                  </div>
                </div>

              </div>

              {/* Right Side: Live Preview (Mobile Phone Mockup) */}
              <div className="w-1/2 flex justify-center items-start">
                <div className="w-full max-w-[160px] bg-[#EFEAE2] rounded-[2rem] border-4 border-gray-800 shadow-lg relative h-[320px] overflow-hidden">
                  
                  {/* Phone Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-3 bg-gray-800 rounded-b-xl z-20"></div>
                  
                  {/* WhatsApp Header Fake */}
                  <div className="bg-[#008069] h-8 w-full absolute top-0 left-0 z-10 flex items-center px-3 pt-2">
                     <div className="text-[8px] font-bold text-white">ReplySys Bot</div>
                  </div>

                  {/* Message Bubble Preview */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.6 }} viewport={{ once: true }}
                    className="mt-10 flex justify-start relative z-10"
                  >
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                      
                      {/* Fake Image Placeholder */}
                      <div className="h-20 bg-blue-50 flex items-center justify-center border-b border-gray-100">
                        <span className="text-xl">🏖️</span>
                      </div>
                      
                      {/* Text Preview */}
                      <div className="p-2 space-y-1">
                        <div className="font-bold text-[10px] text-[#1c1e21]">Summer Blowout! ☀️</div>
                        <div className="text-[8px] text-gray-600 leading-tight">Get 30% off our entire summer collection today only. Tap below to shop!</div>
                      </div>
                      
                      {/* Interactive Button Preview */}
                      <div className="border-t border-gray-100 p-1.5 flex justify-center bg-gray-50">
                        <span className="text-[#008069] font-bold text-[9px] flex items-center gap-1">
                          🛍️ Shop Now
                        </span>
                      </div>

                    </div>
                  </motion.div>

                </div>
              </div>

            </div>
          </div>

          {/* Floating Success Ratio Bubble */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: -20 }} whileInView={{ opacity: 1, scale: 1, x: 0 }} transition={{ delay: 1.0 }} viewport={{ once: true }}
            className="absolute -left-2 lg:-left-12 bottom-12 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-center gap-3 z-30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600 text-lg shadow-sm">
              📈
            </div>
            <div>
              <div className="text-2xl font-black text-[#1c1e21] leading-none mb-1">98.5%</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Avg. Open Rate</div>
            </div>
          </motion.div>

          {/* Floating Replied Customers Bubble */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: 20 }} whileInView={{ opacity: 1, scale: 1, x: 0 }} transition={{ delay: 1.2 }} viewport={{ once: true }}
            className="absolute -right-4 lg:-right-16 top-24 bg-white rounded-2xl shadow-xl border border-gray-100/60 p-4 lg:p-5 flex items-center gap-4 z-30"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xl shadow-inner">
              💬
            </div>
            <div>
              <div className="text-3xl font-black text-[#1c1e21] leading-none mb-1.5">1,240</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Customers Replied</div>
            </div>
          </motion.div>

        </motion.div>

      </div>
    </section>
  );
}
