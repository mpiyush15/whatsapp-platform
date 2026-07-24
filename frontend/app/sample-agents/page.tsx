"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MessageSquare, ArrowRightLeft, BrainCircuit, Sparkles } from 'lucide-react';

export default function UpgradeAnnouncementPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center relative overflow-hidden font-sans">
      
      {/* Background Corporate & Warm Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-amber-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-6 py-20 relative z-10 w-full">
        
        {/* Top Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm">
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-sm font-semibold tracking-wide text-slate-700 uppercase">
              The Evolution of ReplySys
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6">
            Beyond WhatsApp. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-500">
              Welcome to the Agentic Era.
            </span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            We are upgrading from a standard WhatsApp API provider to a complete <strong className="font-semibold text-slate-900">AI Agents Platform</strong>. 
            Prepare for autonomous workflows, proactive reasoning, and systems that work <i>with</i> you, not just for you.
          </p>
        </motion.div>

        {/* UI Chat Transition Mock */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          className="my-16 max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8"
        >
          {/* Left: Legacy WhatsApp Bot */}
          <div className="w-full md:w-[320px] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 p-4 border-b border-slate-200 text-center">
              <h3 className="font-semibold text-slate-600 text-sm">The Old Way: Chatbots</h3>
            </div>
            <div className="p-4 bg-slate-50 space-y-4 h-[240px] flex flex-col justify-end">
              <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-sm self-end text-sm max-w-[85%] shadow-sm">
                Can I book a haircut for tomorrow at 2 PM?
              </div>
              <div className="bg-white border border-slate-200 text-slate-600 p-3 rounded-2xl rounded-tl-sm self-start text-sm max-w-[85%] shadow-sm">
                Sorry, I didn't understand that. <br/><br/>
                Reply 1 for Sales.<br/>
                Reply 2 for Support.
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="rotate-90 md:rotate-0 flex items-center justify-center px-4">
            <motion.div
              animate={{ x: [0, 15, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowRight className="w-8 h-8 md:w-10 md:h-10 text-blue-500" />
            </motion.div>
          </div>

          {/* Right: Agentic AI */}
          <div className="w-full md:w-[350px] bg-gradient-to-b from-slate-900 to-slate-800 rounded-3xl shadow-2xl border border-slate-700 overflow-hidden transform md:scale-110 relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <BrainCircuit className="w-24 h-24 text-blue-300" />
            </div>
            <div className="bg-slate-800/50 p-4 border-b border-slate-700 text-center relative z-10 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-white text-sm">The New Way: AI Agents</h3>
            </div>
            <div className="p-4 space-y-4 h-[260px] flex flex-col justify-end relative z-10">
              <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-sm self-end text-[13px] max-w-[85%] shadow-md">
                Can I book a haircut for tomorrow at 2 PM?
              </div>
              
              {/* Agent Thinking State */}
              <div className="self-start flex items-center gap-2 text-[11px] text-slate-400 font-medium mb-1 px-1">
                <BrainCircuit className="w-3 h-3 text-blue-400 animate-pulse" />
                Checking Calendar & CRM...
              </div>

              <div className="bg-slate-700 border border-slate-600 text-slate-100 p-3 rounded-2xl rounded-tl-sm self-start text-[13px] max-w-[90%] shadow-lg">
                I found an opening at 2:00 PM and booked it on your Google Calendar! 📅 <br/><br/>
                Should I send the deposit link?
              </div>
            </div>
          </div>

        </motion.div>

        {/* Call to Action */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button className="px-8 py-4 rounded-full bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:scale-105 transition-all duration-300 flex items-center gap-2">
            Join the Agentic Waitlist <ArrowRight className="w-4 h-4" />
          </button>
          <button className="px-8 py-4 rounded-full bg-white text-slate-700 border border-slate-200 font-semibold shadow-sm hover:bg-slate-50 transition-all duration-300">
            Read the Vision
          </button>
        </motion.div>

      </main>

      {/* Footer / Copyright */}
      <div className="absolute bottom-6 text-center w-full text-slate-400 text-sm font-medium">
        © 2026 ReplySys. The Future of Work.
      </div>

    </div>
  );
}
