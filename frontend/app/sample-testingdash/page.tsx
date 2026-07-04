"use client";
import React, { useState } from 'react';

export default function SampleTestingDashboard() {
  const [activeTab, setActiveTab] = useState('templates');

  return (
    <div className="flex h-screen bg-[#f7f9fa] font-sans antialiased text-[#1c1e21] selection:bg-[#25D366]/20">
      
      {/* SIDEBAR: DARK GREEN MATCHING WA BUSINESS NAV */}
      <aside className="w-64 bg-[#103928] flex flex-col shadow-2xl relative z-20">
        
        {/* Sidebar Header / Logo */}
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.0003 2.00391C6.48625 2.00391 2.00391 6.48625 2.00391 12.0003C2.00391 13.7628 2.45931 15.421 3.2539 16.8522L2.17646 20.7813L6.21639 19.7214C7.59374 20.4578 9.19159 20.887 10.8931 20.887C16.4072 20.887 20.8895 16.4047 20.8895 10.8906C20.8895 5.3766 16.4072 1.95473 12.0003 2.00391ZM12.0003 19.2907C10.5186 19.2907 9.13111 18.918 7.9255 18.2618L7.61633 18.0772L4.74313 18.831L5.51323 16.0125L5.31175 15.692C4.59567 14.3948 4.18431 12.9038 4.18431 11.3195C4.18431 7.00949 7.69025 3.50355 12.0003 3.50355C16.3103 3.50355 19.8162 7.00949 19.8162 11.3195C19.8162 15.6295 16.3103 19.2907 12.0003 19.2907Z" />
            </svg>
            <span className="text-lg font-medium tracking-tight text-white">
              ReplySys <span className="font-bold text-[#25D366]">Platform</span>
            </span>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/40 px-3 mb-4">Operations</div>
          
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-[#25D366] text-[#103928] shadow-md shadow-[#25D366]/20' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Overview
          </button>
          
          <button 
            onClick={() => setActiveTab('templates')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'templates' ? 'bg-[#25D366] text-[#103928] shadow-md shadow-[#25D366]/20' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Message Templates
          </button>

          <button 
            onClick={() => setActiveTab('livechat')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'livechat' ? 'bg-[#25D366] text-[#103928] shadow-md shadow-[#25D366]/20' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            Live Chat Inbox
          </button>

          <button 
            onClick={() => setActiveTab('campaigns')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'campaigns' ? 'bg-[#25D366] text-[#103928] shadow-md shadow-[#25D366]/20' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
            Campaign Broadcasts
          </button>
          
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/40 px-3 mt-8 mb-4">Configuration</div>

          <button 
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            Webhooks & API
          </button>
          
          <button 
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Settings
          </button>
        </nav>
        
        {/* User Profile Snippet */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center text-[#103928] font-bold text-xs">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">John Doe</p>
              <p className="text-[11px] text-white/50 truncate">Workspace Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight text-[#103928]">
              {activeTab === 'templates' && 'Template Verification Matrix'}
              {activeTab === 'overview' && 'Platform Overview'}
              {activeTab === 'campaigns' && 'Campaign Orchestration'}
              {activeTab === 'livechat' && 'Live Customer Inbox'}
            </h1>
            <span className="hidden lg:inline-flex items-center rounded-md bg-[#25D366]/10 px-2.5 py-1 text-xs font-semibold text-[#103928]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] mr-1.5"></span>
              API Connected
            </span>
          </div>

          <div className="flex items-center gap-5">
            {/* Search */}
            <div className="relative hidden md:block">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="w-64 pl-9 pr-4 py-2 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] transition-all"
              />
            </div>
            
            {/* Notification Bell */}
            <button className="relative text-gray-400 hover:text-[#103928] transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 border border-white"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content View */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* Mock Template Engine Layout for the "templates" tab */}
          {activeTab === 'templates' && (
            <div className="max-w-5xl mx-auto space-y-6">
              
              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Approved Templates</p>
                    <p className="text-3xl font-bold text-[#103928]">24</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                </div>
                <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Pending Approval</p>
                    <p className="text-3xl font-bold text-[#103928]">0</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  </div>
                </div>
                <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Auto-Approval Rate</p>
                    <p className="text-3xl font-bold text-[#103928]">100%</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                  </div>
                </div>
              </div>

              {/* Sandbox Editor Area */}
              <div className="bg-white rounded-[24px] shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-100 px-8 py-5 flex items-center justify-between bg-gray-50/50">
                  <h2 className="text-[17px] font-bold text-[#103928]">Create New Template</h2>
                  <button className="rounded-full bg-[#25D366] px-5 py-2 text-sm font-bold text-[#103928] hover:bg-[#20ba5a] transition-colors shadow-sm">
                    Pre-Validate Payload
                  </button>
                </div>
                
                <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                  
                  {/* Left: Input Form */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-[#103928] mb-2">Template Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. order_confirmation_v2" 
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#103928] mb-2">Category Routing</label>
                      <div className="grid grid-cols-3 gap-3">
                        <button className="px-4 py-2.5 rounded-lg border-2 border-[#25D366] bg-[#25D366]/5 text-sm font-bold text-[#103928]">UTILITY</button>
                        <button className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">MARKETING</button>
                        <button className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">AUTHENTICATION</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#103928] mb-2">Message Payload</label>
                      <textarea 
                        rows={6}
                        placeholder="Hi {{1}}, your order {{2}} has been confirmed."
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] transition-all resize-none font-mono"
                      ></textarea>
                    </div>
                  </div>

                  {/* Right: Validation Feedback Preview */}
                  <div className="bg-[#f0f4f2] rounded-2xl p-6 border border-[#25D366]/20 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></div>
                      <span className="text-xs font-bold text-[#103928] uppercase tracking-wider">Live Compliance Scanner</span>
                    </div>

                    <div className="space-y-4">
                      {/* Status cards */}
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-3">
                        <div className="text-[#25D366]">✓</div>
                        <div>
                          <p className="text-sm font-bold text-[#103928]">Category Match</p>
                          <p className="text-xs text-gray-500 mt-1">Language semantics align with UTILITY schema.</p>
                        </div>
                      </div>
                      
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-3">
                        <div className="text-[#25D366]">✓</div>
                        <div>
                          <p className="text-sm font-bold text-[#103928]">Variable Syntax</p>
                          <p className="text-xs text-gray-500 mt-1">Proper bounding logic detected for `{"{{1}}"}`.</p>
                        </div>
                      </div>

                      <div className="absolute -bottom-6 -right-6 opacity-5">
                        <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L1 21H23L12 2Z"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>
          )}

          {/* Mock Live Chat Layout for the "livechat" tab */}
          {activeTab === 'livechat' && (
            <div className="h-full flex bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px]">
              
              {/* Left Column: Chat List */}
              <div className="w-80 flex flex-col border-r border-gray-100 bg-gray-50/50">
                <div className="p-4 border-b border-gray-100">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input 
                      type="text" 
                      placeholder="Search chats..." 
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] transition-all"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {/* Chat Item 1 (Active) */}
                  <div className="flex items-start gap-3 p-4 bg-white border-l-4 border-[#25D366] cursor-pointer shadow-sm relative z-10">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-blue-600 font-bold">
                      SM
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <p className="text-sm font-bold text-[#103928] truncate">Sarah Miller</p>
                        <span className="text-[10px] text-[#25D366] font-bold">10:42 AM</span>
                      </div>
                      <p className="text-xs text-[#1c1e21] truncate font-medium">Yes, the tracking number works now. Thanks!</p>
                    </div>
                  </div>

                  {/* Chat Item 2 */}
                  <div className="flex items-start gap-3 p-4 hover:bg-gray-50 border-l-4 border-transparent cursor-pointer transition-colors border-b border-gray-50">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex-shrink-0 flex items-center justify-center text-purple-600 font-bold">
                      J
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <p className="text-sm font-bold text-[#103928] truncate">Jason</p>
                        <span className="text-[10px] text-gray-400">Yesterday</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">Can you check my billing issue?</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Chat Window */}
              <div className="flex-1 flex flex-col bg-[#efeae2] relative overflow-hidden">
                {/* Chat Background Pattern (WA style) */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'20\\' height=\\'20\\' viewBox=\\'0 0 20\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'%23103928\\' fill-opacity=\\'1\\' fill-rule=\\'evenodd\\'%3E%3Ccircle cx=\\'3\\' cy=\\'3\\' r=\\'3\\'/%3E%3Ccircle cx=\\'13\\' cy=\\'13\\' r=\\'3\\'/%3E%3C/g%3E%3C/svg%3E')" }}></div>
                
                {/* Chat Header */}
                <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">SM</div>
                    <div>
                      <h2 className="text-[15px] font-bold text-[#103928]">Sarah Miller</h2>
                      <p className="text-[11px] text-[#25D366] font-medium">Online</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-gray-400">
                    <button className="hover:text-[#103928]"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button>
                    <button className="hover:text-[#103928]"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 z-10 flex flex-col">
                  <div className="self-center bg-[#e1f0e5] text-[#103928] text-[11px] font-bold px-3 py-1 rounded-lg uppercase tracking-wider mb-2">Today</div>
                  
                  <div className="self-start bg-white rounded-xl rounded-tl-none p-3 shadow-sm max-w-[75%] relative">
                    <p className="text-[14px] text-[#1c1e21] leading-relaxed">Hi, I'm trying to track my recent order but the link in the email isn't loading for me.</p>
                    <span className="block text-[10px] text-gray-400 text-right mt-1">10:38 AM</span>
                  </div>

                  <div className="self-end bg-[#dcf8c6] rounded-xl rounded-tr-none p-3 shadow-sm max-w-[75%] relative border border-[#25D366]/20">
                    <p className="text-[14px] text-[#1c1e21] leading-relaxed">Hello Sarah! I apologize for the inconvenience. Let me look up your order right away.</p>
                    <span className="block text-[10px] text-gray-500 text-right mt-1">10:40 AM ✓✓</span>
                  </div>

                  <div className="self-end bg-[#dcf8c6] rounded-xl rounded-tr-none p-3 shadow-sm max-w-[75%] relative border border-[#25D366]/20">
                    <p className="text-[14px] text-[#1c1e21] leading-relaxed">Here is the direct tracking link: https://track.example.com/SM99281</p>
                    <span className="block text-[10px] text-gray-500 text-right mt-1">10:41 AM ✓✓</span>
                  </div>

                  <div className="self-start bg-white rounded-xl rounded-tl-none p-3 shadow-sm max-w-[75%] relative">
                    <p className="text-[14px] text-[#1c1e21] leading-relaxed font-medium">Yes, the tracking number works now. Thanks!</p>
                    <span className="block text-[10px] text-gray-400 text-right mt-1">10:42 AM</span>
                  </div>
                </div>

                {/* Chat Input */}
                <div className="bg-[#f0f2f5] p-4 flex items-end gap-3 z-10 border-t border-gray-200">
                  <button className="p-2 text-gray-500 hover:text-[#103928] transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                  </button>
                  <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex items-end shadow-sm focus-within:border-[#25D366] focus-within:ring-1 focus-within:ring-[#25D366] transition-all">
                    <textarea 
                      rows={1}
                      placeholder="Type a message..."
                      className="w-full px-4 py-3 text-[14px] focus:outline-none resize-none max-h-32"
                    ></textarea>
                  </div>
                  <button className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center text-[#103928] hover:bg-[#20ba5a] transition-colors shadow-sm shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* Fallback for other tabs */}
          {activeTab !== 'templates' && activeTab !== 'livechat' && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#103928]">Module Not Implemented</h3>
                <p className="text-gray-500 mt-2">This view is currently a UI layout prototype.</p>
              </div>
            </div>
          )}
        </div>
      </main>

    </div>
  );
}
