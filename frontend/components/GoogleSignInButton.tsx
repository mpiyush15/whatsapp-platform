'use client';

import { useCallback, useState } from 'react';
import { GoogleCredentialResponse, CredentialResponse } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { ErrorToast } from './ErrorToast';

interface GoogleSignInProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function GoogleSignInButton({ onSuccess, onError }: GoogleSignInProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const router = useRouter();

  const handleGoogleLogin = useCallback(async (credentialResponse: CredentialResponse) => {
    try {
      setIsLoading(true);

      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }

      // Send credential to backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/google/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            credential: credentialResponse.credential,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Google login failed');
      }

      // Store token and user info
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify(data.user));

        console.log('✅ Google login successful');
        onSuccess?.();
        
        // Redirect to dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google login failed';
      console.error('Google login error:', errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [router, onSuccess, onError]);

  const handleError = () => {
    const errorMessage = 'Google login failed';
    console.error(errorMessage);
    onError?.(errorMessage);
  };

  // Note: This component requires GoogleOAuthProvider wrapper in your layout
  // Import from '@react-oauth/google'
  return (
    <>
      {/* This will be rendered by GoogleOAuthProvider's GoogleLogin component */}
      {/* See the updated login page for implementation details */}
    </>
  );
}
