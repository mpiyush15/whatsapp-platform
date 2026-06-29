"use client";
import React from 'react';
import { Bot, MessageSquare, PlayCircle, Settings, Camera, Star, HelpCircle } from 'lucide-react';

export default function ChatbotAutomationsView() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-6">
         <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Conversational AI</h1>
            <p className="text-gray-500 text-sm mt-1">Pre-built conversational flows to handle salon inquiries, feedback, and sales.</p>
         </div>
         <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
            Create Custom Flow
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Flow 1: Booking Assistant */}
         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
            <div>
               <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                     <Bot size={24}/>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><PlayCircle size={12}/> Active</span>
               </div>
               <h3 className="text-xl font-bold text-gray-900">AI Booking Assistant</h3>
               <p className="text-gray-500 text-sm mt-2">Allows clients to text "Book an appointment", views staff schedules, and secures slots conversationally.</p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
               <div className="text-sm">
                  <span className="font-bold text-gray-900">342</span> <span className="text-gray-500">Bookings (MTD)</span>
               </div>
               <button className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"><Settings size={14}/> Configure</button>
            </div>
         </div>

         {/* Flow 2: Feedback & Reviews */}
         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
            <div>
               <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center">
                     <Star size={24}/>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><PlayCircle size={12}/> Active</span>
               </div>
               <h3 className="text-xl font-bold text-gray-900">Post-Service Feedback Flow</h3>
               <p className="text-gray-500 text-sm mt-2">Fires 2 hours after check-out. Asks for a 1-5 rating. Routes 4-5 stars to Google, alerts manager for 1-3 stars.</p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
               <div className="text-sm">
                  <span className="font-bold text-gray-900">4.8</span> <span className="text-gray-500">Avg Score</span>
               </div>
               <button className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"><Settings size={14}/> Configure</button>
            </div>
         </div>

         {/* Flow 3: Before & After */}
         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
            <div>
               <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                     <Camera size={24}/>
                  </div>
                  <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">Paused</span>
               </div>
               <h3 className="text-xl font-bold text-gray-900">Before & After Shareable</h3>
               <p className="text-gray-500 text-sm mt-2">Stylist uploads photo to dashboard. Bot sends polished photo to client via WhatsApp encouraging social sharing.</p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
               <div className="text-sm">
                  <span className="font-bold text-gray-900">0</span> <span className="text-gray-500">Sent (MTD)</span>
               </div>
               <button className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"><Settings size={14}/> Configure</button>
            </div>
         </div>

         {/* Flow 4: FAQ Bot */}
         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
            <div>
               <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                     <HelpCircle size={24}/>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><PlayCircle size={12}/> Active</span>
               </div>
               <h3 className="text-xl font-bold text-gray-900">Salon FAQ Handler</h3>
               <p className="text-gray-500 text-sm mt-2">Automatically answers "Where are you located?", "What are your hours?", and "How much is a balayage?".</p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
               <div className="text-sm">
                  <span className="font-bold text-gray-900">128</span> <span className="text-gray-500">Queries deflected</span>
               </div>
               <button className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"><Settings size={14}/> Configure</button>
            </div>
         </div>
      </div>
    </div>
  )
}
