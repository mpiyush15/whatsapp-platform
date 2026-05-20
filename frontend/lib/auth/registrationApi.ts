import { API_URL } from '@/lib/config/api';

type AvailabilityResponse = {
  success?: boolean;
  data?: { available?: boolean; field?: string };
  message?: string;
};

async function parseAvailability(res: Response): Promise<{ available: boolean; message: string }> {
  const json = (await res.json()) as AvailabilityResponse;
  if (!res.ok) {
    return { available: false, message: json.message || 'Could not verify' };
  }
  const available = Boolean(json.data?.available);
  return { available, message: json.message || (available ? 'Available' : 'Already in use') };
}

export async function checkEmailAvailable(email: string): Promise<{ available: boolean; message: string }> {
  const params = new URLSearchParams({ email: email.trim().toLowerCase() });
  const res = await fetch(`${API_URL}/auth/check-email?${params}`);
  return parseAvailability(res);
}

export async function checkPhoneAvailable(phone: string): Promise<{ available: boolean; message: string }> {
  const params = new URLSearchParams({ phone: phone.trim() });
  const res = await fetch(`${API_URL}/auth/check-phone?${params}`);
  return parseAvailability(res);
}

export type SignupPayload = {
  name: string;
  email: string;
  password: string;
  mobileNumber: string;
  companyName: string;
  website?: string;
  selectedPlan: string;
  billingCycle: string;
};

export type SignupResult = {
  ok: boolean;
  message?: string;
  token?: string;
  user?: unknown;
  redirectTo?: string;
};

export async function signupAccount(payload: SignupPayload): Promise<SignupResult> {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      mobileNumber: payload.mobileNumber.trim(),
      phone: payload.mobileNumber.trim(),
      companyName: payload.companyName.trim(),
      company: payload.companyName.trim(),
      website: payload.website?.trim() || '',
      selectedPlan: payload.selectedPlan,
      billingCycle: payload.billingCycle,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return { ok: false, message: data.message || 'Registration failed' };
  }

  return {
    ok: true,
    token: data.token || data.data?.token,
    user: data.user || data.data?.user,
    redirectTo: data.redirectTo || data.data?.redirectTo,
  };
}
