"use client"

import { useEffect, useState } from "react"
import { authService, User as UserType } from "@/lib/auth"
import { LayoutDashboard, MessageSquare, Users, Megaphone, FileText, Bot, Calendar, BarChart3, LifeBuoy } from "lucide-react"
import Link from "next/link"

export default function FeaturesPage() {
  const [user, setUser] = useState<UserType | null>(null)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    setUser(currentUser)
  }, [])

  const features = [
    {
      name: "Live Chat",
      href: "/dashboard/features/live-chat",
      icon: MessageSquare,
      description: "Real-time customer conversations",
      color: "blue"
    },
    {
      name: "Contacts",
      href: "/dashboard/features/contacts",
      icon: Users,
      description: "Manage your customer database",
      color: "green"
    },
    {
      name: "Broadcasts",
      href: "/dashboard/features/broadcasts",
      icon: Megaphone,
      description: "Send bulk messages to customers",
      color: "purple"
    },
    {
      name: "Templates",
      href: "/dashboard/features/templates",
      icon: FileText,
      description: "Create message templates",
      color: "amber"
    },
    {
      name: "Campaigns",
      href: "/dashboard/features/campaigns",
      icon: Calendar,
      description: "Run marketing campaigns",
      color: "red"
    },
    {
      name: "Chatbot",
      href: "/dashboard/features/chatbot",
      icon: Bot,
      description: "Automated customer support",
      color: "indigo"
    },
    {
      name: "Analytics",
      href: "/dashboard/features/analytics",
      icon: BarChart3,
      description: "View performance metrics",
      color: "cyan"
    },
    {
      name: "Support",
      href: "/dashboard/features/support",
      icon: LifeBuoy,
      description: "Need help? Reach support quickly",
      color: "teal"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to Dashboard</h1>
          <p className="text-xl text-gray-600">
            {user ? `Hello ${user.name}, here are your available features` : "Select a feature to get started"}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Link
                key={feature.href}
                href={feature.href}
                className="group"
              >
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 h-full hover:scale-105 cursor-pointer border-l-4 border-transparent hover:border-blue-500">
                  <div className={`w-12 h-12 rounded-lg bg-${feature.color}-100 flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 text-${feature.color}-600`} />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">{feature.name}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Coming Soon - Settings */}
        <div className="mt-12 bg-white rounded-xl shadow-md p-8 border-l-4 border-gray-400">
          <div className="flex items-center gap-4">
            <LayoutDashboard className="w-8 h-8 text-gray-400" />
            <div>
              <h3 className="font-semibold text-gray-900">Account Settings</h3>
              <p className="text-sm text-gray-600">Coming soon - Manage your account preferences</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
