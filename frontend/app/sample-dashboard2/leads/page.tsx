'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Home, Target, MessageSquare, Bot, Rocket, BarChart2, Settings } from 'lucide-react';

export default function LeadsPage() {
  const [activeFilter, setActiveFilter] = useState('All');

  // Sample data
  const leads = [
    { id: 1, name: 'Shubhangi Ingle', contact: 'ishubhangi314@gmail.com', source: 'Manual Booking', status: 'New', time: '2m ago', avatar: 'SI', color: 'bg-[#FF3B30]/10 text-[#FF3B30]' },
    { id: 2, name: 'Yesankar Hospital', contact: '+91 98702 07971', source: 'Campaign: Mumbai', status: 'Contacted', time: '1h ago', avatar: 'YH', color: 'bg-[#007AFF]/10 text-[#007AFF]' },
    { id: 3, name: 'Smile Therapy', contact: '+91 99203 39897', source: 'Campaign: Physio', status: 'New', time: '3h ago', avatar: 'ST', color: 'bg-[#FF3B30]/10 text-[#FF3B30]' },
    { id: 4, name: 'Unknown Contact', contact: '+91 97026 11621', source: 'Main Menu', status: 'Converted', time: '1d ago', avatar: '#', color: 'bg-[#34C759]/10 text-[#34C759]' }
  ];

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
          
          <Link href="/sample-dashboard2" className="flex flex-col items-center justify-center gap-1 text-white/70 hover:bg-white/10 hover:text-white w-[64px] h-[64px] rounded-2xl font-medium transition-all group">
            <Home className="w-5 h-5 shrink-0 opacity-70 group-hover:opacity-100" strokeWidth={2.5} />
            <span className="text-[10px] tracking-wide group-hover:font-bold">Home</span>
          </Link>

          <Link href="/sample-dashboard2/leads" className="flex flex-col items-center justify-center gap-1 bg-white/20 text-white w-[64px] h-[64px] rounded-2xl font-bold shadow-md transition-all">
            <Target className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            <span className="text-[10px] tracking-wide">Leads</span>
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

      {/* 2. THE MAIN CANVAS (Leads content) */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">

            {/* HEADER: Floating Glass Style */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Workspace / CRM</div>
                <h1 className="text-[28px] font-semibold text-slate-800 tracking-tight">Lead Pipeline</h1>
              </div>
              <div className="flex gap-3">
                <button className="px-5 py-2.5 bg-[#D9FDD3] border border-[#25D366]/30 text-[#115B4C] text-[14px] font-bold rounded-[14px] shadow-sm hover:bg-[#c9f6c2] transition-all">
                  Import CSV
                </button>
                <button className="px-5 py-2.5 bg-[#115B4C] text-white text-[14px] font-semibold rounded-[14px] shadow-[0_8px_16px_rgba(0,0,0,0.12)] hover:bg-[#0c4136] transition-all flex items-center gap-2">
                  <span>+</span> Add Lead
                </button>
              </div>
            </div>

            {/* METRICS ROW */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-5 rounded-none border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="text-[12px] font-semibold text-slate-500 mb-1">Total Leads</div>
                <div className="text-[28px] font-semibold text-slate-800 tracking-tight">177</div>
              </div>
              <div className="bg-white p-5 rounded-none border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="text-[12px] font-semibold text-slate-500 mb-1">New Today</div>
                <div className="text-[28px] font-semibold text-[#FF3B30] tracking-tight">22</div>
              </div>
              <div className="bg-white p-5 rounded-none border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="text-[12px] font-semibold text-slate-500 mb-1">Qualified</div>
                <div className="text-[28px] font-semibold text-[#007AFF] tracking-tight">14</div>
              </div>
              <div className="bg-white p-5 rounded-none border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="text-[12px] font-semibold text-slate-500 mb-1">Converted</div>
                <div className="text-[28px] font-semibold text-[#34C759] tracking-tight">4</div>
              </div>
            </div>

            {/* MAIN CONTAINER */}
            <div className="bg-white rounded-none border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.05)] overflow-hidden flex flex-col">
              
              {/* Top Bar: Segmented Control & Search */}
              <div className="p-5 border-b border-white/40 flex flex-col sm:flex-row justify-between items-center gap-4">
                
                {/* Apple-style Segmented Control */}
                <div className="flex bg-slate-200/50 backdrop-blur-md p-1 rounded-[14px]">
                  {['All', 'New', 'Contacted', 'Converted'].map((tab) => (
                    <button 
                      key={tab}
                      onClick={() => setActiveFilter(tab)}
                      className={`px-4 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all duration-200 ${
                        activeFilter === tab 
                          ? 'bg-white text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)]' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Glass Search Bar */}
                <div className="relative w-full sm:w-72">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[14px]">🔍</span>
                  <input 
                    type="text" 
                    placeholder="Search name or phone..." 
                    className="w-full pl-9 pr-4 py-2 bg-white/50 backdrop-blur-md border border-white/60 rounded-[12px] text-[14px] font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white/80 focus:ring-2 focus:ring-[#34C759]/30 transition-all"
                  />
                </div>
              </div>

              {/* The List (No harsh lines, soft hover states) */}
              <div className="flex flex-col px-3 py-2">
                {/* Column Headers */}
                <div className="flex px-4 py-3 text-[12px] font-semibold text-slate-400 uppercase tracking-wider">
                  <div className="w-[40%]">Contact</div>
                  <div className="w-[25%]">Source</div>
                  <div className="w-[20%]">Status</div>
                  <div className="w-[15%] text-right">Activity</div>
                </div>

                {/* Lead Rows */}
                {leads.map((lead) => (
                  <div 
                    key={lead.id} 
                    className="flex items-center px-4 py-3.5 mb-1 rounded-[16px] hover:bg-[#F0F2F5] hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-all duration-200 cursor-pointer group"
                  >
                    {/* Contact Info */}
                    <div className="w-[40%] flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-[14px] shrink-0 shadow-inner ${lead.color}`}>
                        {lead.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-[15px]">{lead.name}</div>
                        <div className="text-[13px] text-slate-500 font-medium">{lead.contact}</div>
                      </div>
                    </div>

                    {/* Source */}
                    <div className="w-[25%]">
                      <span className="text-[13px] font-semibold text-slate-600 bg-slate-100/50 px-2.5 py-1 rounded-[8px] border border-slate-200/50">
                        {lead.source}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <div className="w-[20%]">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-[8px] text-[12px] font-semibold
                        ${lead.status === 'New' ? 'bg-[#FF3B30]/10 text-[#FF3B30]' : 
                          lead.status === 'Contacted' ? 'bg-[#007AFF]/10 text-[#007AFF]' : 
                          'bg-[#34C759]/10 text-[#34C759]'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 
                          ${lead.status === 'New' ? 'bg-[#FF3B30]' : 
                            lead.status === 'Contacted' ? 'bg-[#007AFF]' : 
                            'bg-[#34C759]'}`}>
                        </span>
                        {lead.status}
                      </span>
                    </div>

                    {/* Activity & Action */}
                    <div className="w-[15%] flex justify-end items-center gap-4">
                      <span className="text-[13px] font-medium text-slate-400 group-hover:hidden transition-all">{lead.time}</span>
                      {/* Action button appears on hover */}
                      <button className="hidden group-hover:flex items-center justify-center bg-slate-800 text-white text-[12px] font-semibold px-4 py-1.5 rounded-[10px] shadow-md hover:bg-black transition-all">
                        Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
