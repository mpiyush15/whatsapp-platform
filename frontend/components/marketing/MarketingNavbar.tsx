'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Menu, X } from 'lucide-react';
import {
  marketingMegaMenus,
  marketingSimpleNav,
  type MegaMenuConfig,
} from '@/components/marketing/marketing-nav-data';
import { authService, type User } from '@/lib/auth';

const CLOSE_DELAY_MS = 180;
const SCROLL_THRESHOLD = 72;

/** Solid light grey navbar canvas — 100% opacity */
const NAV_CANVAS =
  'border border-zinc-200 bg-zinc-100 shadow-[0_8px_32px_rgba(24,24,27,0.08)]';
const MEGA_CANVAS =
  'border border-zinc-200 bg-zinc-100 shadow-lg';

function MegaMenuPanel({
  menu,
  onNavigate,
}: {
  menu: MegaMenuConfig;
  onNavigate?: () => void;
}) {
  return (
    <div className="grid gap-8 p-6 sm:grid-cols-2 lg:grid-cols-3 lg:p-8">
      <div className="col-span-full flex items-center justify-between border-b border-[#e4e4e7]/60 pb-4 sm:col-span-2 lg:col-span-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a1a1aa]">{menu.label}</p>
        <Link
          href={menu.href}
          onClick={onNavigate}
          className="text-[12px] font-semibold text-[#52525b] transition hover:text-[#111111]"
        >
          View all →
        </Link>
      </div>
      {menu.sections.map((section) => (
        <div key={section.heading}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a1a1aa]">
            {section.heading}
          </p>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className="group flex w-full gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/60"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e4e4e7]/80 bg-white/70 text-[#71717a] shadow-sm backdrop-blur-sm transition group-hover:border-[#d4d4d8] group-hover:text-[#52525b]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 pt-0.5">
                      <span className="block text-[14px] font-medium tracking-[-0.02em] text-[#27272a] group-hover:text-[#111111]">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-[#a1a1aa] group-hover:text-[#71717a]">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
function dashboardHref(user: User): string {
  if (user.type === 'internal') return '/dashboard/superadmin';
  return '/dashboard';
}

export function MarketingNavbar() {
  const [desktopMega, setDesktopMega] = useState<string | null>(null);
  const [mobileMega, setMobileMega] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navZoneRef = useRef<HTMLDivElement>(null);
  const activeMega = marketingMegaMenus.find((m) => m.id === desktopMega) ?? null;

  useEffect(() => {
    try {
      setUser(authService.getCurrentUser());
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleDesktopClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setDesktopMega(null), CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const openDesktopMega = useCallback(
    (id: string) => {
      clearCloseTimer();
      setDesktopMega(id);
    },
    [clearCloseTimer]
  );

  const closeDesktopMega = useCallback(() => {
    clearCloseTimer();
    setDesktopMega(null);
  }, [clearCloseTimer]);

  const toggleMobileMenu = useCallback(() => {
    setMobileOpen((open) => {
      if (open) setMobileMega(null);
      return !open;
    });
  }, []);

  const toggleMobileMega = useCallback((id: string) => {
    setMobileMega((current) => (current === id ? null : id));
  }, []);

  return (
    <header className="marketing-nav-shell pointer-events-none fixed left-0 right-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      <div
        ref={navZoneRef}
        className="pointer-events-auto relative mx-auto w-full transition-[max-width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ maxWidth: scrolled ? '52rem' : '72rem' }}
        onMouseLeave={scheduleDesktopClose}
      >
        <div
          className={`marketing-nav-bar-shell ${NAV_CANVAS} ${scrolled ? 'rounded-2xl' : 'rounded-xl'}`}
        >
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 sm:h-14 sm:px-1">
            <Link
              href="/marketing"
              className="font-marketing-display shrink-0 pl-4 text-xl font-extrabold tracking-[-0.04em] text-teal-900 transition-colors hover:text-teal-800 sm:pl-5 sm:text-2xl"
            >
              replysys
            </Link>

            <nav className="hidden min-w-0 flex-1 items-center justify-center md:flex">
              {marketingSimpleNav.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onMouseEnter={closeDesktopMega}
                  className="rounded-lg px-3 py-2 text-[14px] font-medium tracking-[-0.02em] text-[#52525b] transition-colors hover:bg-white/50 hover:text-[#18181b]"
                >
                  {item.label}
                </Link>
              ))}

              <div className="flex items-center" onMouseEnter={clearCloseTimer}>
                {marketingMegaMenus.map((menu) => {
                  const navClass = `inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[14px] font-medium tracking-[-0.02em] transition-colors duration-150 ${
                    desktopMega === menu.id
                      ? 'bg-white/70 text-[#18181b]'
                      : 'text-[#52525b] hover:bg-white/50 hover:text-[#18181b]'
                  }`;
                  const chevron = (
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-[#a1a1aa] transition-transform duration-200 ${
                        desktopMega === menu.id ? 'rotate-180' : ''
                      }`}
                    />
                  );

                  return (
                    <Link
                      key={menu.id}
                      href={menu.href}
                      onMouseEnter={() => openDesktopMega(menu.id)}
                      className={navClass}
                    >
                      {menu.label}
                      {chevron}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              {user ? (
                <Link
                  href={dashboardHref(user)}
                  className="marketing-cta-primary rounded-lg px-3.5 py-2 text-sm font-medium"
                >
                  Open app
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="rounded-lg border border-emerald-700 bg-white/50 px-3.5 py-2 text-sm font-medium text-emerald-700 shadow-sm backdrop-blur-sm transition hover:bg-emerald-50"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth/register"
                    className="rounded-lg bg-emerald-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>

            <button
              type="button"
              className="shrink-0 rounded-lg p-2 text-[#52525b] md:hidden"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {activeMega ? (
              <motion.div
                key="mega-dropdown"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="marketing-mega-dropdown absolute left-0 right-0 top-full z-50 hidden pt-2 md:block"
                onMouseEnter={clearCloseTimer}
              >
                <div className={`${MEGA_CANVAS} overflow-hidden rounded-xl`}>
                  <motion.div
                    key={activeMega.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.12 }}
                  >
                    <MegaMenuPanel menu={activeMega} />
                  </motion.div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatePresence initial={false}>
          {mobileOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={`${NAV_CANVAS} pointer-events-auto mt-2 overflow-hidden rounded-2xl md:hidden`}
            >
                            <div className="space-y-1 p-3">
                {marketingSimpleNav.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => {
                      setMobileMega(null);
                      setMobileOpen(false);
                    }}
                    className="block w-full rounded-lg px-3 py-2.5 text-left text-[15px] font-medium text-[#3f3f46]"
                  >
                    {item.label}
                  </Link>
                ))}
                {marketingMegaMenus.map((menu) => (
                  <motion.div key={menu.id}>
                    <button
                      type="button"
                      onClick={() => toggleMobileMega(menu.id)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[15px] font-medium text-[#3f3f46]"
                      aria-expanded={mobileMega === menu.id}
                    >
                      {menu.label}
                      <ChevronDown
                        className={`h-4 w-4 text-[#a1a1aa] transition-transform duration-200 ${
                          mobileMega === menu.id ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {mobileMega === menu.id ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className={`${MEGA_CANVAS} mt-1 rounded-lg`}>
                            <MegaMenuPanel
                              menu={menu}
                              onNavigate={() => {
                                setMobileMega(null);
                                setMobileOpen(false);
                              }}
                            />
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.div>
                ))}
                <div className="flex flex-col gap-2 border-t border-[#e4e4e7]/50 pt-3">
                  {user ? (
                    <Link
                      href={dashboardHref(user)}
                      onClick={() => setMobileOpen(false)}
                      className="marketing-cta-primary py-2.5 text-center text-sm font-medium"
                    >
                      Open app
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/auth/login"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-lg border border-emerald-700 bg-white/60 py-2.5 text-center text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                      >
                        Log in
                      </Link>
                      <Link
                        href="/auth/register"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-lg bg-emerald-700 py-2.5 text-center text-sm font-medium text-white transition hover:bg-emerald-800"
                      >
                        Sign up
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
}
