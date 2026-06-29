"use client";
import React from 'react';
import { Scissors, Star, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function StaffView() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Staff Card 1 */}
         <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden text-center p-6 relative">
            <div className="absolute top-4 right-4 bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">Clocked In</div>
            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center text-gray-400">
               <Scissors size={32}/>
            </div>
            <Link href="/dashboard/pixels/staff/DOC-1" className="text-xl font-bold text-gray-900 hover:text-green-600 hover:underline block">Emma Smith</Link>
            <p className="text-gray-500 text-sm mt-1">Senior Stylist</p>
            
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
               <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Utilization</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">85%</p>
               </div>
               <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Avg Rating</p>
                  <p className="text-lg font-bold text-gray-800 mt-1 flex justify-center items-center gap-1">4.9 <Star size={16} className="text-yellow-400 fill-yellow-400"/></p>
               </div>
            </div>
         </div>

         {/* Staff Card 2 */}
         <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden text-center p-6 relative">
            <div className="absolute top-4 right-4 bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">Off Today</div>
            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center text-gray-400">
               <Scissors size={32}/>
            </div>
            <Link href="/dashboard/pixels/staff/DOC-2" className="text-xl font-bold text-gray-900 hover:text-green-600 hover:underline block">David Chen</Link>
            <p className="text-gray-500 text-sm mt-1">Master Barber</p>
            
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
               <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Utilization</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">92%</p>
               </div>
               <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Avg Rating</p>
                  <p className="text-lg font-bold text-gray-800 mt-1 flex justify-center items-center gap-1">5.0 <Star size={16} className="text-yellow-400 fill-yellow-400"/></p>
               </div>
            </div>
         </div>
         
         {/* Staff Card 3 */}
         <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden text-center p-6 relative">
            <div className="absolute top-4 right-4 bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">Clocked In</div>
            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center text-gray-400">
               <Scissors size={32}/>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Chloe Davis</h3>
            <p className="text-gray-500 text-sm mt-1">Esthetician</p>
            
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
               <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Utilization</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">65%</p>
               </div>
               <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Avg Rating</p>
                  <p className="text-lg font-bold text-gray-800 mt-1 flex justify-center items-center gap-1">4.8 <Star size={16} className="text-yellow-400 fill-yellow-400"/></p>
               </div>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
           <h2 className="text-lg font-bold text-gray-800">Staff Attendance & Timesheets</h2>
           <button className="text-sm font-medium text-blue-600 hover:underline">Export Payroll Log</button>
        </div>
        <table className="w-full text-left text-sm">
           <thead>
              <tr className="bg-white border-b border-gray-100 text-gray-500">
                 <th className="p-4 font-semibold">Staff Member</th>
                 <th className="p-4 font-semibold">Date</th>
                 <th className="p-4 font-semibold">Clock In</th>
                 <th className="p-4 font-semibold">Clock Out</th>
                 <th className="p-4 font-semibold">Status</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-gray-50 text-gray-800">
              <tr className="hover:bg-gray-50 transition-colors">
                 <td className="p-4 font-bold text-gray-900">Emma Smith</td>
                 <td className="p-4 text-gray-600">Today, June 16</td>
                 <td className="p-4 text-gray-600">8:55 AM</td>
                 <td className="p-4 text-gray-400">--</td>
                 <td className="p-4"><span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-max"><CheckCircle size={12}/> On Time</span></td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                 <td className="p-4 font-bold text-gray-900">Chloe Davis</td>
                 <td className="p-4 text-gray-600">Today, June 16</td>
                 <td className="p-4 text-gray-600">9:15 AM</td>
                 <td className="p-4 text-gray-400">--</td>
                 <td className="p-4"><span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-max"><AlertTriangle size={12}/> Late (15m)</span></td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                 <td className="p-4 font-bold text-gray-900">David Chen</td>
                 <td className="p-4 text-gray-600">Yesterday, June 15</td>
                 <td className="p-4 text-gray-600">9:00 AM</td>
                 <td className="p-4 text-gray-600">5:30 PM</td>
                 <td className="p-4"><span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-max"><Clock size={12}/> Completed Shift</span></td>
              </tr>
           </tbody>
        </table>
      </div>
    </div>
  )
}
