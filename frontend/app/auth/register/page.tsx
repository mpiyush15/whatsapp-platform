'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
  X,
} from 'lucide-react';
import { authService } from '@/lib/auth';
import {
  checkEmailAvailable,
  checkPhoneAvailable,
  signupAccount,
} from '@/lib/auth/registrationApi';
import { fetchPublicPricingPlans, type PublicPricingPlan } from '@/lib/pricing/publicPlans';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';
import WhatsAppOtpBlock from '@/components/auth/WhatsAppOtpBlock';

const STEPS = [
  { id: 1, title: 'Your account', subtitle: 'Name, email & password' },
  { id: 2, title: 'Contact & company', subtitle: 'Phone verification & business' },
  { id: 3, title: 'Choose plan', subtitle: 'Pick billing cycle' },
  { id: 4, title: 'Review', subtitle: 'Confirm & continue' },
] as const;

const JOURNEY = [
  { n: '01', t: 'Sign up', d: 'Create your Replysys workspace in minutes.' },
  { n: '02', t: 'Verify details', d: 'We check email and phone so accounts stay unique.' },
  { n: '03', t: 'Select plan', d: 'Start with the tier that fits your team today.' },
  { n: '04', t: 'Go live', d: 'Complete payment and connect WhatsApp Cloud API.' },
] as const;

type FieldStatus = 'idle' | 'checking' | 'ok' | 'error';

function FieldHint({ status, message }: { status: FieldStatus; message?: string }) {
  if (status === 'idle' || !message) return null;
  const ok = status === 'ok';
  const checking = status === 'checking';
  return (
    <p
      className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${
        checking ? 'text-[#71717a]' : ok ? 'text-emerald-700' : 'text-red-600'
      }`}
    >
      {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {message}
    </p>
  );
}

const glassInput =
  'w-full rounded-xl border border-white/80 bg-white/50 py-3 pl-10 pr-4 text-sm text-[#111111] shadow-inner backdrop-blur-md transition placeholder:text-[#a1a1aa] focus:border-[#25d366]/50 focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#25d366]/25';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [plans, setPlans] = useState<PublicPricingPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState('');

  const [emailStatus, setEmailStatus] = useState<FieldStatus>('idle');
  const [emailMessage, setEmailMessage] = useState('');
  const [phoneStatus, setPhoneStatus] = useState<FieldStatus>('idle');
  const [phoneMessage, setPhoneMessage] = useState('');

  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    mobileNumber: '',
    companyName: '',
    website: '',
    selectedPlan: '',
    billingCycle: 'monthly' as 'monthly' | 'quarterly' | 'annual',
  });

  const patch = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
    if (key === 'email') {
      setEmailStatus('idle');
      setEmailMessage('');
    }
    if (key === 'mobileNumber') {
      setPhoneStatus('idle');
      setPhoneMessage('');
      setPhoneVerified(false);
      setPhoneVerificationToken('');
    }
  };

  useEffect(() => {
    const run = async () => {
      await new Promise((r) => setTimeout(r, 80));
      if (authService.isAuthenticated() && localStorage.getItem('token')) {
        router.push('/dashboard');
        return;
      }
      setCheckingAuth(false);
    };
    run();
  }, [router]);

  useEffect(() => {
    fetchPublicPricingPlans()
      .then((list) => {
        setPlans(list);
        if (list[0]) {
          const id = (list[0].planId || list[0].name).toLowerCase();
          setForm((f) => (f.selectedPlan ? f : { ...f, selectedPlan: id }));
        }
      })
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, []);

  const runEmailCheck = useCallback(async (email: string) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus('error');
      setEmailMessage('Enter a valid email');
      return false;
    }
    setEmailStatus('checking');
    setEmailMessage('Checking availability…');
    const { available, message } = await checkEmailAvailable(email);
    setEmailStatus(available ? 'ok' : 'error');
    setEmailMessage(message);
    return available;
  }, []);

  const runPhoneCheck = useCallback(async (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setPhoneStatus('error');
      setPhoneMessage('Enter at least 10 digits');
      return false;
    }
    setPhoneStatus('checking');
    setPhoneMessage('Checking availability…');
    const { available, message } = await checkPhoneAvailable(phone);
    setPhoneStatus(available ? 'ok' : 'error');
    setPhoneMessage(message);
    return available;
  }, []);

  useEffect(() => {
    if (emailTimer.current) clearTimeout(emailTimer.current);
    if (!form.email.trim()) {
      setEmailStatus('idle');
      setEmailMessage('');
      return;
    }
    emailTimer.current = setTimeout(() => {
      void runEmailCheck(form.email);
    }, 550);
    return () => {
      if (emailTimer.current) clearTimeout(emailTimer.current);
    };
  }, [form.email, runEmailCheck]);

  useEffect(() => {
    if (phoneTimer.current) clearTimeout(phoneTimer.current);
    if (!form.mobileNumber.trim()) {
      setPhoneStatus('idle');
      setPhoneMessage('');
      return;
    }
    phoneTimer.current = setTimeout(() => {
      void runPhoneCheck(form.mobileNumber);
    }, 550);
    return () => {
      if (phoneTimer.current) clearTimeout(phoneTimer.current);
    };
  }, [form.mobileNumber, runPhoneCheck]);

  const validateStep = async (s: number): Promise<boolean> => {
    if (s === 1) {
      if (!form.name.trim()) {
        setError('Full name is required');
        return false;
      }
      if (!form.email.trim()) {
        setError('Email is required');
        return false;
      }
      if (form.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      const emailOk = emailStatus === 'ok' ? true : await runEmailCheck(form.email);
      if (!emailOk) {
        setError('Use an email that is not already registered');
        return false;
      }
      return true;
    }
    if (s === 2) {
      if (!form.mobileNumber.trim()) {
        setError('Mobile number is required');
        return false;
      }
      if (!form.companyName.trim()) {
        setError('Company name is required');
        return false;
      }
      const phoneOk = phoneStatus === 'ok' ? true : await runPhoneCheck(form.mobileNumber);
      if (!phoneOk) {
        setError('Use a phone number that is not already registered');
        return false;
      }
      if (!phoneVerified || !phoneVerificationToken) {
        setError('Verify your mobile number with the WhatsApp code');
        return false;
      }
      return true;
    }
    if (s === 3) {
      if (!form.selectedPlan) {
        setError('Please select a plan');
        return false;
      }
      return true;
    }
    if (s === 4) {
      if (!agreed) {
        setError('Please accept the terms to continue');
        return false;
      }
      return true;
    }
    return true;
  };

  const next = async () => {
    setError(null);
    const ok = await validateStep(step);
    if (!ok) return;
    setStep((s) => Math.min(4, s + 1));
  };

  const back = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const submit = async () => {
    setError(null);
    if (!(await validateStep(4))) return;

    setLoading(true);
    try {
      const result = await signupAccount({ ...form, phoneVerificationToken });
      if (!result.ok) {
        setError(result.message || 'Registration failed');
        return;
      }
      setSuccess(true);
      if (result.token) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('isAuthenticated', 'true');
        if (result.user) localStorage.setItem('user', JSON.stringify(result.user));
      }
      setTimeout(() => {
        const base =
          result.redirectTo ||
          `/checkout?plan=${encodeURIComponent(form.selectedPlan)}`;
        const url = base.includes('cycle=')
          ? base
          : `${base}${base.includes('?') ? '&' : '?'}cycle=${form.billingCycle}`;
        router.push(url);
      }, 1200);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#128c7e]" />
      </div>
    );
  }

  const selectedPlanObj = plans.find(
    (p) => (p.planId || p.name).toLowerCase() === form.selectedPlan.toLowerCase(),
  );

  return (
    <div className="min-h-[calc(100dvh-5rem)] sm:min-h-[calc(100dvh-6rem)]">
      <div className="grid min-h-[calc(100dvh-5rem)] lg:min-h-[calc(100dvh-6rem)] lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-[#0f0f10] lg:flex lg:flex-col">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 55% at 30% 15%, rgba(37,211,102,0.2), transparent 50%), radial-gradient(ellipse 60% 45% at 85% 75%, rgba(167,139,250,0.16), transparent 50%), linear-gradient(165deg,#1a1a1e,#09090b)',
            }}
          />
          <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-12">
            <div>
              <Link href="/marketing" className="font-marketing-display text-2xl font-extrabold text-white">
                replysys
              </Link>
              <h2 className="mt-10 max-w-md font-marketing-display text-3xl font-bold text-white xl:text-[2rem]">
                Start your WhatsApp workspace
              </h2>
              <p className="mt-3 max-w-sm text-sm text-white/55">
                Four quick steps — we verify email and phone so every account stays clean.
              </p>
            </div>
            <ol className="space-y-3">
              {JOURNEY.map((j, i) => (
                <li
                  key={j.n}
                  className={`flex gap-3 rounded-xl border p-3.5 transition ${
                    step > i
                      ? 'border-[#25d366]/30 bg-[#25d366]/10'
                      : step === i + 1
                        ? 'border-white/20 bg-white/10'
                        : 'border-white/5 bg-white/[0.03]'
                  }`}
                >
                  <span className="text-xs font-bold text-[#4ade80]">{j.n}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{j.t}</p>
                    <p className="text-xs text-white/50">{j.d}</p>
                  </div>
                  {step > i ? <Check className="ml-auto h-4 w-4 text-[#4ade80]" /> : null}
                </li>
              ))}
            </ol>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <WhatsAppIcon className="h-4 w-4 text-[#25d366]" />
              Meta Cloud API · Official WhatsApp Business Platform
            </div>
          </div>
        </aside>

        <section className="marketing-hero-bg relative flex flex-col px-4 py-8 sm:px-8 lg:justify-center lg:py-10">
          <div className="relative z-10 mx-auto w-full max-w-[440px]">
            <div className="mb-5 lg:hidden">
              <div className="flex gap-1">
                {STEPS.map((s) => (
                  <div
                    key={s.id}
                    className={`h-1 flex-1 rounded-full transition ${step >= s.id ? 'bg-[#128c7e]' : 'bg-black/10'}`}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#71717a]">
                Step {step} of 4 · {STEPS[step - 1].title}
              </p>
            </div>

            <div className="hidden gap-2 lg:flex lg:mb-6">
              {STEPS.map((s) => (
                <div
                  key={s.id}
                  className={`flex-1 rounded-lg border px-2 py-2 text-center text-[10px] font-semibold ${
                    step === s.id
                      ? 'border-[#128c7e]/40 bg-white/80 text-[#128c7e]'
                      : step > s.id
                        ? 'border-emerald-200/60 bg-emerald-50/50 text-emerald-800'
                        : 'border-black/[0.06] bg-white/40 text-[#a1a1aa]'
                  }`}
                >
                  {s.id}. {s.title}
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/45 p-7 shadow-[0_24px_80px_rgba(17,17,17,0.1)] backdrop-blur-2xl sm:p-9">
              {success ? (
                <div className="py-10 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                  <h1 className="mt-4 text-xl font-bold text-[#111111]">Account created</h1>
                  <p className="mt-2 text-sm text-[#6d6c6b]">Taking you to checkout…</p>
                  <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-[#128c7e]" />
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-[#111111] sm:text-2xl">{STEPS[step - 1].title}</h1>
                  <p className="mt-1 text-sm text-[#6d6c6b]">{STEPS[step - 1].subtitle}</p>

                  {error ? (
                    <div className="mt-4 rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-2.5 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.2 }}
                      className="mt-6 space-y-4"
                    >
                      {step === 1 ? (
                        <>
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#71717a]">
                              Full name
                            </label>
                            <div className="relative">
                              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a1aa]" />
                              <input
                                className={glassInput}
                                value={form.name}
                                onChange={(e) => patch('name', e.target.value)}
                                placeholder="Your name"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#71717a]">
                              Email
                            </label>
                            <div className="relative">
                              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a1aa]" />
                              <input
                                type="email"
                                className={glassInput}
                                value={form.email}
                                onChange={(e) => patch('email', e.target.value)}
                                onBlur={() => void runEmailCheck(form.email)}
                                placeholder="you@gmail.com"
                                autoComplete="email"
                              />
                            </div>
                            <FieldHint status={emailStatus} message={emailMessage} />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#71717a]">
                              Password
                            </label>
                            <div className="relative">
                              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a1aa]" />
                              <input
                                type="password"
                                className={glassInput}
                                value={form.password}
                                onChange={(e) => patch('password', e.target.value)}
                                placeholder="Min. 6 characters"
                                autoComplete="new-password"
                              />
                            </div>
                          </div>
                        </>
                      ) : null}

                      {step === 2 ? (
                        <>
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#71717a]">
                              Mobile number
                            </label>
                            <div className="relative">
                              <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a1aa]" />
                              <input
                                type="tel"
                                className={glassInput}
                                value={form.mobileNumber}
                                onChange={(e) => patch('mobileNumber', e.target.value)}
                                onBlur={() => void runPhoneCheck(form.mobileNumber)}
                                placeholder="+91 98765 43210"
                                autoComplete="tel"
                              />
                            </div>
                            <FieldHint status={phoneStatus} message={phoneMessage} />
                          </div>
                          {phoneStatus === 'ok' ? (
                            <WhatsAppOtpBlock
                              phone={form.mobileNumber}
                              purpose="signup"
                              email={form.email}
                              disabled={phoneStatus !== 'ok'}
                              onSignupVerified={(token) => {
                                setPhoneVerificationToken(token);
                                setPhoneVerified(true);
                                setError(null);
                              }}
                            />
                          ) : null}
                          {phoneVerified ? (
                            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                              <Check className="h-3.5 w-3.5" />
                              WhatsApp number verified
                            </p>
                          ) : null}
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#71717a]">
                              Company name
                            </label>
                            <div className="relative">
                              <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a1aa]" />
                              <input
                                className={glassInput}
                                value={form.companyName}
                                onChange={(e) => patch('companyName', e.target.value)}
                                placeholder="Your business"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#71717a]">
                              Website <span className="font-normal normal-case text-[#a1a1aa]">(optional)</span>
                            </label>
                            <input
                              type="url"
                              className={`${glassInput} pl-4`}
                              value={form.website}
                              onChange={(e) => patch('website', e.target.value)}
                              placeholder="https://"
                            />
                          </div>
                        </>
                      ) : null}

                      {step === 3 ? (
                        <>
                          {plansLoading ? (
                            <div className="flex justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin text-[#128c7e]" />
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {plans.map((plan) => {
                                const pid = (plan.planId || plan.name).toLowerCase();
                                const active = form.selectedPlan === pid;
                                return (
                                  <button
                                    key={plan._id}
                                    type="button"
                                    onClick={() => patch('selectedPlan', pid)}
                                    className={`rounded-xl border p-3 text-left transition ${
                                      active
                                        ? 'border-[#128c7e] bg-emerald-50/80 ring-2 ring-[#25d366]/20'
                                        : 'border-black/[0.08] bg-white/50 hover:border-black/[0.12]'
                                    }`}
                                  >
                                    <p className="text-sm font-bold text-[#111111]">{plan.name}</p>
                                    <p className="mt-0.5 text-xs text-[#6d6c6b]">
                                      ₹{plan.monthlyPrice.toLocaleString('en-IN')}/mo
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-2 pt-2">
                            {(['monthly', 'quarterly', 'annual'] as const).map((cycle) => (
                              <button
                                key={cycle}
                                type="button"
                                onClick={() => patch('billingCycle', cycle)}
                                className={`rounded-lg border py-2 text-xs font-semibold capitalize ${
                                  form.billingCycle === cycle
                                    ? 'border-[#128c7e] bg-emerald-50 text-[#128c7e]'
                                    : 'border-black/[0.08] bg-white/50 text-[#52525b]'
                                }`}
                              >
                                {cycle}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : null}

                      {step === 4 ? (
                        <div className="space-y-3 rounded-xl border border-black/[0.06] bg-white/50 p-4 text-sm">
                          <p>
                            <span className="text-[#71717a]">Name</span> · {form.name}
                          </p>
                          <p>
                            <span className="text-[#71717a]">Email</span> · {form.email}
                          </p>
                          <p>
                            <span className="text-[#71717a]">Phone</span> · {form.mobileNumber}
                          </p>
                          <p>
                            <span className="text-[#71717a]">Company</span> · {form.companyName}
                          </p>
                          <p>
                            <span className="text-[#71717a]">Plan</span> · {selectedPlanObj?.name || form.selectedPlan}{' '}
                            ({form.billingCycle})
                          </p>
                          <label className="mt-4 flex cursor-pointer items-start gap-2">
                            <input
                              type="checkbox"
                              checked={agreed}
                              onChange={(e) => {
                                setAgreed(e.target.checked);
                                setError(null);
                              }}
                              className="mt-0.5 rounded border-gray-300"
                            />
                            <span className="text-xs leading-relaxed text-[#52525b]">
                              I agree to the{' '}
                              <Link href="/terms" className="font-semibold text-[#128c7e] underline">
                                Terms
                              </Link>{' '}
                              and{' '}
                              <Link href="/privacy" className="font-semibold text-[#128c7e] underline">
                                Privacy Policy
                              </Link>
                              .
                            </span>
                          </label>
                        </div>
                      ) : null}
                    </motion.div>
                  </AnimatePresence>

                  <div className="mt-8 flex gap-3">
                    {step > 1 ? (
                      <button
                        type="button"
                        onClick={back}
                        disabled={loading}
                        className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-black/[0.08] bg-white/60 py-3 text-sm font-semibold text-[#52525b]"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </button>
                    ) : null}
                    {step < 4 ? (
                      <button
                        type="button"
                        onClick={() => void next()}
                        disabled={loading || emailStatus === 'checking' || phoneStatus === 'checking'}
                        className="marketing-cta-primary flex flex-[2] items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
                      >
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void submit()}
                        disabled={loading}
                        className="marketing-cta-primary flex flex-[2] items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating…
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            Create & pay
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <p className="mt-6 text-center text-sm text-[#6d6c6b]">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="font-semibold text-[#128c7e] hover:underline">
                      Log in
                    </Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
