import { Instrument_Serif, Plus_Jakarta_Sans } from 'next/font/google'

export const landingDisplay = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-landing-display',
  display: 'swap',
})

export const landingSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-landing-sans',
  display: 'swap',
})
