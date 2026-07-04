"use client";

import React from 'react';
import { motion } from 'framer-motion';

export default function WhatsAppMockup() {
  return (
    <div className="relative w-full max-w-[340px] mx-auto flex flex-col gap-6">
        
      {/* Marketing Message (Sent by Business) */}
      <motion.div 
        initial={{ opacity: 0, x: -20, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
        className="relative max-w-[90%] self-start rounded-2xl rounded-tl-none bg-white p-3 shadow-xl"
      >
        {/* Header Image Placeholder */}
        <div className="h-32 w-full rounded-xl bg-gradient-to-r from-[#008069] to-[#25D366] flex items-center justify-center mb-3">
            <span className="text-white font-extrabold text-2xl">50% OFF 🎉</span>
        </div>
        <p className="px-1 font-medium text-[#1C1E21] text-[15px]">
          Hey there! 👋 <br/><br/>
          Ready to upgrade your team's workflow? Get 50% off your first 3 months with ReplySys.
        </p>
        <div className="mt-2 flex items-center justify-between px-1">
          <span className="text-[12px] text-gray-400">10:42 AM</span>
        </div>
        
        {/* Interactive Button */}
        <div className="mt-3 border-t border-gray-100 pt-3 flex items-center justify-center text-[#008069] font-bold gap-2 text-[15px] cursor-pointer hover:opacity-80 transition-opacity">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 16 16 12 12 8"></polyline>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          Claim Offer
        </div>
      </motion.div>

      {/* Customer Reply */}
      <motion.div 
        initial={{ opacity: 0, x: 20, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 1.2 }}
        className="relative max-w-[85%] self-end rounded-2xl rounded-tr-none bg-[#d9fdd3] p-4 shadow-xl"
      >
        <p className="text-[#1C1E21] text-[15px]">
          Wow, this is exactly what we need! Just signed up. 🚀
        </p>
        <div className="mt-2 flex items-center justify-end gap-1">
          <span className="text-[12px] text-gray-500">10:45 AM</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34B7F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
            <polyline points="20 6 9 17 4 12"></polyline>
            <polyline points="24 10 15 19 10 14" opacity="0.5"></polyline>
          </svg>
        </div>
      </motion.div>
      
    </div>
  );
}
