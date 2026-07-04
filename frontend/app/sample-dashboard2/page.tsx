import React from 'react';
import Link from 'next/link';
import { Home, Target, MessageSquare, Bot, Rocket, BarChart2, Settings } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-[#f7f2ed] font-sans overflow-hidden">
      
      {/* 1. THE VERTICAL SIDEBAR (Slim, Dark Green) */}
      <aside className="w-[90px] bg-[#111B21] flex flex-col items-center h-full shrink-0 shadow-2xl z-20 transition-all duration-300 py-6">
        
        {/* Logo (Icon only for slim sidebar) */}
        <div className="flex-shrink-0 mb-8 cursor-pointer">
          <div className="bg-[#25D366] text-[#115B4C] p-2 rounded-xl shadow-lg">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 w-full flex flex-col items-center space-y-3 overflow-y-auto scrollbar-hide">
          
          <Link href="/sample-dashboard2" className="flex flex-col items-center justify-center gap-1 bg-white/20 text-white w-[64px] h-[64px] rounded-2xl font-bold shadow-md transition-all">
            <Home className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            <span className="text-[10px] tracking-wide">Home</span>
          </Link>

          <Link href="/sample-dashboard2/leads" className="flex flex-col items-center justify-center gap-1 text-white/70 hover:bg-white/10 hover:text-white w-[64px] h-[64px] rounded-2xl font-medium transition-all group">
            <Target className="w-5 h-5 shrink-0 opacity-70 group-hover:opacity-100" strokeWidth={2.5} />
            <span className="text-[10px] tracking-wide group-hover:font-bold">Leads</span>
          </Link>

          <Link href="/sample-dashboard2/live-chat" className="flex flex-col items-center justify-center gap-1 text-white/70 hover:bg-white/10 hover:text-white w-[64px] h-[64px] rounded-2xl font-medium transition-all group relative">
            <MessageSquare className="w-5 h-5 shrink-0 opacity-70 group-hover:opacity-100" strokeWidth={2.5} />
            <span className="text-[10px] tracking-wide group-hover:font-bold">Chat</span>
            <span className="absolute top-1.5 right-1.5 bg-[#25D366] text-[#115B4C] text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow-sm">3</span>
          </Link>

          <a href="#" className="flex flex-col items-center justify-center gap-1 text-white/70 hover:bg-white/10 hover:text-white w-[64px] h-[64px] rounded-2xl font-medium transition-all group">
            <Bot className="w-5 h-5 shrink-0 opacity-70 group-hover:opacity-100" strokeWidth={2.5} />
            <span className="text-[10px] tracking-wide group-hover:font-bold">Bot</span>
          </a>

          <a href="#" className="flex flex-col items-center justify-center gap-1 text-white/70 hover:bg-white/10 hover:text-white w-[64px] h-[64px] rounded-2xl font-medium transition-all group">
            <Rocket className="w-5 h-5 shrink-0 opacity-70 group-hover:opacity-100" strokeWidth={2.5} />
            <span className="text-[10px] tracking-wide group-hover:font-bold">Campaigns</span>
          </a>

        </nav>

        {/* User Profile */}
        <div className="mt-4 pt-4 border-t border-white/10 w-full flex justify-center">
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#25D366] to-[#008069] flex items-center justify-center font-bold text-white shadow-md cursor-pointer hover:ring-2 hover:ring-white/50 transition-all">
            PR
          </div>
        </div>
      </aside>

      {/* 2. THE MAIN CANVAS */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-20 shrink-0 px-8 flex items-center justify-between bg-white border-b border-gray-200 z-10 shadow-sm">
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
              <span>Overview</span> <span>/</span> <span className="text-[#008069]">Today</span>
            </div>
            <h1 className="text-2xl font-black text-[#1C1E21] tracking-tight">Welcome back, Pixels Team</h1>
          </div>
          <div className="flex gap-4">
            <button className="bg-white border border-gray-200 text-gray-700 text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition-colors">
              Documentation
            </button>
            <button className="bg-[#115B4C] text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md hover:bg-[#0c4136] transition-colors flex items-center gap-2">
              <span>+</span> New Campaign
            </button>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">

            {/* ROW 1: THE APPLE-STYLE ACTION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Card 1: Live Chat */}
              <div className="bg-white p-6 rounded-none shadow-[0_4px_24px_-6px_rgba(0,0,0,0.03)] border border-slate-100 group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-6px_rgba(0,0,0,0.06)] cursor-pointer">
                <div className="flex justify-between items-center mb-5">
                  <div className="h-10 w-10 rounded-2xl bg-[#F2F4F7] text-[#1C1E21] flex items-center justify-center text-lg shadow-inner">
                    📥
                  </div>
                  {/* iOS style notification red */}
                  <span className="bg-[#FF3B30]/10 text-[#FF3B30] text-[11px] font-semibold px-2.5 py-1 rounded-full">3 Unread</span>
                </div>
                <h3 className="text-[17px] font-semibold text-slate-800 tracking-tight mb-1">Live Chat Inbox</h3>
                <p className="text-[13px] text-slate-500 font-medium mb-5 leading-relaxed">Customers are waiting for human support.</p>
                <div className="text-[13px] font-semibold text-[#008069] flex items-center gap-1 group-hover:gap-2 transition-all">
                  Open Inbox <span className="opacity-60">&rarr;</span>
                </div>
              </div>

              {/* Card 2: New Leads */}
              <div className="bg-white p-6 rounded-none shadow-[0_4px_24px_-6px_rgba(0,0,0,0.03)] border border-slate-100 group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-6px_rgba(0,0,0,0.06)] cursor-pointer">
                <div className="flex justify-between items-center mb-5">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-lg shadow-inner">
                    🎯
                  </div>
                  <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold px-2.5 py-1 rounded-full">+12 Today</span>
                </div>
                <h3 className="text-[17px] font-semibold text-slate-800 tracking-tight mb-1">New Leads</h3>
                <p className="text-[13px] text-slate-500 font-medium mb-5 leading-relaxed">Review and qualify incoming prospects.</p>
                <div className="text-[13px] font-semibold text-blue-500 flex items-center gap-1 group-hover:gap-2 transition-all">
                  View Pipeline <span className="opacity-60">&rarr;</span>
                </div>
              </div>

              {/* Card 3: Bot Automations */}
              <div className="bg-white p-6 rounded-none shadow-[0_4px_24px_-6px_rgba(0,0,0,0.03)] border border-slate-100 group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-6px_rgba(0,0,0,0.06)] cursor-pointer">
                <div className="flex justify-between items-center mb-5">
                  <div className="h-10 w-10 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center text-lg shadow-inner">
                    🤖
                  </div>
                  {/* iOS style soft green */}
                  <span className="bg-[#34C759]/10 text-[#34C759] text-[11px] font-semibold px-2.5 py-1 rounded-full">Active</span>
                </div>
                <h3 className="text-[17px] font-semibold text-slate-800 tracking-tight mb-1">Bot Automations</h3>
                <p className="text-[13px] text-slate-500 font-medium mb-5 leading-relaxed">Your flows have handled 45 chats today.</p>
                <div className="text-[13px] font-semibold text-purple-500 flex items-center gap-1 group-hover:gap-2 transition-all">
                  Edit Flows <span className="opacity-60">&rarr;</span>
                </div>
              </div>

            </div>

            {/* MIDDLE ROW: Analytics & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-8">
              
              {/* LEFT WIDGET: Last Campaign Performance (Takes up 2 columns) */}
              <div className="lg:col-span-2 bg-white rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 p-6 sm:p-8 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-[19px] font-semibold text-slate-800 tracking-tight">Last Broadcast: Diwali Sale</h3>
                    <p className="text-[13px] text-slate-400 mt-1 font-medium">Sent on Oct 24 • 2,450 Contacts</p>
                  </div>
                  <span className="bg-[#25D366]/15 text-[#115B4C] text-[12px] font-bold px-3 py-1 rounded-[10px]">
                    Completed
                  </span>
                </div>

                {/* The Mini-Funnel */}
                <div className="flex items-end gap-2 h-32 mt-4">
                  {/* Sent */}
                  <div className="flex-1 flex flex-col justify-end group">
                    <div className="text-[13px] font-semibold text-slate-500 mb-2 group-hover:text-slate-800 transition-colors">2,450</div>
                    <div className="w-full bg-slate-100 rounded-t-[8px] h-full relative group-hover:bg-slate-200 transition-colors"></div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-2 text-center uppercase tracking-wider">Sent</div>
                  </div>
                  {/* Delivered */}
                  <div className="flex-1 flex flex-col justify-end group">
                    <div className="text-[13px] font-semibold text-slate-500 mb-2 group-hover:text-slate-800 transition-colors">2,390</div>
                    <div className="w-full bg-[#008069]/20 rounded-t-[8px] h-[95%] relative group-hover:bg-[#008069]/30 transition-colors"></div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-2 text-center uppercase tracking-wider">Dlvrd</div>
                  </div>
                  {/* Read */}
                  <div className="flex-1 flex flex-col justify-end group">
                    <div className="text-[13px] font-semibold text-slate-500 mb-2 group-hover:text-slate-800 transition-colors">1,840</div>
                    <div className="w-full bg-[#008069]/50 rounded-t-[8px] h-[75%] relative group-hover:bg-[#008069]/60 transition-colors"></div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-2 text-center uppercase tracking-wider">Read</div>
                  </div>
                  {/* Replied */}
                  <div className="flex-1 flex flex-col justify-end group">
                    <div className="text-[13px] font-semibold text-[#008069] mb-2">342</div>
                    <div className="w-full bg-[#008069] rounded-t-[8px] h-[30%] relative shadow-[0_4px_12px_rgba(0,128,105,0.3)]"></div>
                    <div className="text-[11px] font-semibold text-slate-800 mt-2 text-center uppercase tracking-wider">Reply</div>
                  </div>
                </div>
              </div>

              {/* RIGHT WIDGET: Live Activity Feed */}
              <div className="bg-white rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 p-6 sm:p-8 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[19px] font-semibold text-slate-800 tracking-tight">Recent Activity</h3>
                  <button className="text-[13px] font-semibold text-[#008069] hover:text-[#115B4C]">View All</button>
                </div>
                
                <div className="space-y-5">
                  
                  {/* Activity Item 1 */}
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-[#25D366]/15 text-[#115B4C] flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
                    </div>
                    <div>
                      <p className="text-[13px] text-slate-800 font-medium">Template <span className="font-semibold">"Winter Promo"</span> was approved.</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">10 mins ago</p>
                    </div>
                  </div>

                  {/* Activity Item 2 */}
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      👤
                    </div>
                    <div>
                      <p className="text-[13px] text-slate-800 font-medium">New lead <span className="font-semibold">Rahul Verma</span> assigned to you.</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">45 mins ago</p>
                    </div>
                  </div>

                  {/* Activity Item 3 */}
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                      🤖
                    </div>
                    <div>
                      <p className="text-[13px] text-slate-800 font-medium">Bot flow <span className="font-semibold">Support Menu</span> triggered 12 times.</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">2 hours ago</p>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* SYSTEM HEALTH (Apple iOS Widget Style) */}
            <div className="pt-8">
              <h2 className="text-[15px] font-semibold text-slate-500 uppercase tracking-wider mb-4 px-1">
                System & Infrastructure
              </h2>
              
              <div className="bg-white rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 p-6 sm:p-8 flex flex-col lg:flex-row gap-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                
                {/* LEFT COLUMN: The Sending Quota */}
                <div className="flex-1 lg:pr-8 lg:border-r border-slate-100">
                  
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-[19px] font-semibold text-slate-800 tracking-tight">Messaging Quota</h3>
                      <p className="text-[13px] text-slate-400 mt-1 font-medium">Meta Cloud API • Tier 1</p>
                    </div>
                    <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-[13px] font-semibold mb-2.5">
                      <span className="text-slate-800">340 Sent</span>
                      <span className="text-slate-400">1,000 Limit</span>
                    </div>
                    
                    {/* Apple-style ultra-slim progress bar */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-[#34C759] rounded-full shadow-[inset_0_-1px_1px_rgba(0,0,0,0.1)] transition-all duration-1000 ease-out" style={{ width: '34%' }}></div>
                    </div>
                    
                    <p className="text-[12px] text-slate-400 font-medium flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Quota resets automatically in <span className="text-slate-600 font-semibold">14h 22m</span>
                    </p>
                  </div>

                </div>

                {/* RIGHT COLUMN: The Phone Connection */}
                <div className="flex-1">
                  
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-[19px] font-semibold text-slate-800 tracking-tight">Active Number</h3>
                      <p className="text-[13px] text-slate-400 mt-1 font-medium">Official WhatsApp Connection</p>
                    </div>
                    <div className="h-10 w-10 rounded-2xl bg-[#34C759]/10 text-[#34C759] flex items-center justify-center text-lg">
                      📞
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Number Box */}
                    <div className="flex items-center justify-between p-3.5 rounded-[16px] bg-slate-50 border border-slate-100/50">
                      <span className="text-[15px] font-semibold text-slate-800 tracking-wide">+91 97665 04856</span>
                      <span className="bg-[#007AFF]/10 text-[#007AFF] text-[12px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        Verified
                      </span>
                    </div>
                    
                    {/* Health Badges */}
                    <div className="flex gap-3">
                      <div className="flex-1 flex items-center justify-center gap-2 p-3 rounded-[16px] bg-[#34C759]/5 border border-[#34C759]/10">
                        <div className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse"></div>
                        <span className="text-[13px] font-semibold text-[#34C759]">High Quality</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center gap-2 p-3 rounded-[16px] bg-slate-50 border border-slate-100">
                        <span className="text-[13px] font-semibold text-slate-500">Connected</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
