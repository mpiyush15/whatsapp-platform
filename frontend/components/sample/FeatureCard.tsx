"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface FeatureCardProps {
  icon: string | React.ReactNode;
  title: string;
  description: string;
  linkText?: string;
  linkHref?: string;
}

export default function FeatureCard({ icon, title, description, linkText = "Learn more", linkHref = "#" }: FeatureCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col rounded-[32px] bg-white p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] transition-all h-full border border-gray-50/50"
    >
      <div className="mb-8 text-4xl text-[#25D366]">
        {icon}
      </div>
      <h3 className="mb-4 text-2xl font-bold text-[#103928]">{title}</h3>
      <p className="mb-10 text-[16px] font-medium leading-relaxed text-[#1C1E21]/80 flex-grow">
        {description}
      </p>
      
      <a href={linkHref} className="mt-auto flex items-center gap-3 text-[#103928] font-medium hover:opacity-80 group">
        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#25D366] text-[#25D366] group-hover:bg-[#25D366] group-hover:text-white transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </div>
        <span className="text-[15px]">{linkText}</span>
      </a>
    </motion.div>
  );
}
