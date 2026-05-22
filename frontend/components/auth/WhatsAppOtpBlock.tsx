'use client';

import { useState } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import {
  sendPlatformOtp,
  verifyPlatformOtpLogin,
  verifyPlatformOtpSignup,
} from '@/lib/auth/platformOtpApi';

type Props = {
  phone: string;
  purpose: 'login' | 'signup';
  email?: string;
  /** When true, UI indicates verification is not required (signup only). */
  optional?: boolean;
  onSignupVerified?: (token: string) => void;
  onLoginSuccess?: (token: string, user: Record<string, unknown>) => void;
  disabled?: boolean;
};

export default function WhatsAppOtpBlock({
  phone,
  purpose,
  email,
  optional,
  onSignupVerified,
  onLoginSuccess,
  disabled,
}: Props) {
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const send = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const result = await sendPlatformOtp({
        phone,
        purpose,
        email: purpose === 'signup' ? email : undefined,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSent(true);
      setMessage(result.message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (purpose === 'signup') {
        const result = await verifyPlatformOtpSignup({ phone, code });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        if (result.phoneVerificationToken) {
          onSignupVerified?.(result.phoneVerificationToken);
          setMessage('Mobile number verified');
        }
        return;
      }

      const result = await verifyPlatformOtpLogin({ phone, code });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.token && result.user) {
        onLoginSuccess?.(result.token, result.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const digits = phone.replace(/\D/g, '');
  const canSend = digits.length >= 10 && !disabled;

  return (
    <div className="rounded-xl border border-[#25d366]/30 bg-[#25d366]/5 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-[#128c7e]">
        <MessageCircle className="h-4 w-4" />
        Verify with WhatsApp OTP
        {optional ? (
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#71717a]">
            Optional
          </span>
        ) : null}
      </p>

      {!sent ? (
        <button
          type="button"
          disabled={!canSend || loading}
          onClick={() => void send()}
          className="w-full rounded-lg bg-[#25d366] py-2.5 text-sm font-semibold text-white transition hover:bg-[#1da851] disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </span>
          ) : (
            'Send code on WhatsApp'
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-center text-lg tracking-widest"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={code.length < 4 || loading}
              onClick={() => void verify()}
              className="flex-1 rounded-lg bg-[#128c7e] py-2.5 text-sm font-semibold text-white hover:bg-[#0d6b5f] disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify code'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setSent(false);
                setCode('');
                void send();
              }}
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Resend
            </button>
          </div>
        </div>
      )}

      {message && <p className="mt-2 text-xs text-emerald-700">{message}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
