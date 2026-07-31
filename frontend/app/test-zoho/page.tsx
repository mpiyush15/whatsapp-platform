'use client'

import React, { useState } from 'react';
import { 
  MessageSquare, LayoutDashboard, Megaphone, Settings, 
  Users, Bot, Workflow, BarChart, Send, Image as ImageIcon,
  PlayCircle, HelpCircle, ChevronRight, Search, Bell, X,
  Plus, ChevronDown, Home
} from 'lucide-react';

const apps = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'conversations', label: 'Live Chat', icon: MessageSquare },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'agents', label: 'AI Agents', icon: Bot },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const sidebarData: Record<string, any> = {
  home: {
    actionBtn: 'Quick Action',
    sections: [
      {
        title: 'GETTING STARTED',
        items: [
          { id: 'onboarding', label: 'Onboarding Guide' },
          { id: 'setup', label: 'Workspace Setup' },
        ]
      }
    ]
  },
  dashboard: {
    actionBtn: 'New Report',
    sections: [
      {
        title: 'VIEWS',
        items: [
          { id: 'overview', label: 'Overview' },
          { id: 'analytics', label: 'Analytics' },
        ]
      }
    ]
  },
  conversations: {
    actionBtn: 'New Chat',
    sections: [
      {
        title: 'STREAMS',
        items: [
          { id: 'all', label: 'All Messages' },
          { id: 'unread', label: 'Unread', count: 5 },
        ]
      },
      {
        title: 'FOLDERS',
        items: [
          { id: 'inbox', label: 'Inbox', count: 12 },
          { id: 'assigned', label: 'Assigned to me' },
          { id: 'resolved', label: 'Resolved' },
          { id: 'spam', label: 'Spam' },
        ]
      },
      {
        title: 'AUTOMATION',
        items: [
          { id: 'chatbot', label: 'Chatbot' },
          { id: 'flow', label: 'Flow Builder' },
        ]
      }
    ]
  },
  agents: {
    actionBtn: 'New Agent',
    sections: [
      {
        title: 'AGENT WORKFORCE',
        items: [
          { id: 'sales_agent', label: 'Sales Agent' },
          { id: 'support_agent', label: 'Support Agent' },
          { id: 'marketing_agent', label: 'Marketing Agent' },
        ]
      },
      {
        title: 'KNOWLEDGE',
        items: [
          { id: 'documents', label: 'Documents' },
          { id: 'web_links', label: 'Web Scrapers' },
        ]
      }
    ]
  },
  marketing: {
    actionBtn: 'New Campaign',
    sections: [
      {
        title: 'CAMPAIGNS',
        items: [
          { id: 'active', label: 'Active Campaigns' },
          { id: 'drafts', label: 'Drafts' },
          { id: 'completed', label: 'Completed' },
        ]
      },
      {
        title: 'ASSETS',
        items: [
          { id: 'templates', label: 'Templates' },
          { id: 'media', label: 'Media Library' },
        ]
      }
    ]
  },
  contacts: {
    actionBtn: 'Add Contact',
    sections: [
      {
        title: 'LISTS',
        items: [
          { id: 'all_contacts', label: 'All Contacts' },
          { id: 'leads', label: 'Leads' },
          { id: 'customers', label: 'Customers' },
        ]
      }
    ]
  },
  settings: {
    actionBtn: 'System Settings',
    sections: [
      {
        title: 'GENERAL',
        items: [
          { id: 'profile', label: 'Profile' },
          { id: 'billing', label: 'Billing' },
          { id: 'team', label: 'Team Members' },
        ]
      }
    ]
  }
};

export default function TestZohoUI() {
  const [activeApp, setActiveApp] = useState('conversations');
  const [activeSubItem, setActiveSubItem] = useState('inbox');
  const [showHelp, setShowHelp] = useState(false);

  const handleAppChange = (appId: string) => {
    setActiveApp(appId);
    setActiveSubItem(sidebarData[appId].sections[0].items[0].id);
  };

  const currentAppData = sidebarData[activeApp];
  const activeAppObj = apps.find(a => a.id === activeApp);

  return (
    <div className="flex flex-col h-screen bg-white text-gray-800 font-sans overflow-hidden">
      
      {/* 1. DARK TOPBAR (Macro Navigation / App Switcher) */}
      <header className="h-14 bg-[#1f242b] flex items-center justify-between px-4 shrink-0 shadow-sm z-20 border-b border-[#2a2e33]">
        <div className="flex items-center gap-6">
          
          {/* App Logo */}
          <div className="flex items-center gap-2 text-white font-bold text-lg cursor-pointer">
            <div className="w-8 h-8 bg-[#10b981] rounded-lg flex items-center justify-center shadow-sm">
              <Workflow size={18} className="text-white" />
            </div>
            Replysys
          </div>
          
          {/* Topbar Tabs with Spacing */}
          <nav className="flex gap-4 ml-6 overflow-x-auto no-scrollbar">
            {apps.map(app => {
              const Icon = app.icon;
              const isActive = activeApp === app.id;
              return (
                <button
                  key={app.id}
                  onClick={() => handleAppChange(app.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm whitespace-nowrap shrink-0 transition-colors ${
                    isActive 
                      ? 'bg-[#2a3038] text-white font-medium shadow-sm' 
                      : 'text-gray-400 hover:bg-[#2a3038] hover:text-white'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-blue-400' : ''} />
                  {app.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Topbar Right Actions (Icons Only) */}
        <div className="flex items-center gap-2 w-full justify-end px-2">
           
           <button className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-[#2a3038] hover:text-white cursor-pointer transition-colors">
             <Search size={18} />
           </button>

           <button className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-[#2a3038] hover:text-white cursor-pointer transition-colors">
             <Bell size={18} />
           </button>
           
           <button 
             onClick={() => setShowHelp(!showHelp)}
             className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors border ${
               showHelp 
                 ? 'bg-[#2a3038] text-white border-transparent' 
                 : 'bg-transparent text-gray-400 border-transparent hover:bg-[#2a3038] hover:text-white'
             }`}
           >
             <HelpCircle size={18} />
           </button>

           <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 cursor-pointer flex items-center justify-center text-white text-xs font-bold shadow-sm ml-2">
             PI
           </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 2. THIN SIDEBAR (Styled like Zoho App Switcher) */}
        <aside className="w-[84px] bg-[#1e2329] border-r border-[#2a2e33] flex flex-col items-center py-4 z-10 shrink-0 text-gray-300 overflow-y-auto no-scrollbar">
          
          <div className="flex flex-col gap-5 w-full">
            {currentAppData.sections.flatMap((s: any) => s.items).map((item: any, idx: number) => {
              const isActive = activeSubItem === item.id;
              
              // Assign fake colors based on index for the demo
              const colors = [
                'bg-blue-500', 'bg-purple-500', 'bg-green-500', 
                'bg-amber-600', 'bg-red-700', 'bg-orange-500', 'bg-slate-600'
              ];
              const bgColor = colors[idx % colors.length];

              // Pick a random icon based on id for demo purposes
              let Icon = MessageSquare;
              if (item.id === 'analytics') Icon = BarChart;
              if (item.id === 'unread') Icon = Bell;
              if (item.id === 'chatbot') Icon = Bot;
              if (item.id === 'flow') Icon = Workflow;
              if (item.id === 'templates') Icon = LayoutDashboard;
              if (item.id === 'media') Icon = ImageIcon;

              return (
                <div 
                  key={item.id}
                  onClick={() => setActiveSubItem(item.id)}
                  className={`flex flex-col items-center group cursor-pointer relative py-1 w-full ${isActive ? 'bg-[#2a3038]/50' : ''}`}
                >
                  {/* Active Indicator Line */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-md"></div>
                  )}

                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform ${bgColor} shadow-sm group-hover:scale-105`}>
                    <Icon size={18} className="text-white" strokeWidth={2.5} />
                  </div>
                  
                  <span className={`text-[11px] mt-1.5 font-medium tracking-wide text-center px-1 leading-tight ${
                    isActive ? 'text-gray-100' : 'text-gray-400 group-hover:text-gray-200'
                  }`}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        {/* 3. MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          
          {/* Minimal Topbar for Content Context */}
          <header className="h-12 border-b border-gray-200 flex items-center justify-between px-6 shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-gray-800">
                {activeAppObj?.label} 
              </h2>
              <ChevronRight size={14} className="text-gray-400" />
              <span className="text-gray-500 text-sm">
                {currentAppData.sections.flatMap((s:any) => s.items).find((i:any) => i.id === activeSubItem)?.label}
              </span>
            </div>
          </header>

          {/* Content Body */}
          <div className="flex-1 p-8 overflow-y-auto bg-gray-50/50">
            <div className="max-w-4xl mx-auto">
              
              {/* Dummy Content Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 flex flex-col items-center justify-center text-center mt-4">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <PlayCircle className="text-blue-600 w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Hybrid Zoho Layout</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-8 text-sm leading-relaxed">
                  The apps are now tabs in the dark topbar. When you click a tab, the dark sidebar instantly updates with its specific contextual folders. This is the perfect balance!
                </p>
                <button 
                  onClick={() => setShowHelp(true)}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Open Contextual Academy
                </button>
              </div>
              
              {/* Dummy Stats Row */}
              <div className="grid grid-cols-3 gap-6 mt-6">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="h-2 w-12 bg-gray-200 rounded mb-4"></div>
                    <div className="h-6 w-24 bg-gray-300 rounded mb-2"></div>
                    <div className="h-2 w-32 bg-gray-100 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* 4. ONBOARDING / ACADEMY SLIDE-OUT PANEL */}
        {showHelp && (
          <aside className="w-80 bg-white border-l border-gray-200 shadow-2xl flex flex-col z-30 transition-all duration-300">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 backdrop-blur">
              <div className="flex items-center gap-2 font-bold text-gray-800">
                <PlayCircle size={18} className="text-blue-600" />
                Academy & Help
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="mb-6">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-full">
                    Contextual Guide
                  </span>
                  <h3 className="font-bold text-xl text-gray-900 mt-4 mb-2 leading-tight">
                    Mastering {activeAppObj?.label}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Learn how to navigate the new layout and get the most out of this module.
                  </p>
                </div>

                {/* Dummy Video Player */}
                <div className="w-full h-44 bg-gray-900 rounded-xl relative flex items-center justify-center cursor-pointer group mb-8 shadow-md overflow-hidden border border-gray-200">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 transition-all">
                      <PlayCircle size={24} className="text-white ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 text-white text-sm font-medium z-20">
                    Intro to {activeAppObj?.label}
                  </div>
                </div>

                <div className="space-y-5">
                  <h4 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">Quick Articles</h4>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 items-start group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">
                        <span className="text-xs font-bold text-gray-400 group-hover:text-blue-600">0{i}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors leading-tight mb-1">
                          How to configure {activeAppObj?.label.toLowerCase()}
                        </p>
                        <p className="text-xs text-gray-400">2 min read</p>
                      </div>
                    </div>
                  ))}
                </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
