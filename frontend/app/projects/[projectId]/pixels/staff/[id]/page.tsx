"use client";
import React from 'react';
import Link from 'next/link';
import { Scissors, Star, Clock, Calendar, ChevronLeft, Settings, Users } from 'lucide-react';

export default function StaffDetailsPage({ params }: { params: { id: string } }) {
  const isEmma = params.id === 'DOC-1';
  const name = isEmma ? "Emma Smith" : "David Chen";
  const role = isEmma ? "Senior Stylist" : "Master Barber";
  const rating = isEmma ? 4.9 : 5.0;
  
  return (
    <div className="space-y-6 max-w-6xl">
      <Link href="/dashboard/pixels/staff" className="text-sm text-gray-500 hover:text-green-600 flex items-center gap-1">
         <ChevronLeft size={16}/> Back to Staff
      </Link>
      
      {/* Header Profile */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-start justify-between">
         <div className="flex gap-6 items-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
               <Scissors size={32}/>
            </div>
            <div>
               <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
               <p className="text-gray-500 text-sm mt-1">{role}</p>
               <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="flex items-center gap-1 font-semibold text-gray-800"><Star size={16} className="text-yellow-400 fill-yellow-400"/> {rating} Rating</span>
                  <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">Clocked In</span>
               </div>
            </div>
         </div>
         <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-medium hover:bg-slate-800 transition-colors">
               <Settings size={18}/> Edit Profile
            </button>
         </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
         {/* Left Column: Schedule Settings */}
         <div className="col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2"><Clock size={18}/> Schedule Settings</h3>
                  <button className="text-blue-600 text-sm font-medium hover:underline">Edit</button>
               </div>
               
               <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                     <span className="font-medium text-gray-600">Monday</span>
                     <span className="text-gray-900">9:00 AM - 5:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                     <span className="font-medium text-gray-600">Tuesday</span>
                     <span className="text-gray-900">9:00 AM - 5:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                     <span className="font-medium text-gray-600">Wednesday</span>
                     <span className="text-red-500 font-medium">Off</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                     <span className="font-medium text-gray-600">Thursday</span>
                     <span className="text-gray-900">10:00 AM - 7:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                     <span className="font-medium text-gray-600">Friday</span>
                     <span className="text-gray-900">10:00 AM - 7:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                     <span className="font-medium text-gray-600">Saturday</span>
                     <span className="text-gray-900">9:00 AM - 3:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center pb-2">
                     <span className="font-medium text-gray-600">Sunday</span>
                     <span className="text-red-500 font-medium">Off</span>
                  </div>
               </div>
            </div>
         </div>

         {/* Right Column: Appointments */}
         <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="border-b border-gray-200 bg-gray-50 p-4 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2"><Calendar size={18}/> Appointments (Today)</h3>
                  <span className="bg-white border border-gray-200 text-gray-700 px-3 py-1 rounded-lg text-sm font-medium">85% Utilization</span>
               </div>
               <div className="p-0">
                  <table className="w-full text-left text-sm">
                     <thead>
                        <tr className="border-b border-gray-100 text-gray-500">
                           <th className="p-4 font-semibold">Time</th>
                           <th className="p-4 font-semibold">Client</th>
                           <th className="p-4 font-semibold">Service</th>
                           <th className="p-4 font-semibold">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50 text-gray-800">
                        <tr className="hover:bg-gray-50 transition-colors">
                           <td className="p-4 font-medium">10:00 AM (90m)</td>
                           <td className="p-4"><Link href="/dashboard/pixels/clients/CLI-101" className="font-bold text-slate-900 hover:text-green-600 hover:underline">Sarah Jenkins</Link></td>
                           <td className="p-4 text-gray-600">Balayage & Cut</td>
                           <td className="p-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Confirmed</span></td>
                        </tr>
                        <tr className="hover:bg-gray-50 transition-colors">
                           <td className="p-4 font-medium">1:00 PM (120m)</td>
                           <td className="p-4"><Link href="/dashboard/pixels/clients/CLI-105" className="font-bold text-slate-900 hover:text-green-600 hover:underline">Donna Paulsen</Link></td>
                           <td className="p-4 text-gray-600">Full Color & Style</td>
                           <td className="p-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Checked In</span></td>
                        </tr>
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}
