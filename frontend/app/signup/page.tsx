'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Redirect /signup to /auth/register (keeps ?plan= & ?cycle= from pricing)
 */
export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.push(qs ? `/auth/register?${qs}` : '/auth/register');
  }, [router, searchParams]);
  
  return null;
}
