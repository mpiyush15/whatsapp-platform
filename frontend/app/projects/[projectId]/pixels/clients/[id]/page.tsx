"use client";
import React from 'react';
import { User, Phone, MapPin, Calendar as CalIcon, MessageCircle, Clock, FileText } from 'lucide-react';
import Link from 'next/link';

export default function ClientDetailsPage({ params }: { params: { id: string } }) {
  // Mock data based on the ID
  const isSarah = params.id === 'CLI-101';
  const name = isSarah ? "Sarah Jenkins" : "Jessica Pearson";
  const phone = isSarah ? "+1 555-0198" : "+1 555-0312";
  const membership = isSarah ? "VIP Club" : "None";
  const ltv = isSarah ? "$1,250" : "$450";

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/dashboard/pixels/appointments" className="text-sm text-gray-500 hover:text-green-600 flex items-center gap-1">
         &larr; Back to Appointments
      </Link>
      
      {/* Client Header Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-start justify-between">
         <div className="flex gap-6 items-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-2xl font-bold">
               {name.charAt(0)}
            </div>
            <div>
               <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
               <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><Phone size={14}/> {phone}</span>
                  <span className="flex items-center gap-1"><MapPin size={14}/> New York, NY</span>
               </div>
               <div className="mt-3 flex gap-2">
                 {isSarah && <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded-full">{membership}</span>}
                 <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">LTV: {ltv}</span>
                 <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2.5 py-1 rounded-full">1,450 pts</span>
               </div>
            </div>
         </div>
         <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl font-medium hover:bg-green-100 transition-colors">
               <MessageCircle size={18}/> Message
            </button>
            <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-medium hover:bg-slate-800 transition-colors">
               <CalIcon size={18}/> Book
            </button>
         </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
         {/* Left Column: Details */}
         <div className="col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
               <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><User size={18}/> About Client</h3>
               <div className="space-y-4 text-sm text-gray-600">
                  <div>
                     <p className="font-medium text-gray-400 uppercase text-xs tracking-wide">Email</p>
                     <p className="text-gray-900 mt-0.5">{name.split(' ')[0].toLowerCase()}@example.com</p>
                  </div>
                  <div>
                     <p className="font-medium text-gray-400 uppercase text-xs tracking-wide">Birthday</p>
                     <p className="text-gray-900 mt-0.5">August 14, 1992</p>
                  </div>
                  <div>
                     <p className="font-medium text-gray-400 uppercase text-xs tracking-wide">Client Since</p>
                     <p className="text-gray-900 mt-0.5">January 2024</p>
                  </div>
               </div>
            </div>
            
            <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-200">
               <h3 className="font-bold text-yellow-900 mb-2 flex items-center gap-2"><FileText size={18}/> Staff Notes</h3>
               <p className="text-sm text-yellow-800">
                  Client prefers amonia-free color. Highly sensitive to strong fragrances. Always offer sparkling water on arrival.
               </p>
            </div>
         </div>

         {/* Right Column: History */}
         <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="border-b border-gray-200 bg-gray-50 p-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2"><Clock size={18}/> Appointment History</h3>
               </div>
               <div className="p-0">
                  <table className="w-full text-left text-sm">
                     <thead>
                        <tr className="border-b border-gray-100 text-gray-500">
                           <th className="p-4 font-semibold">Date</th>
                           <th className="p-4 font-semibold">Service</th>
                           <th className="p-4 font-semibold">Staff</th>
                           <th className="p-4 font-semibold">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50 text-gray-800">
                        <tr className="hover:bg-gray-50">
                           <td className="p-4 font-medium">June 16, 2026</td>
                           <td className="p-4">Balayage & Cut</td>
                           <td className="p-4">Emma</td>
                           <td className="p-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Upcoming</span></td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                           <td className="p-4 font-medium">May 2, 2026</td>
                           <td className="p-4">Root Touch-up</td>
                           <td className="p-4">Emma</td>
                           <td className="p-4"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">Completed</span></td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                           <td className="p-4 font-medium">March 15, 2026</td>
                           <td className="p-4">Full Highlights</td>
                           <td className="p-4">Emma</td>
                           <td className="p-4"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">Completed</span></td>
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
