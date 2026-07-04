"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function FeatureInbox() {
  return (
    <section className="bg-gray-50 py-20 px-6 font-sans overflow-hidden border-y border-gray-100 min-h-[calc(100vh-72px)] flex items-center">
      <div className="mx-auto w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center flex-col-reverse lg:flex-row">

        {/* LEFT COLUMN: THE UI MOCKUP (Team Inbox) */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          viewport={{ once: true }}
          className="relative flex justify-center w-full order-2 lg:order-1"
        >
          
          <div className="relative w-full max-w-[500px] h-[450px] bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl flex">
            
            {/* Sidebar (Chat List) */}
            <div className="w-1/3 border-r border-gray-100 bg-gray-50/50 flex flex-col">
              <div className="p-4 border-b border-gray-100 font-bold text-[#1c1e21] text-sm flex justify-between items-center">
                Active Chats <span className="bg-[#008069] text-white text-[10px] px-2 py-0.5 rounded-full">3</span>
              </div>
              
              {/* Chat Item 1 (Active) */}
              <div className="p-3 border-b border-gray-100 bg-white border-l-4 border-l-[#008069] cursor-pointer">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs text-[#1c1e21]">Sarah J.</span>
                  <span className="text-[9px] text-gray-400">Now</span>
                </div>
                <div className="text-[10px] text-gray-500 truncate">I need help with my order...</div>
                <div className="mt-2 inline-block bg-yellow-100 text-yellow-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">VIP Customer</div>
              </div>

              {/* Chat Item 2 */}
              <div className="p-3 border-b border-gray-100 cursor-pointer opacity-60">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs text-[#1c1e21]">Mike T.</span>
                  <span className="text-[9px] text-gray-400">10m</span>
                </div>
                <div className="text-[10px] text-gray-500 truncate">Does this come in blue?</div>
              </div>
            </div>

            {/* Main Chat Window */}
            <div className="w-2/3 flex flex-col bg-[#EFEAE2]">
              {/* Chat Header */}
              <div className="bg-white p-3 border-b border-gray-100 flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xs font-bold">SJ</div>
                  <div>
                    <div className="font-bold text-xs text-[#1c1e21]">Sarah J.</div>
                    <div className="text-[9px] text-gray-500">Viewing: Order #4092</div>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-[#008069] bg-[#008069]/10 px-2 py-1 rounded">Assign to me</div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto relative">
                
                {/* Background WhatsApp Doodle Pattern (Optional) */}
                <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:10px_10px] pointer-events-none"></div>

                {/* Customer Message */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} viewport={{ once: true }}
                  className="flex justify-start relative z-10"
                >
                  <div className="bg-white text-[#1c1e21] text-[11px] px-3 py-2 rounded-tr-xl rounded-br-xl rounded-bl-xl shadow-sm max-w-[85%]">
                    My tracking link isn't updating. Can a real person check this for me?
                  </div>
                </motion.div>

                {/* Internal Note (Yellow) */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} viewport={{ once: true }}
                  className="flex justify-center relative z-10 my-4"
                >
                  <div className="bg-[#FFF9C4] text-yellow-800 text-[9px] font-bold px-3 py-1.5 rounded-lg shadow-sm border border-yellow-200 flex items-center gap-1.5">
                    <span>🔒</span> Bot routed chat to Support Team
                  </div>
                </motion.div>

                {/* Agent Reply */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} viewport={{ once: true }}
                  className="flex justify-end relative z-10"
                >
                  <div className="bg-[#D9FDD3] text-[#1c1e21] text-[11px] px-3 py-2 rounded-tl-xl rounded-bl-xl rounded-br-xl shadow-sm max-w-[85%]">
                    Hi Sarah! Let me pull up your order right now. Give me one second. 
                    <div className="text-right text-[8px] text-gray-500 mt-1">Sent by Alex</div>
                  </div>
                </motion.div>

              </div>
              
              {/* Fake Input Area */}
              <div className="bg-white p-3 border-t border-gray-100 flex items-center gap-2 z-10">
                <div className="h-6 w-full bg-gray-100 rounded-full border border-gray-200 flex items-center px-3 text-[10px] text-gray-400">
                  Type a message or use / for templates...
                </div>
              </div>
            </div>

          </div>
        </motion.div>

        {/* RIGHT COLUMN: THE NARRATIVE */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true }}
          className="space-y-6 lg:pl-8 order-1 lg:order-2"
        >
          
          {/* Tag */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#008069]/20 bg-[#008069]/10 px-3 py-1 text-xs font-bold text-[#008069] uppercase tracking-wider">
            <span>📥</span> Shared Team Inbox
          </div>
          
          {/* Headline */}
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1c1e21] sm:text-4xl lg:text-5xl leading-tight">
            Stop losing track of customer conversations.
          </h2>
          
          {/* Body Text */}
          <p className="text-lg text-gray-600 leading-relaxed">
            Bring your entire support and sales team into one shared workspace. Seamlessly take over chats from the automated bot, assign conversations to specific agents, and leave private internal notes—all from a single, official WhatsApp number.
          </p>
        </motion.div>

      </div>
    </section>
  );
}
