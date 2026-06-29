"use client";
import React from 'react';
import { CheckCircle, MessageCircle, Award } from 'lucide-react';

export default function HomeView() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MetricCard title="Appointments Today" value="24" trend="+3 from yesterday" />
        <MetricCard title="Projected Revenue" value="₹1,450" trend="On track" highlight />
        <MetricCard title="Active Members" value="142" trend="+12 this month" />
        <MetricCard title="Waitlist" value="3 Clients" trend="1 notified via WhatsApp" />
      </div>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
         <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h2>
         <ul className="space-y-4">
            <li className="flex items-center gap-3 text-sm text-gray-600"><CheckCircle size={16} className="text-green-500"/> Sarah Jenkins confirmed her 10:00 AM appointment via WhatsApp.</li>
            <li className="flex items-center gap-3 text-sm text-gray-600"><MessageCircle size={16} className="text-blue-500"/> Intake form sent to Jessica Pearson.</li>
            <li className="flex items-center gap-3 text-sm text-gray-600"><Award size={16} className="text-purple-500"/> Michael Ross redeemed 500 Loyalty Points.</li>
         </ul>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
           <h2 className="text-lg font-bold text-gray-800">Today's Appointments</h2>
           <button className="text-sm font-medium text-green-600 hover:underline">View Full Calendar</button>
        </div>
        <table className="w-full text-left text-sm">
           <thead>
              <tr className="bg-white border-b border-gray-100 text-gray-500">
                 <th className="p-4 font-semibold">Time</th>
                 <th className="p-4 font-semibold">Client</th>
                 <th className="p-4 font-semibold">Service</th>
                 <th className="p-4 font-semibold">Staff</th>
                 <th className="p-4 font-semibold">Status</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-gray-50 text-gray-800">
              <tr className="hover:bg-gray-50 transition-colors">
                 <td className="p-4 font-medium">10:00 AM</td>
                 <td className="p-4 font-bold text-gray-900">Sarah Jenkins</td>
                 <td className="p-4 text-gray-600">Balayage & Cut</td>
                 <td className="p-4">Emma (Stylist)</td>
                 <td className="p-4"><span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-max"><CheckCircle size={12}/> Confirmed</span></td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                 <td className="p-4 font-medium">10:30 AM</td>
                 <td className="p-4 font-bold text-gray-900">Amanda Clark</td>
                 <td className="p-4 text-gray-600">HydraFacial</td>
                 <td className="p-4">Chloe (Esthetician)</td>
                 <td className="p-4"><span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-max">Checked In</span></td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                 <td className="p-4 font-medium">12:00 PM</td>
                 <td className="p-4 font-bold text-gray-900">Michael Ross</td>
                 <td className="p-4 text-gray-600">Men's Fade</td>
                 <td className="p-4">David (Barber)</td>
                 <td className="p-4"><span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-max">Pending</span></td>
              </tr>
           </tbody>
        </table>
      </div>
    </>
  )
}

function MetricCard({ title, value, trend, highlight = false }: any) {
  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border ${highlight ? 'border-l-4' : 'border-gray-200'}`} style={highlight ? { borderLeftColor: 'var(--brand)' } : {}}>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
      <p className="text-xs text-gray-400 mt-2">{trend}</p>
    </div>
  );
}
