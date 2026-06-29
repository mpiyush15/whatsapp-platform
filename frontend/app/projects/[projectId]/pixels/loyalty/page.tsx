"use client";
import React from 'react';

export default function LoyaltyView() {
  return (
    <div className="bg-white border border-gray-200 p-8 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
           <h2 className="text-xl font-bold text-gray-800">Loyalty Points Program</h2>
           <p className="text-gray-500 text-sm mt-1">1 point earned per $1 spent.</p>
        </div>
        <button className="text-white px-4 py-2 rounded font-medium text-sm bg-gray-900 hover:bg-gray-800">Edit Rules</button>
      </div>
      <table className="w-full text-left">
        <thead>
           <tr className="border-b border-gray-200 text-sm text-gray-500">
             <th className="pb-3 font-medium">Client Name</th>
             <th className="pb-3 font-medium">Points Balance</th>
             <th className="pb-3 font-medium">Tier</th>
             <th className="pb-3 font-medium text-right">Action</th>
           </tr>
        </thead>
        <tbody className="text-sm text-gray-800">
           <tr className="border-b border-gray-50">
             <td className="py-4 font-medium">Sarah Jenkins</td>
             <td className="py-4">1,450 pts</td>
             <td className="py-4"><span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">Gold</span></td>
             <td className="py-4 text-right"><button className="text-blue-600 hover:underline">View History</button></td>
           </tr>
           <tr className="border-b border-gray-50">
             <td className="py-4 font-medium">Michael Ross</td>
             <td className="py-4">200 pts</td>
             <td className="py-4"><span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">Silver</span></td>
             <td className="py-4 text-right"><button className="text-blue-600 hover:underline">View History</button></td>
           </tr>
        </tbody>
      </table>
    </div>
  )
}
