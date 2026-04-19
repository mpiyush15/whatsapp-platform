'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WhatsAppCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Webhook will handle the authorization
    // Just redirect back to Settings
    console.log('✅ WhatsApp authorization complete - redirecting to Settings');
    setTimeout(() => {
      router.push('/dashboard/client/settings?tab=whatsapp&status=authorized');
    }, 1000);
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="mb-4">
          <div className="animate-spin inline-block">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Authorization Complete</h1>
        <p className="text-gray-600">Fetching your WhatsApp numbers...</p>
      </div>
    </div>
  );
}


