'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { redirectToDomain } from '@/lib/domain'

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/solutions', label: 'Solutions' },
]

export function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#060807]/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/landing" className="font-landing-display text-2xl tracking-tight text-white">
          replysys
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-zinc-400 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            variant="ghost"
            size="sm"
            className="!text-zinc-300 hover:!bg-white/5 hover:!text-white"
            onClick={() => redirectToDomain('app', '/auth/login')}
          >
            Log in
          </Button>
          <Link href="/auth/register">
            <Button size="sm" className="bg-emerald-500 font-semibold text-[#060807] hover:bg-emerald-400">
              Start free
            </Button>
          </Link>
        </div>

        <button
          type="button"
          className="text-zinc-300 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-white/5 bg-[#060807] px-4 py-4 md:hidden"
        >
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-zinc-300"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="outline"
                className="!border-white/20 !bg-transparent !text-white hover:!bg-white/5"
                onClick={() => {
                  setOpen(false)
                  redirectToDomain('app', '/auth/login')
                }}
              >
                Log in
              </Button>
              <Link href="/auth/register" onClick={() => setOpen(false)}>
                <Button className="w-full bg-emerald-500 text-[#060807] hover:bg-emerald-400">Start free</Button>
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </header>
  )
}
