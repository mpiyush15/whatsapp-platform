"use client"

import { CreditCard, DollarSign, FileText, Settings, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { authService, User as UserType } from "@/lib/auth"

export default function BillingPage() {
  const [user, setUser] = useState<UserType | null>(null)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    setUser(currentUser)
  }, [])

  const billingLinks = [
    {
      title: "View Subscription",
      description: "Check your current plan and subscription details",
      href: "/dashboard/features/subscriptions",
      icon: CreditCard,
      color: "blue"
    },
    {
      title: "Upgrade Plan",
      description: "Upgrade to a higher tier with more features",
      href: "/checkout",
      icon: ArrowRight,
      color: "green"
    },
    {
      title: "Payment Methods",
      description: "Manage your billing payment methods",
      href: "/dashboard/account",
      icon: DollarSign,
      color: "purple"
    },
    {
      title: "Billing Settings",
      description: "Configure billing preferences and email",
      href: "/dashboard/settings",
      icon: Settings,
      color: "amber"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
          <p className="text-xl text-gray-600">
            Manage your account billing and subscription information
          </p>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {billingLinks.map((link) => {
            const Icon = link.icon
            const colorMap: Record<string, Record<string, string>> = {
              blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-300' },
              green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-300' },
              purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-300' },
              amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-300' }
            }
            const colors = colorMap[link.color] || colorMap.blue

            return (
              <Link
                key={link.href}
                href={link.href}
                className="group"
              >
                <div className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 h-full hover:scale-105 cursor-pointer border-l-4 border-transparent hover:${colors.border}`}>
                  <div className={`w-12 h-12 rounded-lg ${colors.bg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">{link.title}</h3>
                  <p className="text-sm text-gray-600">{link.description}</p>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Active Subscription Card */}
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-green-600" />
              <h3 className="font-semibold text-gray-900">Active Subscription</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Your subscription keeps you connected with customers
            </p>
            <Link href="/dashboard/features/subscriptions" className="text-green-600 hover:text-green-700 font-semibold text-sm">
              View Details →
            </Link>
          </div>

          {/* Billing History Card */}
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Billing History</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Download invoices and track your payment history
            </p>
            <button className="text-blue-600 hover:text-blue-700 font-semibold text-sm cursor-not-allowed opacity-50">
              Coming Soon →
            </button>
          </div>

          {/* Upgrade Card */}
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center gap-3 mb-4">
              <ArrowRight className="w-6 h-6 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Upgrade Plan</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Need more power? Upgrade to unlock premium features
            </p>
            <Link href="/checkout" className="text-purple-600 hover:text-purple-700 font-semibold text-sm">
              Upgrade Now →
            </Link>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">When will I be charged?</h3>
              <p className="text-gray-600">
                You'll be charged on the renewal date specified in your subscription. We'll send you a reminder email before the charge.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I pause my subscription?</h3>
              <p className="text-gray-600">
                Yes! You can pause your subscription anytime from the Subscriptions page. Your data will be preserved and you can resume whenever you're ready.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What if I need to cancel?</h3>
              <p className="text-gray-600">
                You can cancel your subscription anytime. Access will continue until the end of your current billing period.
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-gray-600 mb-4">Still have questions?</p>
            <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-semibold">
              Contact our support team →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
