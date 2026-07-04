"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function TrustSection() {
  return (
    <section className="bg-[#1C1E21] px-6 py-20 md:px-[5%] md:py-32 overflow-hidden min-h-[720px] flex items-center">
      <div className="mx-auto w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* LEFT COLUMN: THE SECURITY NARRATIVE */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-8 text-left"
        >
          
          {/* Sub-tag */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#25D366]/30 bg-[#25D366]/10 px-3 py-1 text-xs font-bold text-[#25D366] uppercase tracking-wider">
            <span>🛡️</span> Secure & Official
          </div>

          {/* Main Headline */}
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight">
            Built on the Official <br />
            <span className="text-[#25D366]">WhatsApp Cloud API.</span>
          </h2>

          {/* Body Text */}
          <p className="text-lg text-gray-400 leading-relaxed max-w-lg">
            Never risk getting your business number banned by using shady bulk-senders. ReplySys is a verified tech provider. We route your messages directly through Meta’s official infrastructure so your campaigns land safely, every single time.
          </p>

          {/* The Checkmark Bullet Points */}
          <ul className="space-y-4 pt-2">
            <li className="flex items-center gap-3 text-white font-medium">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366]/20 text-[#25D366]">
                ✓
              </div>
              End-to-end Meta data encryption.
            </li>
            <li className="flex items-center gap-3 text-white font-medium">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366]/20 text-[#25D366]">
                ✓
              </div>
              Official Green Tick verification support.
            </li>
            <li className="flex items-center gap-3 text-white font-medium">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366]/20 text-[#25D366]">
                ✓
              </div>
              Guaranteed template compliance checks.
            </li>
          </ul>
          
        </motion.div>

        {/* RIGHT COLUMN: THE VERIFICATION BADGE VISUAL */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className="relative flex justify-center lg:justify-end"
        >
          
          {/* Background Glow Effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] bg-[#008069] opacity-30 blur-[100px] rounded-full pointer-events-none"></div>

          {/* The Floating Glass Card */}
          <div className="relative w-full max-w-md rounded-3xl border border-gray-700 bg-gray-800/50 backdrop-blur-xl p-8 shadow-2xl flex flex-col items-center justify-center gap-6 text-center transform transition-transform hover:-translate-y-2 duration-500">
            
            {/* The Green Tick Graphic */}
            <div className="h-24 w-24 rounded-full bg-[#25D366] flex items-center justify-center shadow-[0_0_40px_rgba(37,211,102,0.4)]">
              <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Verified Partner</h3>
              <p className="text-sm text-gray-400">
                ReplySys operations are fully compliant with Meta’s Business Messaging Policies.
              </p>
            </div>

            {/* Fake Meta Partner Badge */}
            <div className="mt-4 px-6 py-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
              <div className="text-blue-500 font-bold text-xl">∞</div>
              <div className="text-white text-sm font-semibold tracking-wide">Meta Business Partner</div>
            </div>

          </div>

        </motion.div>
      </div>
    </section>
  );
}
