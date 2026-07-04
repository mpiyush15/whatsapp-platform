'use client';
import React, { useState } from 'react';

export default function LiveChat() {
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
      
      {/* PANE 1: THE ICON NAVIGATION RAIL (Dark Mode) */}
      <aside className="w-16 bg-[#111B21] flex flex-col items-center py-4 space-y-6 shrink-0 z-20">
        <div className="bg-[#25D366] text-[#111B21] p-2 rounded-lg cursor-pointer shadow-lg mb-4">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        </div>
        
        {/* Nav Icons */}
        <div className="text-gray-400 hover:text-white cursor-pointer p-2 rounded-lg hover:bg-white/10 transition-colors"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg></div>
        <div className="text-gray-400 hover:text-white cursor-pointer p-2 rounded-lg hover:bg-white/10 transition-colors"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
        <div className="text-white bg-white/10 cursor-pointer p-2 rounded-lg border-l-2 border-[#25D366]"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg></div>
        
        <div className="mt-auto pt-4 border-t border-white/10 w-full flex justify-center">
          <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm cursor-pointer">P</div>
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
