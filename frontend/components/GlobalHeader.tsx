import React, { useEffect, useState } from 'react';
import { LogOut, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';

interface GlobalHeaderProps {
  showBack?: boolean;
}

export default function GlobalHeader({ showBack = false }: GlobalHeaderProps) {
  const router = useRouter();
  const [sessionTime, setSessionTime] = useState<string>('');

  useEffect(() => {
    const lastActivity = localStorage.getItem('replysys_last_activity');
    if (lastActivity) {
      const date = new Date(parseInt(lastActivity, 10));
      setSessionTime(date.toLocaleString('en-IN', { 
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      }));
    } else {
      setSessionTime(new Date().toLocaleString('en-IN', { 
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      }));
    }
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    router.push('/auth/login');
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          {showBack && (
            <button 
              onClick={() => router.push('/projects')}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              title="Back to Projects"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-teal-600">Replysys</span>
              <span className="text-gray-300">|</span>
              Business Workspaces
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Your WhatsApp communication partner</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Last Login</p>
            <p className="text-sm text-gray-700 font-medium">{sessionTime}</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="text-gray-500 hover:text-red-600 transition p-2 rounded-lg hover:bg-red-50 flex items-center gap-2 text-sm font-medium border border-transparent hover:border-red-100"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
