'use client'

import { motion } from 'framer-motion'
import { CheckCheck, Mic, Paperclip, Smile } from 'lucide-react'

const messages = [
  { from: 'customer', text: 'Hi — I saw your ad. Is the demo available today?', delay: 0 },
  { from: 'bot', text: 'Absolutely. I can book you in for 4:30 PM. Does that work?', delay: 0.15 },
  { from: 'customer', text: 'Perfect. Please send the meeting link.', delay: 0.3 },
  { from: 'agent', text: 'Done — calendar invite sent. See you shortly!', delay: 0.45 },
]

export function ChatMockup() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-6 rounded-[2rem] bg-emerald-500/20 blur-3xl" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0f1412] shadow-2xl shadow-black/50"
      >
        <motion.div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(circle at 20% 0%, rgba(16,185,129,0.35), transparent 45%), radial-gradient(circle at 80% 100%, rgba(52,211,153,0.2), transparent 40%)',
          }}
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="absolute -right-8 top-16 h-28 w-28 rounded-full border border-emerald-400/30 bg-emerald-500/10"
          animate={{ y: [0, -12, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -left-6 bottom-24 h-20 w-20 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
          animate={{ y: [0, 10, 0], x: [0, 6, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />

        <motion.div
          className="absolute right-6 top-8 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-200 backdrop-blur-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          Lead captured · Auto-reply
        </motion.div>

        <motion.div
          className="absolute left-4 bottom-32 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 backdrop-blur-md"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1 }}
        >
          Campaign sent · 2.4k delivered
        </motion.div>

        <motion.div
          className="absolute -right-4 bottom-8 hidden h-24 w-24 overflow-hidden rounded-2xl border border-white/10 sm:block"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=200&h=200&fit=crop&q=80"
            alt=""
            className="h-full w-full object-cover opacity-80"
          />
        </motion.div>

        <motion.div
          className="absolute -left-10 top-1/3 hidden h-20 w-20 overflow-hidden rounded-full border-2 border-emerald-500/30 sm:block"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&h=160&fit=crop&q=80"
            alt=""
            className="h-full w-full object-cover"
          />
        </motion.div>

        <motion.div
          className="absolute -right-12 top-1/2 hidden h-16 w-16 overflow-hidden rounded-xl border border-white/10 md:block"
          animate={{ rotate: [0, 4, 0], y: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=128&h=128&fit=crop&q=80"
            alt=""
            className="h-full w-full object-cover opacity-90"
          />
        </motion.div>

        <motion.div
          className="absolute left-1/2 top-1/4 hidden -translate-x-1/2 rounded-full border border-emerald-400/50 bg-emerald-950/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 backdrop-blur-md lg:block"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          Live · 3 agents online
        </motion.div>

        <div className="relative border-b border-white/10 bg-[#111916]/90 px-5 py-4 backdrop-blur-md">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
              R
            </div>
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
            >
              <p className="text-sm font-semibold text-white">Replysys Inbox</p>
              <p className="text-xs text-emerald-400">Online · Automations active</p>
            </motion.div>
          </motion.div>
        </div>

        <div className="relative space-y-3 px-4 py-5">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.8 + msg.delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className={`flex ${msg.from === 'customer' ? 'justify-start' : 'justify-end'}`}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.from === 'customer'
                    ? 'rounded-tl-md bg-[#1a2420] text-zinc-200'
                    : msg.from === 'bot'
                      ? 'rounded-tr-md bg-emerald-900/80 text-emerald-50'
                      : 'rounded-tr-md bg-emerald-600 text-white'
                }`}
              >
                {msg.from === 'bot' && (
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90">
                    Flow · Auto
                  </span>
                )}
                {msg.text}
                {msg.from !== 'customer' && (
                  <span className="mt-1 flex justify-end">
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-200/80" />
                  </span>
                )}
              </motion.div>
            </motion.div>
          ))}
        </div>

        <div className="relative flex items-center gap-2 border-t border-white/10 bg-[#0c100e] px-4 py-3">
          <Smile className="h-5 w-5 text-zinc-500" />
          <Paperclip className="h-5 w-5 text-zinc-500" />
          <div className="flex-1 rounded-full bg-[#1a2420] px-4 py-2 text-xs text-zinc-500">Type a message…</div>
          <Mic className="h-5 w-5 text-emerald-500" />
        </div>
      </motion.div>
    </div>
  )
}
