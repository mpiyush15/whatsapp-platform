'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Home, Target, Users, Inbox, Bot, Rocket, BarChart2, Settings } from 'lucide-react';

export default function LeadsPage() {
  const [activeFilter, setActiveFilter] = useState('All');

  // Dummy data based on your actual localhost screenshot!
  const leads = [
    {
      id: 1,
      name: 'Shubhangi Ingle',
      contact: 'ishubhangi314@gmail.com',
      source: 'Manual / Demo Booking',
      lastMessage: 'Name: Shubhangi ingle Email: ishubhangi314@gmail.com Demo Date: Saturday 20th...',
      status: 'New',
      date: '18/06/2026',
      avatar: 'SI',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 2,
      name: 'Yesankar Hospital',
      contact: '+91 98702 07971',
      source: 'Campaign: Clinic Mumbai',
      lastMessage: 'Patient inquiry regarding appointment timings.',
      status: 'Contacted',
      date: '15/06/2026',
      avatar: 'YH',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 3,
      name: 'Smile Therapy',
      contact: '+91 99203 39897',
      source: 'Campaign: Physiotherapy',
      lastMessage: 'No saved replies yet. Waiting for human routing.',
      status: 'New',
      date: '15/06/2026',
      avatar: 'ST',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      id: 4,
      name: '+91 97026 11621',
      contact: 'WhatsApp Direct',
      source: 'Main Menu & Pricing',
      lastMessage: 'Service: Pricing Plans',
      status: 'Converted',
      date: '20/06/2026',
      avatar: '#',
      color: 'bg-gray-200 text-gray-600'
    }
  ];

  return (
    <div className="flex h-screen bg-[#F0F2F5] font-sans overflow-hidden">
      
      {/* SIDEBAR: DARK THEME */}
      {/* WHATSAPP WEB STYLE SLIM SIDEBAR */}
      <aside className="w-64 bg-[#115B4C] flex flex-col h-screen shrink-0 z-20 shadow-xl">
        
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0 w-full">
          <div className="flex items-center gap-2 font-black text-xl tracking-tight text-white cursor-pointer">
            <div className="bg-white text-[#115B4C] p-1 rounded-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
            </div>
            ReplySys
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto w-full py-6 px-4 space-y-2 scrollbar-hide flex flex-col">
          
          <Link href="/sample-dashboard" className="flex items-center gap-3 text-white/70 hover:bg-white/10 hover:text-white px-4 py-3 rounded-xl font-medium transition-all">
            <Home className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            <span className="text-sm">Home</span>
          </Link>

          <Link href="/sample-dashboard/leads" className="flex items-center gap-3 bg-white/20 text-white px-4 py-3 rounded-xl font-bold transition-all">
            <Target className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            <span className="text-sm">Leads</span>
          </Link>

          <a href="#" className="flex items-center gap-3 text-white/70 hover:bg-white/10 hover:text-white px-4 py-3 rounded-xl font-medium transition-all">
            <Users className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            <span className="text-sm">Contacts</span>
          </a>

          <Link href="/sample-dashboard/live-chat" className="flex items-center justify-between text-white/70 hover:bg-white/10 hover:text-white px-4 py-3 rounded-xl font-medium transition-all">
            <div className="flex items-center gap-3">
              <Inbox className="w-5 h-5 shrink-0" strokeWidth={2.5} />
              <span className="text-sm">Inbox</span>
            </div>
            <span className="bg-[#25D366] text-[#115B4C] text-[10px] font-bold px-1.5 py-0.5 rounded-md">3</span>
          </Link>

          <a href="#" className="flex items-center gap-3 text-white/70 hover:bg-white/10 hover:text-white px-4 py-3 rounded-xl font-medium transition-all">
            <Bot className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            <span className="text-sm">Chatbot</span>
          </a>
          
          <a href="#" className="flex items-center gap-3 text-white/70 hover:bg-white/10 hover:text-white px-4 py-3 rounded-xl font-medium transition-all">
            <Rocket className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            <span className="text-sm">Campaigns</span>
          </a>
          
          <a href="#" className="flex items-center gap-3 text-white/70 hover:bg-white/10 hover:text-white px-4 py-3 rounded-xl font-medium transition-all">
            <BarChart2 className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            <span className="text-sm">Analytics</span>
          </a>

        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-white/10 shrink-0 w-full">
          <div className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors">
            <div className="h-8 w-8 rounded-full bg-[#25D366] text-[#115B4C] flex items-center justify-center font-bold text-sm">P</div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-bold text-white truncate">Pixels Retail</div>
              <div className="text-[10px] text-[#25D366]">Starter Plan</div>
            </div>
            <Settings className="w-5 h-5 text-white/50" strokeWidth={2.5} />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-y-auto relative p-8">
        <div className="max-w-7xl mx-auto w-full space-y-8">
          {/* HEADER SECTION */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#1c1e21]">Lead Management</h1>
              <p className="text-sm text-gray-500 mt-1">Track, qualify, and convert your incoming WhatsApp traffic.</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-white border border-gray-200 text-[#1c1e21] text-sm font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-colors">
                Export CSV
              </button>
              <button className="px-4 py-2 bg-[#008069] text-white text-sm font-bold rounded-xl shadow-md hover:bg-[#006653] transition-colors flex items-center gap-2">
                <span>+</span> Add Lead
              </button>
            </div>
          </div>

          {/* TOP METRICS CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Leads</div>
              <div className="text-3xl font-black text-[#1c1e21]">177</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm border-l-4 border-l-blue-500">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">New</div>
              <div className="text-3xl font-black text-blue-600">22</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm border-l-4 border-l-yellow-500">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Qualified</div>
              <div className="text-3xl font-black text-yellow-600">0</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm border-l-4 border-l-[#25D366]">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Converted</div>
              <div className="text-3xl font-black text-[#008069]">1</div>
            </div>
            <div className="bg-[#1C1E21] p-5 rounded-2xl border border-gray-800 shadow-md text-white">
              <div className="text-xs font-bold text-[#D9FDD3] uppercase tracking-wider mb-1">Avg Score</div>
              <div className="text-3xl font-black">53<span className="text-lg font-medium text-white/60">/100</span></div>
            </div>
          </div>

          {/* CRM LIST CONTAINER */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col">
            
            {/* Filter Bar */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between gap-4">
              
              {/* Pill Tabs */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
                {['All', 'New', 'Contacted', 'Qualified', 'Converted'].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setActiveFilter(tab)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                      activeFilter === tab 
                        ? 'bg-[#1c1e21] text-white shadow-md' 
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input 
                  type="text" 
                  placeholder="Search leads, phone..." 
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#008069] focus:ring-1 focus:ring-[#008069] transition-all"
                />
              </div>
            </div>

            {/* Leads List */}
            <div className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <div key={lead.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center gap-4 group cursor-pointer">
                  
                  {/* Avatar & Name */}
                  <div className="flex items-center gap-4 w-full sm:w-1/4 shrink-0">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${lead.color}`}>
                      {lead.avatar}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-bold text-[#1c1e21] text-sm truncate">{lead.name}</div>
                      <div className="text-xs text-gray-500 truncate">{lead.contact}</div>
                    </div>
                  </div>

                  {/* Source & Message Preview */}
                  <div className="w-full sm:flex-1 hidden md:block">
                    <div className="inline-block bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded mb-1 uppercase tracking-wide">
                      {lead.source}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-md">
                      {lead.lastMessage}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="w-full sm:w-28 shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                      ${lead.status === 'New' ? 'bg-blue-100 text-blue-700' : 
                        lead.status === 'Contacted' ? 'bg-yellow-100 text-yellow-700' : 
                        lead.status === 'Converted' ? 'bg-[#D9FDD3] text-[#008069]' : 
                        'bg-gray-100 text-gray-700'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 
                        ${lead.status === 'New' ? 'bg-blue-500' : 
                          lead.status === 'Contacted' ? 'bg-yellow-500' : 
                          lead.status === 'Converted' ? 'bg-[#008069]' : 'bg-gray-400'}`}>
                      </span>
                      {lead.status}
                    </span>
                  </div>

                  {/* Date & Actions */}
                  <div className="w-full sm:w-32 flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-xs text-gray-400 font-medium">{lead.date}</div>
                    
                    {/* Quick Action Button (Shows on hover) */}
                    <button className="opacity-100 sm:opacity-0 group-hover:opacity-100 bg-[#008069] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm hover:bg-[#006653] transition-all transform hover:scale-105">
                      Message
                    </button>
                  </div>

                </div>
              ))}
            </div>

            {/* Footer Pagination */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-xs font-medium text-gray-500">
              <span>Showing 1 to 4 of 177 leads</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors">Prev</button>
                <button className="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors">Next</button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
