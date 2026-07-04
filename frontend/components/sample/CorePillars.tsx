"use client";

import React from 'react';
import { motion } from 'framer-motion';
import FeatureCard from './FeatureCard';

export default function CorePillars() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <section className="bg-white px-6 py-20 md:px-[5%] md:py-32">
      <div className="mx-auto max-w-[1200px]">
        {/* Section Header */}
        <div className="mb-16 text-center md:mb-24">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="mb-6 text-3xl font-extrabold tracking-tight text-[#1C1E21] md:text-5xl"
          >
            Everything your business needs in one clean workspace.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto max-w-2xl text-lg font-medium leading-relaxed text-[#667781]"
          >
            Stop juggling different tools and personal phones. We built the perfect ecosystem to talk to your customers.
          </motion.p>
        </div>

        {/* 3-Column Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 gap-8 md:grid-cols-3"
        >
          <motion.div variants={itemVariants} className="h-full">
            <FeatureCard 
              icon="📥" 
              title="Shared Team Inbox" 
              description="Stop passing a single mobile phone around the office. Connect multiple agents to one official WhatsApp number, assign conversations, and never lose track of a customer again." 
            />
          </motion.div>

          <motion.div variants={itemVariants} className="h-full">
            <FeatureCard 
              icon="🚀" 
              title="Smart Broadcast Campaigns" 
              description="Email marketing is dying. Send promotional offers and alerts directly to WhatsApp with a 98% open rate. Track exactly who read your message and who replied in real-time." 
            />
          </motion.div>

          <motion.div variants={itemVariants} className="h-full">
            <FeatureCard 
              icon="🤖" 
              title="Instant Auto-Replies" 
              description="Let the system do the heavy lifting. Build simple, no-code menus to answer common customer questions instantly, 24/7, and automatically route complex issues to human agents." 
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
