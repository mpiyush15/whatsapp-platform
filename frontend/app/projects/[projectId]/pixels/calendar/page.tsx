"use client";
import React, { useState } from 'react';
import { Clock, MessageCircle, Calendar as CalIcon, ChevronLeft, ChevronRight, User, Phone, CheckCircle, Clock3 } from 'lucide-react';

// Mock Data
const scheduleData = {
  '2026-06-16': [
    { id: 1, time: '10:00 AM - 11:30 AM', client: 'Sarah Jenkins', service: 'Balayage & Cut', staff: 'Emma (Stylist)', status: 'Confirmed', phone: '+1 555-0198' },
    { id: 2, time: '12:00 PM - 12:45 PM', client: 'Michael Ross', service: 'Men\'s Fade', staff: 'David (Barber)', status: 'Pending', phone: '+1 555-0245' },
    { id: 3, time: '2:00 PM - 3:00 PM', client: 'Jessica Pearson', service: 'HydraFacial', staff: 'Chloe (Esthetician)', status: 'Checked In', phone: '+1 555-0312' }
  ],
  '2026-06-17': [
    { id: 4, time: '09:00 AM - 09:30 AM', client: 'Harvey Specter', service: 'Beard Trim', staff: 'David (Barber)', status: 'Confirmed', phone: '+1 555-0488' },
    { id: 5, time: '1:00 PM - 3:00 PM', client: 'Donna Paulsen', service: 'Full Color & Style', staff: 'Emma (Stylist)', status: 'Confirmed', phone: '+1 555-0599' }
  ]
};

export default function CalendarView() {
  const [selectedDate, setSelectedDate] = useState('2026-06-16');

  const bookings = scheduleData[selectedDate as keyof typeof scheduleData] || [];

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)]">
      {/* Left Column: Mini Calendar & Date Selection */}
      <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-gray-800 flex items-center gap-2"><CalIcon size={20}/> June 2026</h2>
          <div className="flex gap-2 text-gray-500">
            <ChevronLeft size={20} className="cursor-pointer hover:text-gray-800"/>
            <ChevronRight size={20} className="cursor-pointer hover:text-gray-800"/>
          </div>
        </div>
        
        {/* Simple mock calendar grid */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-gray-500 mb-2">
          <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-sm">
           {/* Empty padding */}
           <div className="p-2 text-gray-300">31</div>
           {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(d => (
             <div key={d} className="p-2 rounded-full cursor-pointer hover:bg-gray-100 text-gray-700">{d}</div>
           ))}
           <div 
             className={`p-2 rounded-full cursor-pointer font-bold ${selectedDate === '2026-06-16' ? 'bg-green-600 text-white' : 'hover:bg-gray-100'}`}
             onClick={() => setSelectedDate('2026-06-16')}
           >16</div>
           <div 
             className={`p-2 rounded-full cursor-pointer font-bold ${selectedDate === '2026-06-17' ? 'bg-green-600 text-white' : 'hover:bg-gray-100'}`}
             onClick={() => setSelectedDate('2026-06-17')}
           >17</div>
           {[18,19,20,21,22,23,24,25,26,27,28,29,30].map(d => (
             <div key={d} className="p-2 rounded-full cursor-pointer hover:bg-gray-100 text-gray-700">{d}</div>
           ))}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
           <h3 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wider">Quick Filters</h3>
           <div className="space-y-3">
              <label className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer">
                 <input type="checkbox" defaultChecked className="rounded border-gray-300 text-green-600 focus:ring-green-600"/>
                 Emma (Stylist)
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer">
                 <input type="checkbox" defaultChecked className="rounded border-gray-300 text-green-600 focus:ring-green-600"/>
                 David (Barber)
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer">
                 <input type="checkbox" defaultChecked className="rounded border-gray-300 text-green-600 focus:ring-green-600"/>
                 Chloe (Esthetician)
              </label>
           </div>
        </div>
      </div>

      {/* Right Column: Schedule Details */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
           <h2 className="font-bold text-gray-800 text-lg">
             {selectedDate === '2026-06-16' ? 'Tuesday, June 16' : 'Wednesday, June 17'}
           </h2>
           <span className="text-sm text-gray-500 font-medium">{bookings.length} Appointments</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
           {bookings.length === 0 ? (
             <div className="text-center text-gray-400 py-20">
                <CalIcon size={48} className="mx-auto mb-4 opacity-20"/>
                <p>No appointments for this date.</p>
             </div>
           ) : (
             bookings.map(booking => (
               <div key={booking.id} className="border border-gray-100 rounded-xl p-5 hover:border-green-200 hover:shadow-md transition-all group relative overflow-hidden bg-white">
                 <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-green-500"></div>
                 <div className="flex justify-between items-start ml-2">
                    <div className="flex gap-4">
                       <div className="mt-1 bg-green-50 p-3 rounded-lg text-green-700">
                         <Clock3 size={24}/>
                       </div>
                       <div>
                         <h3 className="font-bold text-gray-900 text-lg">{booking.time}</h3>
                         <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                           <User size={14}/> <span className="font-medium text-gray-800">{booking.client}</span>
                           <span className="text-gray-300">•</span>
                           <span>{booking.service}</span>
                         </div>
                         <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                           <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-600">{booking.staff}</span>
                         </div>
                       </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-3">
                       <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 ${
                         booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                         booking.status === 'Checked In' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                       }`}>
                         {booking.status === 'Confirmed' && <CheckCircle size={12}/>}
                         {booking.status}
                       </span>
                       
                       <div className="flex items-center gap-2">
                         <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors" title="WhatsApp Message">
                           <MessageCircle size={18}/>
                         </button>
                         <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Call Client">
                           <Phone size={18}/>
                         </button>
                       </div>
                    </div>
                 </div>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  )
}
