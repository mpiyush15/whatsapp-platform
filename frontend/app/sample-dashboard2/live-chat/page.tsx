'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Home, Target, MessageSquare, Bot, Rocket, BarChart2, Settings } from 'lucide-react';

export default function LiveChatPage() {
  const [activeFilter, setActiveFilter] = useState('All');

  // Sample data based on your screenshot
  const chats = [
    { id: 1, name: 'NuLife Cancer Clinic', time: '16:11', msg: '✅ Thank you for completing the form! Your responses...', unread: 2, color: 'bg-green-100 text-green-700', avatar: 'N' },
    { id: 2, name: 'Siska Salon and Skin', time: '16:12', msg: 'Thank you for contacting Siska Salon And Skin Clinic...', unread: 1, color: 'bg-teal-100 text-teal-700', avatar: 'S' },
    { id: 3, name: 'Customer', time: '16:18', msg: 'We would love to get your feedback on our new WhatsApp...', unread: 0, color: 'bg-blue-100 text-blue-700', avatar: 'C' },
    { id: 4, name: 'Skin Philosophy London', time: '16:13', msg: 'Thank you for your time! 🙏 We noticed you might be busy...', unread: 0, color: 'bg-pink-100 text-pink-700', avatar: 'S' },
    { id: 5, name: 'dermat rfh', time: '16:13', msg: 'Thank you for your time! 🙏 We noticed you might be busy...', unread: 0, color: 'bg-purple-100 text-purple-700', avatar: 'D' },
    { id: 6, name: 'Cutis Skin Solutions', time: '16:11', msg: 'Thank you for contacting Cutis Skin Solution! Please let us...', unread: 0, color: 'bg-yellow-100 text-yellow-700', avatar: 'C' },
  ];

  return (
    <div className="flex h-screen bg-[#F0F2F5] font-sans overflow-hidden">
      
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

          <Link href="/sample-dashboard2/leads" className="flex flex-col items-center justify-center gap-1 text-white/70 hover:bg-white/10 hover:text-white w-[64px] h-[64px] rounded-2xl font-medium transition-all group">
            <Target className="w-5 h-5 shrink-0 opacity-70 group-hover:opacity-100" strokeWidth={2.5} />
            <span className="text-[10px] tracking-wide group-hover:font-bold">Leads</span>
          </Link>

          <Link href="/sample-dashboard2/live-chat" className="flex flex-col items-center justify-center gap-1 bg-white/20 text-white w-[64px] h-[64px] rounded-2xl font-bold shadow-md transition-all relative">
            <MessageSquare className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            <span className="text-[10px] tracking-wide">Chat</span>
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

      {/* PANE 2: THE CHAT LIST (Clean & Truncated) */}
      <div className="w-full max-w-[380px] bg-white border-r border-gray-200 flex flex-col shrink-0 z-10">
        
        {/* Header & Search */}
        <div className="p-4 border-b border-gray-100 bg-[#F0F2F5]">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full pl-10 pr-4 py-2 bg-white rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#008069] transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-3 border-b border-gray-100 bg-white flex gap-2 overflow-x-auto scrollbar-hide">
          {['All', 'Unread', 'Open', 'Closed', 'Mine'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                activeFilter === tab 
                  ? 'bg-[#115B4C] text-white shadow-sm' 
                  : 'bg-transparent text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* The List (Strictly Truncated) */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {chats.map((chat, idx) => (
            <div 
              key={chat.id} 
              className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${idx === 2 ? 'bg-[#F0F2F5]' : 'hover:bg-gray-50'}`}
            >
              <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${chat.color}`}>
                {chat.avatar}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex justify-between items-center mb-0.5">
                  <h4 className="font-bold text-[#1c1e21] text-sm truncate pr-2">{chat.name}</h4>
                  <span className={`text-xs ${chat.unread > 0 ? 'text-[#008069] font-bold' : 'text-gray-400'}`}>{chat.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[13px] text-gray-500 truncate mr-2">{chat.msg}</p>
                  {chat.unread > 0 && (
                    <span className="bg-[#25D366] text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center shrink-0">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PANE 3: THE MAIN CHAT WINDOW (WhatsApp Aesthetic) */}
      <div className="flex-1 flex flex-col bg-[#EFEAE2] relative">
        
        {/* WhatsApp Doodle Pattern Background */}
        <div className="absolute inset-0 opacity-[0.04] bg-[url('https://static.whatsapp.net/rsrc.php/v3/yl/r/r-3V5AHT-6A.png')] pointer-events-none mix-blend-multiply z-0"></div>

        {/* Chat Header */}
        <header className="h-16 bg-[#F0F2F5] px-6 flex justify-between items-center border-b border-gray-200 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
              C
            </div>
            <div>
              <h2 className="font-bold text-[#1c1e21]">Customer</h2>
              <p className="text-xs text-gray-500">+91 76019 29292</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-sm font-bold text-[#1c1e21] bg-white border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm transition-colors">
              Manage Contact
            </button>
            <button className="text-gray-500 hover:text-[#1c1e21]">⋮</button>
          </div>
        </header>

        {/* 24-Hour Rule Warning Banner */}
        <div className="bg-[#FFEEDB] text-[#8A6D3B] text-xs font-bold px-4 py-3 flex justify-between items-center relative z-10 border-b border-[#F5D8B3]">
          <div className="flex items-center gap-2">
            <span>⚠️</span> 24-hour chat window expired. Free messages won't deliver.
          </div>
          <button className="bg-[#B97A44] text-white px-3 py-1.5 rounded text-[10px] uppercase tracking-wider hover:bg-[#9B6233] transition-colors">
            Send Template
          </button>
        </div>

        {/* Scrollable Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10">
          
          <div className="flex justify-center mb-6">
            <span className="bg-white/80 text-gray-500 text-xs px-3 py-1 rounded-lg shadow-sm backdrop-blur-sm">Today</span>
          </div>

          {/* Incoming Message */}
          <div className="flex justify-start">
            <div className="bg-white text-[#1c1e21] text-[13px] px-3 pt-2 pb-1 rounded-tr-xl rounded-br-xl rounded-bl-xl shadow-sm max-w-[70%]">
              <span className="leading-relaxed">Is there anything else I may help you with?</span>
              <div className="text-right text-[10px] text-gray-400 mt-1">16:18</div>
            </div>
          </div>

          {/* Outgoing Message (Green) */}
          <div className="flex justify-end">
            <div className="bg-[#D9FDD3] text-[#1c1e21] text-[13px] px-3 pt-2 pb-1 rounded-tl-xl rounded-bl-xl rounded-br-xl shadow-sm max-w-[70%] relative">
              <span className="leading-relaxed">Thank you for your time! 🙏<br/><br/>We noticed you might be busy right now. No worries!<br/><br/>If you'd like to continue later, just send us a message anytime. We're here to help! 😊</span>
              <div className="text-right text-[10px] text-gray-500 mt-1 flex justify-end items-center gap-1">
                16:18 <span className="text-blue-500">✓✓</span>
              </div>
            </div>
          </div>

          {/* Incoming Message */}
          <div className="flex justify-start">
            <div className="bg-white text-[#1c1e21] text-[13px] px-3 pt-2 pb-1 rounded-tr-xl rounded-br-xl rounded-bl-xl shadow-sm max-w-[70%]">
              <span className="leading-relaxed">Thank you!</span>
              <div className="text-right text-[10px] text-gray-400 mt-1">16:18</div>
            </div>
          </div>
          
          {/* Outgoing Message (Green) */}
          <div className="flex justify-end">
            <div className="bg-[#D9FDD3] text-[#1c1e21] text-[13px] px-3 pt-2 pb-1 rounded-tl-xl rounded-bl-xl rounded-br-xl shadow-sm max-w-[70%] relative">
              <span className="leading-relaxed">We would love to get your feedback on our new WhatsApp system, just 3 questions if you can spare a moment: https://aa.gs.im/nbAMFcO</span>
              <div className="text-right text-[10px] text-gray-500 mt-1 flex justify-end items-center gap-1">
                16:18 <span className="text-gray-400">✓✓</span>
              </div>
            </div>
          </div>

        </div>

        {/* Message Input Footer */}
        <footer className="bg-[#F0F2F5] px-4 py-3 flex items-center gap-3 shrink-0 relative z-10">
          <button className="text-gray-500 hover:text-gray-700 p-2 text-xl">😃</button>
          <button className="text-gray-500 hover:text-gray-700 p-2 text-xl">📎</button>
          
          <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex items-center pr-2">
            <input 
              type="text" 
              placeholder="Type a message..." 
              className="w-full px-4 py-3 text-sm focus:outline-none"
              disabled
            />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 cursor-pointer hover:text-gray-600">/Templates</span>
          </div>

          <button className="h-10 w-10 bg-gray-300 text-white rounded-full flex items-center justify-center cursor-not-allowed">
            <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </footer>

      </div>
    </div>
  );
}
