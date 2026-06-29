'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Extract code immediately - don't wait
    const code = searchParams?.get('code');
    const state = searchParams?.get('state');

    if (!code) {
      console.error('❌ No code in URL');
      return;
    }

    console.log('⚡ CODE RECEIVED - EXCHANGING IMMEDIATELY');

    // Exchange code ASAP - no delays
    const exchange = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
        const token = localStorage.getItem('token');

        if (!token) {
          router.push('/login');
          return;
        }

        console.log('📤 Posting code to backend NOW');
        const response = await fetch(`${apiUrl}/integrations/whatsapp/oauth/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ code, state }),
        });

        console.log('✅ Backend response:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ OAuth success:', data);
          router.push('/dashboard?whatsapp=connected');
        } else {
          const error = await response.json();
          console.error('❌ Backend error:', error);
          router.push(`/dashboard?error=${error.message || 'exchange_failed'}`);
        }
      } catch (error) {
        console.error('❌ Error:', error);
        router.push('/dashboard?error=callback_error');
      }
    };

    exchange();
  }, [searchParams, router]);

  return null;
}
