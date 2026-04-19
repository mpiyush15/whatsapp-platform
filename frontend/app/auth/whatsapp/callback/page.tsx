'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function WhatsAppCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code) {
          console.error('❌ No authorization code in callback');
          router.push('/dashboard/client/settings?error=no_code');
          return;
        }

        console.log('✅ WhatsApp OAuth callback received');
        console.log('📝 Code:', code.substring(0, 20) + '...');

        // Get the backend API URL
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
        const token = localStorage.getItem('token');

        if (!token) {
          console.error('❌ No auth token found');
          router.push('/login');
          return;
        }

        // Exchange code with backend for access token
        console.log('🔄 Exchanging code with backend...');
        const response = await fetch(`${apiUrl}/integrations/whatsapp/oauth/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ code, state }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('❌ Backend exchange failed:', error);
          router.push(`/dashboard/client/settings?error=${error.message || 'exchange_failed'}`);
          return;
        }

        const data = await response.json();
        console.log('✅ OAuth exchange successful');
        console.log('📊 Response:', data);

        // Redirect back to settings with success
        router.push('/dashboard/client/settings?whatsapp=connected');
      } catch (error) {
        console.error('❌ Callback handler error:', error);
        router.push('/dashboard/client/settings?error=callback_error');
      }
    };

    handleCallback();
  }, [searchParams, router]);

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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Connecting WhatsApp...</h1>
        <p className="text-gray-600">Please wait while we complete your WhatsApp setup</p>
      </div>
    </div>
  );
}
