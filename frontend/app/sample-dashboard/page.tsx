'use client';
import React from 'react';
import Link from 'next/link';
import { Home, Target, Users, Inbox, Bot, Rocket, BarChart2, Settings } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-[#F0F2F5] font-sans overflow-hidden">
      
      {/* SIDEBAR: DEEP WHATSAPP GREEN */}
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
          
          <Link href="/sample-dashboard" className="flex items-center gap-3 bg-white/20 text-white px-4 py-3 rounded-xl font-bold transition-all">
            <Home className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            <span className="text-sm">Home</span>
          </Link>

          <Link href="/sample-dashboard/leads" className="flex items-center gap-3 text-white/70 hover:bg-white/10 hover:text-white px-4 py-3 rounded-xl font-medium transition-all">
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
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-[url('https://static.whatsapp.net/rsrc.php/v3/yl/r/r-3V5AHT-6A.png')] opacity-20 pointer-events-none mix-blend-multiply"></div>

        {/* Header */}
        <header className="h-20 shrink-0 px-8 flex items-center justify-between relative z-10 bg-white/50 backdrop-blur-md border-b border-gray-200/50">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#008069] bg-[#008069]/10 px-2.5 py-1 rounded-md w-fit mb-1 uppercase tracking-wide">
              Retail Category
            </div>
            <h1 className="text-2xl font-extrabold text-[#1c1e21]">Welcome back, Pixels Team</h1>
          </div>
          <button className="bg-white border border-gray-200 text-[#1c1e21] text-sm font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2">
            <span>📚</span> Help Center
          </button>
        </header>

        {/* Scrollable Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8 relative z-10">
          <div className="max-w-6xl mx-auto space-y-8">

            <p className="text-gray-600 text-lg font-medium">Here is what's happening with your customers today.</p>

            {/* ROW 1: THE QUICK ACTIONS (Moved to the very top!) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Action 1: Inbox */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 transform transition-transform hover:-translate-y-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">📥</div>
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full animate-pulse">3 Unread</span>
                </div>
                <h3 className="text-lg font-bold text-[#1c1e21] mb-1">Live Chat Inbox</h3>
                <p className="text-sm text-gray-500 mb-6">Customers are waiting for a reply.</p>
                <button className="w-full bg-[#1c1e21] text-white font-bold py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-md">Open Inbox &rarr;</button>
              </div>

              {/* Action 2: Broadcasts */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 transform transition-transform hover:-translate-y-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="h-12 w-12 rounded-xl bg-green-50 text-[#008069] flex items-center justify-center text-2xl">🚀</div>
                </div>
                <h3 className="text-lg font-bold text-[#1c1e21] mb-1">Send a Broadcast</h3>
                <p className="text-sm text-gray-500 mb-6">Blast an offer to your contact list.</p>
                <button className="w-full bg-[#008069] text-white font-bold py-2.5 rounded-xl hover:bg-[#006653] transition-colors shadow-md shadow-[#008069]/20">New Campaign &rarr;</button>
              </div>

              {/* Action 3: Automation */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 transform transition-transform hover:-translate-y-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl">🤖</div>
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">45 Handled</span>
                </div>
                <h3 className="text-lg font-bold text-[#1c1e21] mb-1">Bot Performance</h3>
                <p className="text-sm text-gray-500 mb-6">Review your automated chat flows.</p>
                <button className="w-full border-2 border-gray-100 text-gray-700 font-bold py-2 rounded-xl hover:border-gray-200 hover:bg-gray-50 transition-colors">Edit Flows</button>
              </div>

            </div>

            {/* ROW 2: SYSTEM HEALTH & LIMITS (Simplified & Friendly) */}
            <h2 className="text-xl font-bold text-[#1c1e21] pt-4">System Health</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Limit Card (Takes up 2 columns) */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-[#1c1e21]">WhatsApp Messaging Limit</h3>
                    <p className="text-sm text-gray-500">Your official Meta sending capacity (resets in 24 hours).</p>
                  </div>
                  <button className="text-xs font-bold text-[#008069] bg-[#D9FDD3] px-3 py-1.5 rounded-lg hover:bg-[#25D366]/30 transition-colors flex items-center gap-1">
                    ↻ Refresh Stats
                  </button>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 flex items-center justify-between">
                  <div className="w-24 h-24 rounded-full border-[6px] border-[#25D366] flex flex-col items-center justify-center shrink-0">
                    <span className="text-xl font-black text-[#1c1e21]">0%</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Used</span>
                  </div>
                  
                  <div className="flex-1 ml-8 space-y-4">
                    <div>
                      <div className="flex justify-between text-sm font-bold text-[#1c1e21] mb-2">
                        <span>Messages Sent: 0</span>
                        <span className="text-gray-500">Tier Limit: 1,000</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-[#25D366] h-2.5 rounded-full" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">You have <span className="font-bold text-[#1c1e21]">1,000 messages remaining</span> for today's quota.</p>
                  </div>
                </div>
              </div>

              {/* Number Status Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-[#1c1e21] mb-1">Active Number</h3>
                <p className="text-sm text-gray-500 mb-6">Official Meta Connection</p>

                <div className="bg-[#F0F2F5] rounded-xl p-4 border border-gray-200 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-[#25D366] rounded-full flex items-center justify-center text-white text-xl shadow-md">
                      📞
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#1c1e21] tracking-wide">+91 97665 04856</div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase">ReplySys Connect</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-600">Health Quality</span>
                      <span className="bg-[#25D366] text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-sm">High / Green</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-600">Account Status</span>
                      <span className="bg-blue-500 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-sm">Verified</span>
                    </div>
                  </div>
                </div>

                <button className="w-full mt-6 text-sm font-bold text-[#008069] border border-gray-200 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                  + Connect Another Number
                </button>
              </div>

            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
