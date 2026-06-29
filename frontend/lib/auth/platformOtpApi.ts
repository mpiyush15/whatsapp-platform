import { API_URL } from '@/lib/config/api';

type OtpSendResponse = {
  success?: boolean;
  message?: string;
  data?: { expiresInSeconds?: number; maskedPhone?: string };
};

type OtpVerifyLoginResponse = {
  success?: boolean;
  message?: string;
  data?: { token?: string; user?: Record<string, unknown> };
};

type OtpVerifySignupResponse = {
  success?: boolean;
  message?: string;
  data?: { phoneVerificationToken?: string; phone?: string };
};

export async function sendPlatformOtp(params: {
  phone: string;
  purpose: 'login' | 'signup';
  email?: string;
}): Promise<{ ok: boolean; message: string; expiresInSeconds?: number }> {
  const res = await fetch(`${API_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = (await res.json()) as OtpSendResponse;
  if (!res.ok || !json.success) {
    return { ok: false, message: json.message || 'Could not send OTP' };
  }
  return {
    ok: true,
    message: json.message || 'Code sent on WhatsApp',
    expiresInSeconds: json.data?.expiresInSeconds,
  };
}

export async function verifyPlatformOtpLogin(params: {
  phone: string;
  code: string;
}): Promise<{ ok: boolean; message: string; token?: string; user?: Record<string, unknown> }> {
  const res = await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, purpose: 'login' }),
  });
  const json = (await res.json()) as OtpVerifyLoginResponse;
  if (!res.ok || !json.success) {
    return { ok: false, message: json.message || 'Invalid code' };
  }
  return {
    ok: true,
    message: json.message || 'Verified',
    token: json.data?.token,
    user: json.data?.user,
  };
}

export async function verifyPlatformOtpSignup(params: {
  phone: string;
  code: string;
}): Promise<{ ok: boolean; message: string; phoneVerificationToken?: string }> {
  const res = await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, purpose: 'signup' }),
  });
  const json = (await res.json()) as OtpVerifySignupResponse;
  if (!res.ok || !json.success) {
    return { ok: false, message: json.message || 'Invalid code' };
  }
  return {
    ok: true,
    message: json.message || 'Phone verified',
    phoneVerificationToken: json.data?.phoneVerificationToken,
  };
}
