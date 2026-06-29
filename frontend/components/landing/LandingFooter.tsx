'use client'

import Link from 'next/link'
import { MessageSquare } from 'lucide-react'

export function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="landing-light border-t border-zinc-200 bg-[#f7f6f3]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/landing" className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#060807]">
                <MessageSquare className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="font-landing-display text-2xl text-[#060807]">replysys</span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-zinc-600">
              The WhatsApp Business platform for teams who sell, support, and scale on the channel customers already
              trust.
            </p>
            <p className="mt-4 text-xs text-zinc-500">A product of Pixels Digital Solutions</p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-900">Product</h4>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li>
                <Link href="#features" className="hover:text-emerald-700">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-emerald-700">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/solutions" className="hover:text-emerald-700">
                  Solutions
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-900">Company</h4>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li>
                <Link href="/about" className="hover:text-emerald-700">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-700">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-emerald-700">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-emerald-700">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-12 border-t border-zinc-200 pt-8 text-center text-xs text-zinc-500">
          © {year} Replysys. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
