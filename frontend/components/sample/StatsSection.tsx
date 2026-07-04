"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function StatsSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <section className="bg-[#FCF5EC] py-24 px-6 md:px-[5%] md:py-32">
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* LEFT COLUMN: THE "WHY WHATSAPP" HEADER */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-6"
        >
          <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-[#115B4C]">
            Why choose <br /> WhatsApp?
          </h2>
          <p className="text-lg text-gray-700 max-w-md leading-relaxed">
            Email marketing is dying in the spam folder. SMS is expensive and lacks trust. WhatsApp is the one channel where your customers actually live, read, and reply.
          </p>
        </motion.div>

        {/* RIGHT COLUMN: THE IMPACT METRICS (2x2 Grid) */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-12"
        >
          
          {/* Stat 1 */}
          <motion.div variants={itemVariants} className="border-t-2 border-[#25D366]/30 pt-6">
            <div className="text-5xl font-black text-[#115B4C] mb-2 flex items-center gap-2">
              98<span className="text-[#25D366]">%</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Average Open Rate</h3>
            <p className="text-sm text-gray-600 mt-2">Compared to just 20% for traditional email campaigns.</p>
          </motion.div>

          {/* Stat 2 */}
          <motion.div variants={itemVariants} className="border-t-2 border-[#25D366]/30 pt-6">
            <div className="text-5xl font-black text-[#115B4C] mb-2 flex items-center gap-2">
              45<span className="text-[#25D366]">%+</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Click-Through Rate</h3>
            <p className="text-sm text-gray-600 mt-2">Customers actually click your links and buy your offers.</p>
          </motion.div>

          {/* Stat 3 */}
          <motion.div variants={itemVariants} className="border-t-2 border-[#25D366]/30 pt-6">
            <div className="text-5xl font-black text-[#115B4C] mb-2 flex items-center gap-2">
              2.5<span className="text-[#25D366]">B</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Active Users</h3>
            <p className="text-sm text-gray-600 mt-2">Meet your buyers exactly where they already are.</p>
          </motion.div>

          {/* Stat 4 */}
          <motion.div variants={itemVariants} className="border-t-2 border-[#25D366]/30 pt-6">
            <div className="text-5xl font-black text-[#115B4C] mb-2 flex items-center gap-2">
              7<span className="text-[#25D366]">x</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Faster Conversions</h3>
            <p className="text-sm text-gray-600 mt-2">Turn cold leads into closed deals in minutes, not days.</p>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}
