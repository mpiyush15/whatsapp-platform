"use client";
import React from 'react';
import { Megaphone, MessageSquare, TrendingUp } from 'lucide-react';

export default function OffersView() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><Megaphone size={24}/></div>
            <div>
               <p className="text-sm font-semibold text-gray-500">Active Campaigns</p>
               <p className="text-2xl font-bold text-gray-800 mt-1">4</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg"><MessageSquare size={24}/></div>
            <div>
               <p className="text-sm font-semibold text-gray-500">WhatsApp Sent (MTD)</p>
               <p className="text-2xl font-bold text-gray-800 mt-1">1,240</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><TrendingUp size={24}/></div>
            <div>
               <p className="text-sm font-semibold text-gray-500">Revenue from Offers</p>
               <p className="text-2xl font-bold text-gray-800 mt-1">$3,850</p>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
           <h2 className="text-lg font-bold text-gray-800">Automated Salon Plays</h2>
        </div>
        <div className="p-6 grid grid-cols-2 gap-6">
           <div className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-white">
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <h3 className="font-bold text-gray-900 text-lg">Slow Tuesday Promo</h3>
                    <p className="text-sm text-gray-500 mt-1">Sends 20% off color services to lapsed clients if Tuesday is empty.</p>
                 </div>
                 <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">Active</div>
              </div>
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
                 <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Sent</p>
                    <p className="font-bold text-gray-800 text-lg">145</p>
                 </div>
                 <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Booked</p>
                    <p className="font-bold text-green-600 text-lg">12</p>
                 </div>
                 <button className="ml-auto text-sm font-medium text-blue-600 hover:underline">Edit Play</button>
              </div>
           </div>

           <div className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-white">
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <h3 className="font-bold text-gray-900 text-lg">Birthday Special</h3>
                    <p className="text-sm text-gray-500 mt-1">Automated "Free Conditioning Treatment" 7 days before birthday.</p>
                 </div>
                 <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">Active</div>
              </div>
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
                 <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Sent This Month</p>
                    <p className="font-bold text-gray-800 text-lg">42</p>
                 </div>
                 <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Redeemed</p>
                    <p className="font-bold text-green-600 text-lg">18</p>
                 </div>
                 <button className="ml-auto text-sm font-medium text-blue-600 hover:underline">Edit Play</button>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
