"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function FeatureVisualBuilder() {
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
          
          <div className="inline-flex items-center gap-2 rounded-full border border-[#008069]/20 bg-[#008069]/10 px-3 py-1 text-xs font-bold text-[#008069] uppercase tracking-wider">
            <span>🧩</span> No-Code Automation
          </div>
          
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1c1e21] sm:text-4xl lg:text-5xl leading-tight">
            Build powerful chat bots in minutes, not months.
          </h2>
          
          <p className="text-lg text-gray-600 leading-relaxed">
            Forget complicated code. Use our visual drag-and-drop canvas to map out exactly how you want to talk to your customers. Automatically answer FAQs, send interactive menus, and route VIP customers straight to your live human agents.
          </p>
        </motion.div>

        {/* RIGHT COLUMN: THE UI MOCKUP */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          viewport={{ once: true }}
          className="relative flex justify-center w-full"
        >
          
          <div className="relative w-full max-w-[500px] h-[450px] bg-[#F8FAFC] rounded-3xl border border-gray-200 overflow-hidden shadow-inner shrink-0">

            <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:20px_20px] opacity-70"></div>

            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 450" style={{ zIndex: 0 }}>
              <path d="M 140 120 C 140 180, 250 160, 250 200" stroke="#94A3B8" strokeWidth="2.5" fill="none" strokeDasharray="6 6" className="animate-pulse" />
              <path d="M 250 260 C 250 320, 130 300, 130 350" stroke="#94A3B8" strokeWidth="2.5" fill="none" />
              <path d="M 250 260 C 250 320, 360 300, 360 350" stroke="#94A3B8" strokeWidth="2.5" fill="none" />
            </svg>

            <div className="absolute inset-0 w-full h-full" style={{ zIndex: 10 }}>

              {/* Node 1: Trigger */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} viewport={{ once: true }}
                className="absolute top-[50px] left-[40px] w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transform transition-transform hover:-translate-y-1"
              >
                <div className="h-1 bg-[#25D366]"></div>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-[#25D366]/20 p-1.5 rounded-md text-[#008069] text-xs">💬</div>
                    <div className="font-bold text-sm text-[#1c1e21]">Customer Messages You</div>
                  </div>
                  <div className="text-[10px] text-gray-500 bg-gray-50 p-1.5 rounded border border-gray-100">
                    If message says <span className="font-bold text-gray-700">"Help"</span> or <span className="font-bold text-gray-700">"Hi"</span>
                  </div>
                </div>
              </motion.div>

              {/* Node 2: Menu Action */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} viewport={{ once: true }}
                className="absolute top-[180px] left-[150px] w-52 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transform transition-transform hover:-translate-y-1"
              >
                <div className="h-1 bg-blue-500"></div>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-50 p-1.5 rounded-md text-blue-600 text-xs">📋</div>
                    <div className="font-bold text-sm text-[#1c1e21]">Send Welcome Menu</div>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <div className="h-5 w-full bg-blue-50 rounded border border-blue-100 text-[9px] flex items-center justify-center text-blue-600 font-semibold cursor-pointer hover:bg-blue-100 transition-colors">Speak to Human</div>
                    <div className="h-5 w-full bg-blue-50 rounded border border-blue-100 text-[9px] flex items-center justify-center text-blue-600 font-semibold cursor-pointer hover:bg-blue-100 transition-colors">View Products</div>
                  </div>
                </div>
              </motion.div>

              {/* Node 3: Human Handoff */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} viewport={{ once: true }}
                className="absolute top-[330px] left-[30px] w-44 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transform transition-transform hover:-translate-y-1"
              >
                <div className="h-1 bg-yellow-500"></div>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="bg-yellow-50 p-1.5 rounded-md text-yellow-600 text-xs">🎧</div>
                    <div className="font-bold text-sm text-[#1c1e21]">Live Agent Handoff</div>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">Status: <span className="font-semibold text-green-600">Connecting...</span></div>
                </div>
              </motion.div>

              {/* Node 4: Simple Catalog (Replaced the API one) */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} viewport={{ once: true }}
                className="absolute top-[330px] left-[260px] w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transform transition-transform hover:-translate-y-1"
              >
                <div className="h-1 bg-purple-500"></div>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="bg-purple-50 p-1.5 rounded-md text-purple-600 text-xs">🛍️</div>
                    <div className="font-bold text-sm text-[#1c1e21]">Send Product List</div>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 bg-gray-50 p-1.5 rounded border border-gray-100">
                    Display: <span className="font-semibold text-gray-700">Top 10 Best Sellers</span>
                  </div>
                </div>
              </motion.div>

              {/* Live Chat Preview was moved outside this container */}

            </div>
          </div>

          {/* Live Chat Preview Bubble (Floating on the edge) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }} viewport={{ once: true }}
            className="absolute top-10 right-0 lg:-right-8 xl:-right-12 w-64 bg-[#efeae2] rounded-xl shadow-2xl border border-white/80 overflow-hidden z-30"
          >
            {/* Header */}
            <div className="bg-[#008069] px-4 py-2.5 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#25D366] animate-pulse"></div>
              <div className="text-white text-[10px] font-bold tracking-wider uppercase">Live Preview</div>
            </div>
            {/* Chat Area */}
            <div className="p-4 space-y-4">
              {/* Incoming Customer Message (Trails in) */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, originX: 0, originY: 1 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2, type: "spring", bounce: 0.4 }} viewport={{ once: true }}
                className="flex justify-start"
              >
                <div className="bg-white text-[#1c1e21] text-[11px] font-medium p-2.5 rounded-xl rounded-tl-sm shadow-sm max-w-[85%] border border-gray-100">
                  Help
                </div>
              </motion.div>
              
              {/* Outgoing Bot Reply (Interactive Menu) (Trails in) */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, originX: 1, originY: 1 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: 1.8, type: "spring", bounce: 0.4 }} viewport={{ once: true }}
                className="flex justify-end"
              >
                <div className="bg-[#d9fdd3] text-[#1c1e21] text-[11px] p-3 rounded-xl rounded-tr-sm shadow-sm max-w-[95%] border border-[#c8ebd2]">
                  <div className="font-bold text-[#008069] mb-1">ReplySys Bot</div>
                  Hi! 👋 How can we help you today?
                  <div className="mt-2.5 space-y-2">
                    <div className="bg-white border border-blue-100 text-[#008069] text-center rounded-lg py-1.5 font-bold shadow-sm text-[10px] hover:bg-gray-50 cursor-pointer transition-colors">Speak to Human</div>
                    <div className="bg-white border border-blue-100 text-[#008069] text-center rounded-lg py-1.5 font-bold shadow-sm text-[10px] hover:bg-gray-50 cursor-pointer transition-colors">View Products</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

        </motion.div>

      </div>
    </section>
  );
}
