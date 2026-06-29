"use client";
import React from 'react';
import { Star } from 'lucide-react';

export default function MembershipsView() {
  return (
    <div className="space-y-6">
       <div className="grid grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl text-white shadow-lg relative overflow-hidden">
             <Star className="absolute right-[-20px] top-[-20px] text-gray-700 opacity-50" size={120} />
             <h3 className="text-xl font-bold mb-1 relative z-10">VIP Blowout Club</h3>
             <p className="text-gray-300 text-sm mb-4 relative z-10">$199 / month</p>
             <p className="text-3xl font-bold mb-1 relative z-10">84 <span className="text-sm font-normal text-gray-400">Active Members</span></p>
             <button className="mt-4 bg-white text-gray-900 px-4 py-2 rounded font-medium text-sm hover:bg-gray-100">Manage Plan</button>
          </div>
          <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm relative overflow-hidden">
             <h3 className="text-xl font-bold mb-1 text-gray-800">Essential Care</h3>
             <p className="text-gray-500 text-sm mb-4">$49 / month</p>
             <p className="text-3xl font-bold mb-1 text-gray-800">58 <span className="text-sm font-normal text-gray-400">Active Members</span></p>
             <button className="mt-4 bg-gray-100 text-gray-800 px-4 py-2 rounded font-medium text-sm hover:bg-gray-200">Manage Plan</button>
          </div>
       </div>
    </div>
  )
}
