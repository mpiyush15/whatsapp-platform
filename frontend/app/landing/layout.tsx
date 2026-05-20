import { landingDisplay, landingSans } from '@/lib/fonts/landing'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Replysys — Turn WhatsApp Into Your Growth Engine',
  description:
    'Live inbox, campaigns, chatbots, and analytics on WhatsApp Business API. Built for teams that sell, support, and scale.',
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`landing-root ${landingDisplay.variable} ${landingSans.variable} font-landing antialiased`}
    >
      {children}
    </div>
  )
}
