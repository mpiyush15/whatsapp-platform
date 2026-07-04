"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function SetupAndCTA() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <>
      {/* SECTION 5: THE 3-STEP SETUP */}
      <section className="bg-white py-24 px-6 md:px-[5%] md:py-32" id="how-it-works">
        <div className="mx-auto max-w-7xl">
          
          {/* Section Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto mb-16 space-y-4"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1c1e21]">
              Go live in 5 minutes, not 5 weeks.
            </h2>
            <p className="text-lg text-gray-600">
              No engineers required. Our guided onboarding connects you directly to the Meta Cloud API in three simple clicks.
            </p>
          </motion.div>

          {/* The 3-Step Grid */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-10 relative"
          >
            {/* Connecting Line (Desktop Only) */}
            <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-0.5 bg-gray-100 -z-10"></div>

            {/* Step 1 */}
            <motion.div variants={itemVariants} className="text-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FCF5EC] text-2xl font-bold text-[#008069] mb-6 shadow-sm border border-[#008069]/10">
                1
              </div>
              <h3 className="text-xl font-bold text-[#1c1e21] mb-3">Connect Meta</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Log in with your existing Facebook Business Manager to instantly create your official WhatsApp Business Account.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div variants={itemVariants} className="text-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FCF5EC] text-2xl font-bold text-[#008069] mb-6 shadow-sm border border-[#008069]/10">
                2
              </div>
              <h3 className="text-xl font-bold text-[#1c1e21] mb-3">Verify Number</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Enter your business phone number. Meta sends a quick OTP code to verify ownership and secure your line.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div variants={itemVariants} className="text-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#008069] text-2xl font-bold text-white mb-6 shadow-md shadow-[#008069]/20">
                3
              </div>
              <h3 className="text-xl font-bold text-[#1c1e21] mb-3">Start Messaging</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                You're live! Import your contacts, build your first automated flow, and send your first broadcast from the dashboard.
              </p>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* SECTION 6: THE FINAL CTA & FOOTER */}
      <section className="bg-[#008069] pt-24 pb-10 px-6 md:px-[5%] overflow-hidden">
        <div className="mx-auto max-w-4xl text-center space-y-8">
          
          <motion.h2 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight text-white"
          >
            Ready to upgrade your customer conversations?
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-[#D9FDD3] max-w-2xl mx-auto"
          >
            Join the smart businesses using ReplySys to automate support, broadcast offers, and close deals on WhatsApp.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="pt-4 pb-16"
          >
            <a 
              href="/trial" 
              className="inline-flex justify-center items-center rounded-full bg-white px-10 py-5 text-lg font-extrabold text-[#008069] shadow-2xl transition-all hover:bg-gray-50 hover:-translate-y-1"
            >
              Start Your Free Trial
            </a>
            <p className="mt-4 text-sm text-white/70">
              No credit card required. Setup takes under 5 minutes.
            </p>
          </motion.div>
        </div>
      </section>
    </>
  );
}
