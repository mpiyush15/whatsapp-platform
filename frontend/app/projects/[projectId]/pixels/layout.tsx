"use client";
import React, { useState } from 'react';
import { Plus, Scissors } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function PixelsLayout({ children }: { children: React.ReactNode }) {
  const [brandColor, setBrandColor] = useState('#10b981');
  const pathname = usePathname();
  
  const toggleColor = () => {
    const colors = ['#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#3b82f6'];
    setBrandColor(colors[(colors.indexOf(brandColor) + 1) % colors.length]);
  };

  const getTitle = () => {
    if (pathname.includes('calendar')) return 'Calendar';
    if (pathname.includes('clients')) return 'Clients';
    if (pathname.includes('staff')) return 'Staff & Services';
    if (pathname.includes('memberships')) return 'Memberships';
    if (pathname.includes('offers')) return 'Offers';
    if (pathname.includes('loyalty')) return 'Loyalty Points';
    return 'Home';
  }

  return (
    <div className="flex-1 flex flex-col font-sans h-full bg-gray-50" style={{ '--brand': brandColor } as React.CSSProperties}>
      <header className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-lg shadow-sm flex items-center justify-center text-white cursor-pointer hover:opacity-90 transition" style={{ backgroundColor: 'var(--brand)' }} onClick={toggleColor} title="Click to change brand color">
             <Scissors size={20} />
           </div>
           <div>
             <h1 className="text-2xl font-bold text-gray-800">{getTitle()}</h1>
             <p className="text-sm text-gray-500 mt-0.5">Pixels Salon Demo Environment</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors">
             New Client
          </button>
          <button className="flex items-center gap-2 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--brand)' }}>
            <Plus size={18} /> Book Appointment
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-8">
        {children}
      </div>
    </div>
  );
}
