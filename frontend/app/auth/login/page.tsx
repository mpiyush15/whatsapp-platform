'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { login, UserRole, getPostLoginRedirect } from '@/lib/auth';
import WhatsAppOtpBlock from '@/components/auth/WhatsAppOtpBlock';
import { isAppDomain, redirectToDomain } from '@/lib/domain';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';

const ONBOARDING_STEPS = [
  {
    step: '01',
    title: 'Create your workspace',
    body: 'Set up your Replysys org and pick the plan that fits your team.',
  },
  {
    step: '02',
    title: 'Connect WhatsApp Cloud API',
    body: 'Link your Meta Business account and verify your business number.',
  },
  {
    step: '03',
    title: 'Open the team inbox',
    body: 'Assign agents, use templates, and keep every conversation in one place.',
  },
  {
    step: '04',
    title: 'Launch campaigns',
    body: 'Broadcast to opted-in lists and track delivery, reads, and replies.',
  },
] as const;

const ease = [0.22, 1, 0.36, 1] as const;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loginMode, setLoginMode] = useState<'password' | 'whatsapp'>('password');
  const [phone, setPhone] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        setSuccess(true);
        const loggedInUser = result.user;
        const requestedNext = searchParams.get('next');
        const redirectPath =
          requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')
            ? requestedNext
            : getPostLoginRedirect(loggedInUser || null);

        setTimeout(() => {
          if (loggedInUser?.type === 'internal' && loggedInUser.role === UserRole.SUPERADMIN) {
            redirectToDomain('admin', redirectPath);
            return;
          }

          if (loggedInUser?.type === 'client' || loggedInUser?.type === 'agency') {
            if (isAppDomain()) {
              router.push(redirectPath);
            } else {
              redirectToDomain('app', redirectPath);
            }
            return;
          }

          router.push(redirectPath);
        }, 1500);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-5rem)] sm:min-h-[calc(100dvh-6rem)]">
      <div className="grid min-h-[calc(100dvh-5rem)] lg:min-h-[calc(100dvh-6rem)] lg:grid-cols-2">
        {/* Left — onboarding steps banner */}
        <aside className="relative hidden overflow-hidden bg-[#0f0f10] lg:flex lg:flex-col">
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(37, 211, 102, 0.22), transparent 55%), radial-gradient(ellipse 70% 50% at 80% 80%, rgba(124, 58, 237, 0.18), transparent 50%), linear-gradient(160deg, #18181b 0%, #0a0a0b 100%)',
            }}
          />
          <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">
            <div>
              <Link href="/marketing" className="font-marketing-display text-2xl font-extrabold tracking-tight text-white">
                replysys
              </Link>
              <p className="mt-8 max-w-md text-sm font-medium uppercase tracking-[0.14em] text-white/50">
                Onboarding in four steps
              </p>
              <h2 className="mt-3 max-w-lg font-marketing-display text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
                WhatsApp ops your team can{' '}
                <span className="bg-gradient-to-r from-[#25d366] to-[#a78bfa] bg-clip-text text-transparent">
                  run on day one
                </span>
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
                Log in to continue setup — inbox, templates, and campaigns on Meta&apos;s official Cloud API.
              </p>
            </div>

            <ol className="mt-10 space-y-4">
              {ONBOARDING_STEPS.map((item, i) => (
                <motion.li
                  key={item.step}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.07, duration: 0.45, ease }}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25d366]/20 text-xs font-bold text-[#4ade80]">
                    {item.step}
                  </span>
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/55">{item.body}</p>
                  </div>
                </motion.li>
              ))}
            </ol>

            <div className="mt-10 flex items-center gap-3 text-xs text-white/45">
              <WhatsAppIcon className="h-4 w-4 text-[#25d366]" />
              <span>Official WhatsApp Business Platform · Meta Cloud API</span>
            </div>
          </div>
        </aside>

        {/* Right — glass login */}
        <section className="marketing-hero-bg relative flex flex-col items-center justify-center px-4 py-10 sm:px-8 lg:py-12">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,211,102,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(167,139,250,0.1),transparent_55%)]"
            aria-hidden
          />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="relative z-10 w-full max-w-[420px]"
          >
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <Link href="/marketing" className="font-marketing-display text-xl font-extrabold text-[#111111]">
                replysys
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/70 px-2.5 py-1 text-[10px] font-medium text-[#52525b]">
                <MessageSquare className="h-3 w-3 text-[#128c7e]" />
                Cloud API
              </span>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/45 p-8 shadow-[0_24px_80px_rgba(17,17,17,0.12)] backdrop-blur-2xl sm:p-10">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

              {success ? (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h1 className="mt-5 text-2xl font-bold text-[#111111]">You&apos;re in</h1>
                  <p className="mt-2 text-sm text-[#6d6c6b]">Redirecting to your workspace…</p>
                  <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-[#128c7e]" />
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#52525b]">
                      <Sparkles className="h-3.5 w-3.5 text-[#128c7e]" />
                      Welcome back
                    </span>
                    <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#111111] sm:text-[1.65rem]">
                      Log in to Replysys
                    </h1>
                    <p className="mt-2 text-sm text-[#6d6c6b]">Continue where you left off with your team inbox.</p>
                  </div>

                  <div className="mb-5 flex rounded-xl border border-black/[0.08] bg-white/40 p-1">
                    <button
                      type="button"
                      onClick={() => setLoginMode('password')}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                        loginMode === 'password'
                          ? 'bg-white text-[#111111] shadow-sm'
                          : 'text-[#71717a]'
                      }`}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginMode('whatsapp')}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                        loginMode === 'whatsapp'
                          ? 'bg-white text-[#111111] shadow-sm'
                          : 'text-[#71717a]'
                      }`}
                    >
                      WhatsApp OTP
                    </button>
                  </div>

                  {loginMode === 'whatsapp' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#71717a]">
                          Mobile number
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full rounded-xl border border-white/80 bg-white/50 py-3 px-4 text-sm text-[#111111] shadow-inner backdrop-blur-md focus:border-[#25d366]/50 focus:outline-none focus:ring-2 focus:ring-[#25d366]/25"
                        />
                      </div>
                      <WhatsAppOtpBlock
                        phone={phone}
                        purpose="login"
                        onLoginSuccess={(token, rawUser) => {
                          const u = rawUser as {
                            email?: string;
                            name?: string;
                            role?: string;
                            type?: string;
                            accountId?: string;
                          };
                          const user = {
                            id: u.accountId || '1',
                            email: u.email || '',
                            name: u.name || '',
                            role:
                              u.role === 'superadmin'
                                ? UserRole.SUPERADMIN
                                : u.role === 'admin'
                                  ? UserRole.ADMIN
                                  : UserRole.USER,
                            type: u.type,
                            accountId: u.accountId,
                          };
                          localStorage.setItem('token', token);
                          localStorage.setItem('isAuthenticated', 'true');
                          localStorage.setItem('user', JSON.stringify(user));
                          localStorage.setItem('replysys_last_activity', Date.now().toString());
                          setSuccess(true);
                          const requestedNext = searchParams.get('next');
                          const redirectPath =
                            requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')
                              ? requestedNext
                              : getPostLoginRedirect(user);
                          setTimeout(() => {
                            if (user.type === 'internal' && user.role === UserRole.SUPERADMIN) {
                              redirectToDomain('admin', redirectPath);
                              return;
                            }
                            if (user.type === 'client' || user.type === 'agency') {
                              if (isAppDomain()) router.push(redirectPath);
                              else redirectToDomain('app', redirectPath);
                              return;
                            }
                            router.push(redirectPath);
                          }, 1200);
                        }}
                      />
                      {error ? (
                        <div className="rounded-xl border border-red-200/80 bg-red-50/80 px-4 py-3 text-sm text-red-700">
                          {error}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                      <label htmlFor="email" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#71717a]">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a1aa]" />
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@gmail.com"
                          required
                          autoComplete="email"
                          className="w-full rounded-xl border border-white/80 bg-white/50 py-3 pl-10 pr-4 text-sm text-[#111111] shadow-inner backdrop-blur-md transition placeholder:text-[#a1a1aa] focus:border-[#25d366]/50 focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#25d366]/25"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-[#71717a]">
                          Password
                        </label>
                        <Link href="/auth/forgot-password" className="text-xs font-semibold text-[#128c7e] hover:text-[#0d6b5c]">
                          Forgot?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a1aa]" />
                        <input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          autoComplete="current-password"
                          className="w-full rounded-xl border border-white/80 bg-white/50 py-3 pl-10 pr-4 text-sm text-[#111111] shadow-inner backdrop-blur-md transition placeholder:text-[#a1a1aa] focus:border-[#25d366]/50 focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#25d366]/25"
                        />
                      </div>
                    </div>

                    {error ? (
                      <div className="rounded-xl border border-red-200/80 bg-red-50/80 px-4 py-3 text-sm text-red-700 backdrop-blur-sm">
                        {error}
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={loading}
                      className="marketing-cta-primary flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Signing in…
                        </>
                      ) : (
                        <>
                          Sign in
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                  )}

                  <p className="mt-6 text-center text-sm text-[#6d6c6b]">
                    New to Replysys?{' '}
                    <Link href="/auth/register" className="font-semibold text-[#128c7e] hover:underline">
                      Create an account
                    </Link>
                  </p>

                  <p className="mt-6 text-center text-[10px] leading-relaxed text-[#a1a1aa]">
                    By signing in you agree to our{' '}
                    <Link href="/terms" className="underline hover:text-[#52525b]">
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="underline hover:text-[#52525b]">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </>
              )}
            </div>

            {/* Mobile onboarding teaser */}
            <div className="mt-6 rounded-2xl border border-black/[0.06] bg-white/50 p-4 backdrop-blur-md lg:hidden">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#a1a1aa]">Getting started</p>
              <ul className="mt-3 space-y-2">
                {ONBOARDING_STEPS.slice(0, 2).map((s) => (
                  <li key={s.step} className="flex gap-2 text-xs text-[#52525b]">
                    <span className="font-bold text-[#128c7e]">{s.step}</span>
                    <span>{s.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
