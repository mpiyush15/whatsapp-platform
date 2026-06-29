'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect /forgot-password to /auth/forgot-password
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/auth/forgot-password');
  }, [router]);
  
  return null;
}
