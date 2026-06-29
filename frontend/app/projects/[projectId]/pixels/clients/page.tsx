"use client";
import React from 'react';
import { Search, MessageCircle, History, Filter } from 'lucide-react';
import Link from 'next/link';

export default function ClientsView() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="text-xl font-bold text-gray-800">Client Database</h2>
        <div className="flex gap-4">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
             <input type="text" placeholder="Search clients..." className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"/>
           </div>
           <button className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
             <Filter size={16}/> Filter
           </button>
        </div>
      </div>
      
      <table className="w-full text-left">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
            <th className="p-4 font-semibold">Client Info</th>
            <th className="p-4 font-semibold">Last Visit</th>
            <th className="p-4 font-semibold">Total Spent</th>
            <th className="p-4 font-semibold">Membership</th>
            <th className="p-4 font-semibold text-right">Quick Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm">
          <tr className="hover:bg-gray-50 transition-colors">
             <td className="p-4">
                <Link href="/dashboard/pixels/clients/CLI-101" className="font-bold text-slate-900 hover:text-green-600 hover:underline">Sarah Jenkins</Link>
                <p className="text-gray-500 mt-0.5">+1 555-0198</p>
             </td>
             <td className="p-4 text-gray-600">June 2, 2026<br/><span className="text-xs text-gray-400">Balayage & Cut</span></td>
             <td className="p-4 font-medium text-gray-800">$1,250</td>
             <td className="p-4"><span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded-full">VIP Club</span></td>
             <td className="p-4 flex justify-end gap-2">
                <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Send WhatsApp"><MessageCircle size={18}/></button>
                <Link href="/dashboard/pixels/clients/CLI-101" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg inline-block" title="View History"><History size={18}/></Link>
             </td>
          </tr>
          <tr className="hover:bg-gray-50 transition-colors">
             <td className="p-4">
                <Link href="/dashboard/pixels/clients/CLI-102" className="font-bold text-slate-900 hover:text-green-600 hover:underline">Jessica Pearson</Link>
                <p className="text-gray-500 mt-0.5">+1 555-0312</p>
             </td>
             <td className="p-4 text-gray-600">May 15, 2026<br/><span className="text-xs text-gray-400">Keratin Treatment</span></td>
             <td className="p-4 font-medium text-gray-800">$450</td>
             <td className="p-4"><span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">None</span></td>
             <td className="p-4 flex justify-end gap-2">
                <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Send WhatsApp"><MessageCircle size={18}/></button>
                <Link href="/dashboard/pixels/clients/CLI-102" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg inline-block" title="View History"><History size={18}/></Link>
             </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
