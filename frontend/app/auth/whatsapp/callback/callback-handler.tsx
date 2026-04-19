'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function CallbackHandler() {
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

  return null;
}
