"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Navbar() {
  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5, 
        ease: "easeOut",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <motion.nav 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="sticky top-0 z-50 bg-[#FFFFFF] shadow-sm border-b border-gray-100"
    >
      {/* Container to match desktop and mobile height */}
      <div className="mx-auto flex h-[60px] md:h-[72px] max-w-[1400px] items-center justify-between px-6 md:px-[5%]">
        
        {/* Left Side: Replysys Icon/Logo */}
        <motion.div variants={itemVariants} className="flex items-center gap-2 cursor-pointer font-extrabold tracking-tight">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#008069" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.0003 2.00391C6.48625 2.00391 2.00391 6.48625 2.00391 12.0003C2.00391 13.7628 2.45931 15.421 3.2539 16.8522L2.17646 20.7813L6.21639 19.7214C7.59374 20.4578 9.19159 20.887 10.8931 20.887C16.4072 20.887 20.8895 16.4047 20.8895 10.8906C20.8895 5.3766 16.4072 1.95473 12.0003 2.00391ZM12.0003 19.2907C10.5186 19.2907 9.13111 18.918 7.9255 18.2618L7.61633 18.0772L4.74313 18.831L5.51323 16.0125L5.31175 15.692C4.59567 14.3948 4.18431 12.9038 4.18431 11.3195C4.18431 7.00949 7.69025 3.50355 12.0003 3.50355C16.3103 3.50355 19.8162 7.00949 19.8162 11.3195C19.8162 15.6295 16.3103 19.2907 12.0003 19.2907Z" />
          </svg>
          <span className="text-[20px] text-[#1C1E21]">ReplySys</span>
        </motion.div>

        {/* Center Side: Links */}
        <motion.div variants={itemVariants} className="hidden md:flex items-center gap-8 font-medium text-[#1C1E21] leading-relaxed">
          <Link href="/sample-landing" className="hover:opacity-70 transition-opacity">Home</Link>
          <Link href="/sample-product" className="hover:opacity-70 transition-opacity">Product</Link>
          <Link href="/sample-pricing" className="hover:opacity-70 transition-opacity">Pricing</Link>
          <Link href="/setup-guide" className="hover:opacity-70 transition-opacity">Setup Guide</Link>
        </motion.div>

        {/* Right Side: Auth Buttons */}
        <motion.div variants={itemVariants} className="hidden md:flex items-center gap-4">
          <Link 
            href="/sample-login" 
            className="rounded-full bg-[#FFFFFF] border border-[#008069] px-6 py-2.5 text-[15px] font-bold text-[#008069] transition-all hover:bg-[#F0F2F5]"
          >
            Log in
          </Link>
          <Link 
            href="/start-trial" 
            className="rounded-full bg-[#008069] px-6 py-2.5 text-[15px] font-bold text-[#FFFFFF] transition-all hover:bg-[#006653] shadow-sm hover:shadow-md"
          >
            Start free trial
          </Link>
        </motion.div>

        {/* Mobile menu icon (placeholder) */}
        <motion.div variants={itemVariants} className="md:hidden flex items-center text-[#1C1E21]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </motion.div>
      </div>
    </motion.nav>
  );
}
