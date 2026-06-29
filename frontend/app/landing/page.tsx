'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BookDemoModal } from '@/components/BookDemoModal'
import { ChatMockup } from '@/components/landing/ChatMockup'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import {
  features,
  industries,
  stats,
  steps,
  testimonials,
  trustBadges,
} from '@/components/landing/landing-data'

export default function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#060807]">
      <LandingNav />

      <section className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16,185,129,0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(16,185,129,0.08), transparent)',
          }}
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8">
          <div className="max-w-xl">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300"
            >
              WhatsApp Business Platform
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-landing-display text-[2.75rem] leading-[1.05] text-white sm:text-6xl lg:text-[3.5rem]"
            >
              Turn conversations into{' '}
              <span className="italic text-emerald-400">paying customers</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 text-lg leading-relaxed text-zinc-400"
            >
              Replysys unifies live chat, campaigns, automation, and CRM on WhatsApp Cloud API — so your team closes
              faster without juggling five tools.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <Link href="/auth/register">
                <Button
                  size="lg"
                  className="h-14 bg-emerald-500 px-8 text-base font-semibold text-[#060807] hover:bg-emerald-400"
                >
                  Start free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="h-14 !border-white/25 !bg-transparent px-8 !text-white hover:!bg-white/10 hover:!text-white"
                onClick={() => setDemoOpen(true)}
              >
                <Play className="mr-2 h-4 w-4 fill-current" />
                Book a demo
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="mt-12 flex flex-wrap gap-6"
            >
              {trustBadges.map((badge) => (
                <div key={badge.label} className="flex items-center gap-2 text-sm text-zinc-400">
                  <badge.icon className="h-4 w-4 text-emerald-500" />
                  {badge.label}
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2 }}
          >
            <ChatMockup />
          </motion.div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-[#0a0c0b] py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center md:text-left"
            >
              <p className="font-landing-display text-4xl text-emerald-400 md:text-5xl">{stat.value}</p>
              <p className="mt-1 text-sm text-zinc-400">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="features" className="landing-light bg-[#f7f6f3] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">Platform</p>
            <h2 className="mt-4 font-landing-display text-4xl text-[#060807] sm:text-5xl">
              Everything you need on WhatsApp
            </h2>
            <p className="mt-4 text-zinc-600">
              From first message to closed deal — one workspace for marketing, sales, and support teams.
            </p>
          </motion.div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="group rounded-2xl border border-zinc-200/80 bg-white p-8 text-[#060807] shadow-sm transition hover:border-emerald-200 hover:shadow-md"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#060807] text-emerald-400 transition group-hover:bg-emerald-600 group-hover:text-white">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-[#060807]">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{feature.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#060807] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">Team inbox</p>
              <h2 className="mt-4 font-landing-display text-4xl text-white sm:text-5xl">Your whole team, one inbox</h2>
              <p className="mt-4 leading-relaxed text-zinc-400">
                Assign conversations, collaborate in real time, and never lose context — whether you have three agents
                or three hundred.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-zinc-300">
                {['Real-time Socket.io sync', 'Tags, media, and quick replies', 'Role-based access per project'].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {item}
                    </li>
                  )
                )}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -inset-4 rounded-3xl bg-emerald-500/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80"
                  alt="Team collaborating"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060807] via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 rounded-xl border border-white/10 bg-black/50 p-4 backdrop-blur-md">
                  <p className="text-sm font-medium text-white">Avg. first response</p>
                  <p className="font-landing-display text-3xl text-emerald-400">under 2 min</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="landing-light bg-[#f7f6f3] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">How it works</p>
            <h2 className="mt-4 font-landing-display text-4xl text-[#060807] sm:text-5xl">Live in four steps</h2>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <span className="font-landing-display text-5xl text-emerald-600/40">{step.step}</span>
                <h3 className="mt-4 text-lg font-semibold text-[#060807]">{step.title}</h3>
                <p className="mt-2 text-sm text-zinc-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-[#060807] py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-landing-display text-3xl text-white sm:text-4xl">Built for your industry</h2>
          <p className="mt-3 text-zinc-400">Vertical playbooks for teams across India and Southeast Asia</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {industries.map((ind) => (
              <Link
                key={ind.name}
                href={ind.href}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-zinc-300 transition hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-white"
              >
                {ind.name}
              </Link>
            ))}
            <Link
              href="/solutions"
              className="rounded-full border border-emerald-500/40 px-5 py-2.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/10"
            >
              View all →
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#0a0c0b] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-landing-display text-4xl text-white">Trusted by growing teams</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {testimonials.map((t, i) => (
              <motion.blockquote
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-8"
              >
                <p className="font-landing-display text-xl leading-relaxed text-zinc-200">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-6">
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-sm text-zinc-400">{t.role}</p>
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-24">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(6,8,7,1) 50%, rgba(6,8,7,1) 100%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-landing-display text-4xl text-white sm:text-5xl">
            Ready to own WhatsApp as a revenue channel?
          </h2>
          <p className="mt-4 text-zinc-400">
            Join hundreds of businesses using Replysys to sell, support, and scale on the world&apos;s most trusted
            messaging app.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/auth/register">
              <Button
                size="lg"
                className="h-14 bg-emerald-500 px-10 text-base font-semibold text-[#060807] hover:bg-emerald-400"
              >
                Get started free
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="h-14 !border-white/25 !bg-transparent px-10 !text-white hover:!bg-white/10 hover:!text-white"
              >
                See pricing
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-xs text-zinc-400">
            Preview page ·{' '}
            <Link href="/" className="text-emerald-400 hover:text-emerald-300 hover:underline">
              Current homepage unchanged
            </Link>
          </p>
        </div>
      </section>

      <LandingFooter />
      <BookDemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  )
}
