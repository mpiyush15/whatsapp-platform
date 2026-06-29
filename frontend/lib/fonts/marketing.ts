import { DM_Sans, Inter } from 'next/font/google'

/** Jitter-style display: tight, bold geometric sans */
export const marketingDisplay = DM_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-marketing-display',
  display: 'swap',
})

/** Body UI — matches Jitter site pairing */
export const marketingSans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-marketing-sans',
  display: 'swap',
})
