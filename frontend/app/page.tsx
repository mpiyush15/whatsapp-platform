"use client"

import {
  MessageSquare,
  ArrowRight,
  Check,
  Zap,
  TrendingUp,
  Users,
  BarChart3,
  Target,
  Clock,
  Shield,
  Sparkles,
  HeadphonesIcon,
  ChevronRight,
  MessageCircle,
  Bot,
  LineChart,
  Workflow,
  Lock,
  Headphones,
} from "lucide-react"
import { PlanAgreementModal } from "@/components/PlanAgreementModal"
import { BookDemoModal } from "@/components/BookDemoModal"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { API_URL } from "@/lib/config/api"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import { getJWT } from "@/lib/auth"

// Landing page - WhatsApp Platform
export default function LandingPage() {
  const router = useRouter()
  const [pricingPlans, setPricingPlans] = useState<any[]>([])
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)
  const [showAgreementModal, setShowAgreementModal] = useState(false)
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [selectedPlanName, setSelectedPlanName] = useState<string>("")
  const [activeUseCase, setActiveUseCase] = useState<"marketing" | "sales" | "support">("marketing")
  const [selectedChat, setSelectedChat] = useState(0)
  const [selectedProblem, setSelectedProblem] = useState(0)

  // Note: Removed auto-redirect for logged-in users
  // Users can now browse public pages and navigate to dashboard via navbar
  
  const fallbackPlans = [
    {
      planId: "starter",
      name: "Starter",
      description: "Perfect for getting started",
      monthlyPrice: 2499,
      setupFee: 3000,
      isPopular: false,
      features: {
        included: [
          "1 WhatsApp Number",
          "Broadcast Messaging",
          "Basic Chatbot",
          "Live Chat Dashboard",
          "3 Team Agents",
          "Contact Management",
          "Basic Analytics",
          "Email Notifications",
          "Payment Link Support",
          "Standard Support",
        ],
        excluded: [
          "Advanced Chatbot Flows",
          "Campaign Automation",
          "Webhook Support",
        ],
      },
    },
    {
      planId: "pro",
      name: "Pro",
      description: "For scaling businesses",
      monthlyPrice: 4999,
      setupFee: 3000,
      isPopular: true,
      features: {
        included: [
          "3 WhatsApp Numbers",
          "Everything in Starter",
          "Advanced Chatbot",
          "Campaign Automation",
          "10 Team Agents",
          "Scheduled Broadcasting",
          "Advanced Analytics",
          "SMS Gateway Integration",
          "Webhook Support",
          "Priority Support 24/7",
          "Agent Routing & Tagging",
        ],
        excluded: [],
      },
    },
  ]

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setIsLoadingPlans(true)
        console.log('📡 Fetching pricing plans from:', `${API_URL}/pricing/plans/public`)
        const res = await fetch(`${API_URL}/pricing/plans/public`, {
          cache: 'no-store'
        })
        console.log('📥 Response status:', res.status)
        if (res.ok) {
          const data = await res.json()
          console.log('📥 Plans data:', data)
          // Handle nested response: { success, data: { data: [...], count: X } }
          const plans = data?.data?.data || data?.data || []
          if (plans?.length) {
            console.log('✅ Found', plans.length, 'plans')
            setPricingPlans(plans.map((p: any) => ({ ...p, setupFee: p.setupFee || 3000 })))
          } else {
            console.log('⚠️ No plans in response, using fallback')
          }
        } else {
          console.error('❌ API error:', res.status)
        }
      } catch (e) {
        console.error("❌ Failed to fetch pricing:", e)
      } finally {
        setIsLoadingPlans(false)
      }
    }
    fetchPricing()
  }, [])

  const InboxDemoComponent = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl border-2 border-gray-300 p-1 overflow-hidden shadow-2xl hover:shadow-3xl transition-all"
    >
      <div className="bg-white rounded-xl p-8">
        {/* Mock Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-100 to-green-50 p-4 rounded-lg border border-green-200 hover:shadow-md transition-all cursor-pointer">
            <div className="text-3xl font-bold text-green-600 mb-1">342</div>
            <div className="text-sm text-gray-700 font-medium">Unread Messages</div>
          </div>
          <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-4 rounded-lg border border-blue-200 hover:shadow-md transition-all cursor-pointer">
            <div className="text-3xl font-bold text-blue-600 mb-1">18.5K</div>
            <div className="text-sm text-gray-700 font-medium">Active Contacts</div>
          </div>
          <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-4 rounded-lg border border-purple-200 hover:shadow-md transition-all cursor-pointer">
            <div className="text-3xl font-bold text-purple-600 mb-1">2,340</div>
            <div className="text-sm text-gray-700 font-medium">Today's Conversations</div>
          </div>
          <div className="bg-gradient-to-br from-orange-100 to-orange-50 p-4 rounded-lg border border-orange-200 hover:shadow-md transition-all cursor-pointer">
            <div className="text-3xl font-bold text-orange-600 mb-1">94%</div>
            <div className="text-sm text-gray-700 font-medium">Response Rate</div>
          </div>
        </div>

        {/* Mock Message Thread - Clickable */}
        <div className="space-y-3">
          {[
            { name: "John Doe", initials: "JD", color: "green", message: "Hi! I want to know about your pricing...", time: "1 min" },
            { name: "Sarah Khan", initials: "SK", color: "blue", message: "Can you send me the product demo?", time: "5 min" },
            { name: "Mike Robertson", initials: "MR", color: "gray", message: "Perfect! I'd like to start immediately...", time: "2 hrs" },
          ].map((chat, idx) => (
            <motion.div
              key={idx}
              whileHover={{ x: 8 }}
              onClick={() => setSelectedChat(idx)}
              className={`flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer ${
                selectedChat === idx
                  ? `bg-gradient-to-r from-${chat.color}-100 to-${chat.color}-50 border-${chat.color}-600 shadow-lg`
                  : `bg-gradient-to-r from-${chat.color}-50 to-white border-${chat.color}-200 hover:shadow-md`
              }`}
            >
              <div className={`w-12 h-12 bg-gradient-to-br from-${chat.color}-500 to-${chat.color}-600 rounded-full flex items-center justify-center text-white font-bold`}>
                {chat.initials}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{chat.name}</p>
                <p className="text-sm text-gray-600">{chat.message}</p>
              </div>
              <span className={`bg-${chat.color}-600 text-white text-xs font-bold px-2 py-1 rounded-full`}>{chat.time}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )

  const plansToRender = pricingPlans.length ? pricingPlans : fallbackPlans

  const liveNowFeatures = [
    {
      icon: MessageSquare,
      title: "Unified Inbox",
      description: "Manage all conversations in one place. View contacts, messages, and status instantly.",
      live: true,
    },
    {
      icon: Zap,
      title: "Broadcast Messaging",
      description: "Send personalized campaigns to thousands instantly with template support",
      live: true,
    },
    {
      icon: Bot,
      title: "Smart Chatbots",
      description: "AI-powered bots that qualify leads and handle 24/7 customer queries",
      live: true,
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Assign conversations to agents with tags, notes, and priority routing",
      live: true,
    },
    {
      icon: BarChart3,
      title: "Real-Time Analytics",
      description: "Track opens, clicks, conversions, and agent performance in real-time",
      live: true,
    },
    {
      icon: Target,
      title: "Smart Segmentation",
      description: "Target audiences by behavior, purchase history, and engagement level",
      live: true,
    },
    {
      icon: Clock,
      title: "Campaign Scheduling",
      description: "Plan campaigns in advance with optimal send time recommendations",
      live: true,
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade encryption, role-based access, and compliance-ready",
      live: true,
    },
  ]



  const stats = [
    { number: "98%", label: "Message Open Rate" },
    { number: "10M+", label: "Messages Sent Daily" },
    { number: "500+", label: "Active Businesses" },
    { number: "24/7", label: "Customer Support" },
  ]

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* HERO SECTION - Professional & Bold */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-block mb-6">
              <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                ✨ The #1 WhatsApp CRM Platform
              </span>
            </div>

            <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Customer Conversations, <br /> <span className="text-green-600">Everywhere</span>
            </h1>

            <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              From first touchpoint to lasting relationships. Replysys turns WhatsApp into your complete customer engagement platform with unified inbox, AI chatbots, and intelligent automation.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button
                onClick={() => setShowDemoModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-bold text-lg inline-flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
              >
                Book Demo <ArrowRight className="h-5 w-5" />
              </button>
              <Link
                href="/pricing"
                className="border-2 border-green-600 text-green-600 hover:bg-green-50 px-8 py-4 rounded-lg font-bold text-lg inline-flex items-center justify-center gap-2 transition-all"
              >
                View Pricing <ChevronRight className="h-5 w-5" />
              </Link>
            </div>

            {/* Hero Stats - Compact */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-green-600 mb-2">98%</div>
                <div className="text-sm text-gray-600">Message Open Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-green-600 mb-2">500+</div>
                <div className="text-sm text-gray-600">Active Businesses</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-green-600 mb-2">10M+</div>
                <div className="text-sm text-gray-600">Messages Daily</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-green-600 mb-2">24/7</div>
                <div className="text-sm text-gray-600">Expert Support</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* INTERACTIVE FEATURE DEMO - Dashboard Preview */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold text-gray-900 mb-4">Unified Inbox in Action</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See how Replysys brings all your customer conversations into one powerful dashboard
            </p>
          </motion.div>

          <InboxDemoComponent />
        </div>
      </section>

      {/* BROADCAST CAMPAIGNS SECTION - Interactive Demo */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 via-green-50 to-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Interactive Campaign Builder */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Broadcast & Campaign Tools</h2>
              <p className="text-lg text-gray-600 mb-8">
                Send targeted campaigns to thousands of customers instantly. No spam filters, no delays, guaranteed delivery through Meta's official API.
              </p>

              <div className="space-y-4">
                <div className="flex gap-4 items-start p-4 bg-white rounded-lg border-l-4 border-green-600 shadow-sm hover:shadow-md transition-all">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Choose Audience</h4>
                    <p className="text-sm text-gray-600">Filter by purchase history, engagement level, or custom segments</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-white rounded-lg border-l-4 border-blue-600 shadow-sm hover:shadow-md transition-all">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Personalize Message</h4>
                    <p className="text-sm text-gray-600">Add customer names, product recommendations, or dynamic content</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-white rounded-lg border-l-4 border-purple-600 shadow-sm hover:shadow-md transition-all">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Schedule or Send</h4>
                    <p className="text-sm text-gray-600">Send immediately or schedule for optimal send times</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-white rounded-lg border-l-4 border-orange-600 shadow-sm hover:shadow-md transition-all">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center text-white font-bold">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Track Results</h4>
                    <p className="text-sm text-gray-600">Monitor opens, clicks, replies, and conversions in real-time</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right: Visual Campaign Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-8 text-white shadow-2xl hover:shadow-3xl transition-all">
                {/* Phone Frame */}
                <div className="bg-black rounded-3xl p-2 shadow-2xl">
                  <div className="bg-white rounded-2xl p-4 text-gray-900">
                    {/* Phone Content */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-gray-500 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                        WhatsApp Business
                      </div>

                      <div className="bg-gradient-to-br from-green-100 to-emerald-50 p-4 rounded-lg">
                        <p className="text-sm font-bold text-gray-900 mb-2">Hi Sarah! 👋</p>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">
                          Your summer collection order #12345 is ready. Enjoy 20% off on your next purchase with code SUMMER20
                        </p>
                        <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-bold py-2 rounded-lg hover:shadow-lg transition-all">
                          View Order
                        </button>
                      </div>

                      <div className="text-xs text-gray-500 text-center">12:34 PM</div>

                      <div className="space-y-2 pt-2 border-t border-gray-200">
                        <div className="text-xs text-gray-600 font-semibold">Campaign Stats</div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-green-100 p-2 rounded text-center">
                            <div className="text-sm font-bold text-green-700">25K</div>
                            <div className="text-xs text-green-600">Sent</div>
                          </div>
                          <div className="bg-blue-100 p-2 rounded text-center">
                            <div className="text-sm font-bold text-blue-700">92%</div>
                            <div className="text-xs text-blue-600">Delivered</div>
                          </div>
                          <div className="bg-purple-100 p-2 rounded text-center">
                            <div className="text-sm font-bold text-purple-700">34%</div>
                            <div className="text-xs text-purple-600">Open Rate</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Badge */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-4 -right-4 bg-gradient-to-br from-orange-500 to-red-600 text-white px-4 py-3 rounded-lg shadow-lg font-bold text-sm"
              >
                ✨ 98% Delivery Rate
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold text-gray-900 mb-4">Build Customer Relationships at Scale</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Turn WhatsApp conversations into business results across every stage of the buyer journey
            </p>
          </motion.div>

          <div className="mb-12">
            <div className="flex flex-col sm:flex-row gap-4 mb-12 justify-center">
              {[
                { id: "marketing", icon: "📱", label: "For Marketing", desc: "Broadcast & Campaigns" },
                { id: "sales", icon: "💼", label: "For Sales", desc: "Lead Qualification" },
                { id: "support", icon: "🤝", label: "For Support", desc: "Customer Service" },
              ].map((tab) => (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveUseCase(tab.id as any)}
                  className={`px-8 py-4 rounded-xl font-bold transition-all transform ${
                    activeUseCase === tab.id
                      ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg"
                      : "bg-white border-2 border-gray-200 text-gray-900 hover:border-green-600"
                  }`}
                >
                  <div className="text-2xl mb-1">{tab.icon}</div>
                  <div>{tab.label}</div>
                  <div className="text-xs opacity-75 mt-1">{tab.desc}</div>
                </motion.button>
              ))}
            </div>

            {/* Content for Each Tab */}
            <motion.div
              key={activeUseCase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid lg:grid-cols-2 gap-12 items-center"
            >
              {/* Left: Features List */}
              <div className="space-y-3">
                {activeUseCase === "marketing" && (
                  <>
                    <div className="p-4 bg-gradient-to-r from-green-100 to-emerald-50 rounded-lg border-l-4 border-green-600 hover:shadow-md transition-all cursor-pointer group">
                      <h4 className="font-bold text-gray-900 group-hover:text-green-700 mb-1">📢 Broadcast to Thousands</h4>
                      <p className="text-sm text-gray-600">Send personalized campaigns instantly with guaranteed delivery</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-blue-100 to-cyan-50 rounded-lg border-l-4 border-blue-600 hover:shadow-md transition-all cursor-pointer group">
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-700 mb-1">📊 Track Every Click</h4>
                      <p className="text-sm text-gray-600">Monitor opens, clicks, replies and conversions in real-time</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-50 rounded-lg border-l-4 border-purple-600 hover:shadow-md transition-all cursor-pointer group">
                      <h4 className="font-bold text-gray-900 group-hover:text-purple-700 mb-1">⏰ Schedule Perfectly</h4>
                      <p className="text-sm text-gray-600">Send at optimal times for maximum engagement and conversions</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-orange-100 to-red-50 rounded-lg border-l-4 border-orange-600 hover:shadow-md transition-all cursor-pointer group">
                      <h4 className="font-bold text-gray-900 group-hover:text-orange-700 mb-1">🎯 Smart Segmentation</h4>
                      <p className="text-sm text-gray-600">Target audiences by behavior, purchase history and engagement</p>
                    </div>
                  </>
                )}
                {activeUseCase === "sales" && (
                  <>
                    <div className="p-4 bg-gradient-to-r from-green-100 to-emerald-50 rounded-lg border-l-4 border-green-600 hover:shadow-md transition-all cursor-pointer group">
                      <h4 className="font-bold text-gray-900 group-hover:text-green-700 mb-1">🤖 AI Lead Qualification</h4>
                      <p className="text-sm text-gray-600">Automatically qualify and score leads based on intent signals</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-blue-100 to-cyan-50 rounded-lg border-l-4 border-blue-600 hover:shadow-md transition-all cursor-pointer group">
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-700 mb-1">👤 Smart Assignment</h4>
                      <p className="text-sm text-gray-600">Automatically route conversations to the best sales agents</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-50 rounded-lg border-l-4 border-purple-600 hover:shadow-md transition-all cursor-pointer group">
                      <h4 className="font-bold text-gray-900 group-hover:text-purple-700 mb-1">📋 Deal Tracking</h4>
                      <p className="text-sm text-gray-600">Monitor follow-ups and track deals through every sales stage</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-orange-100 to-red-50 rounded-lg border-l-4 border-orange-600 hover:shadow-md transition-all cursor-pointer group">
                      <h4 className="font-bold text-gray-900 group-hover:text-orange-700 mb-1">🎯 One Workspace</h4>
                      <p className="text-sm text-gray-600">Unified inbox for your entire team to collaborate on deals</p>
                    </div>
                  </>
                )}
                {activeUseCase === "support" && (
                  <>
                    <div className="p-4 bg-gradient-to-r from-green-100 to-emerald-50 rounded-lg border-l-4 border-green-600 hover:shadow-md transition-all cursor-pointer group">
                      <h4 className="font-bold text-gray-900 group-hover:text-green-700 mb-1">🤖 AI Chatbots 24/7</h4>
                      <p className="text-sm text-gray-600">Handle 80% of FAQs automatically, no human needed</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-blue-100 to-cyan-50 rounded-lg border-l-4 border-blue-600 hover:shadow-md transition-all cursor-pointer group">
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-700 mb-1">🚀 Smart Escalation</h4>
                      <p className="text-sm text-gray-600">Complex issues automatically routed to right support agent</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-50 rounded-lg border-l-4 border-purple-600 hover:shadow-md transition-all cursor-pointer group">
                      <h4 className="font-bold text-gray-900 group-hover:text-purple-700 mb-1">📊 Unified Inbox</h4>
                      <p className="text-sm text-gray-600">All customer conversations in one place for quick resolution</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-orange-100 to-red-50 rounded-lg border-l-4 border-orange-600 hover:shadow-md transition-all cursor-pointer group">
                      <h4 className="font-bold text-gray-900 group-hover:text-orange-700 mb-1">⚡ Reduce Response Time</h4>
                      <p className="text-sm text-gray-600">Average response under 30 seconds with smart routing</p>
                    </div>
                  </>
                )}
              </div>

              {/* Right: Visual Demo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
              >
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-2xl">
                  {/* Mock Dashboard Screen */}
                  <div className="bg-white rounded-lg overflow-hidden shadow-xl">
                    {/* Browser Header */}
                    <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="flex-1 text-center text-xs text-gray-600">replysys.com/dashboard</div>
                    </div>

                    {/* Dashboard Content */}
                    <div className="p-6 space-y-4">
                      {activeUseCase === "marketing" && (
                        <>
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="text-center p-3 bg-gradient-to-br from-green-100 to-green-50 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">250K</div>
                              <div className="text-xs text-gray-600">Messages Sent</div>
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">34%</div>
                              <div className="text-xs text-gray-600">Open Rate</div>
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg">
                              <div className="text-2xl font-bold text-purple-600">₹2.5L</div>
                              <div className="text-xs text-gray-600">Revenue Generated</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center p-2 bg-green-50 rounded text-sm">
                              <span className="font-medium">Campaign: Summer Sale</span>
                              <span className="text-green-600 font-bold">92% Delivered</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-blue-50 rounded text-sm">
                              <span className="font-medium">Campaign: Flash Offer</span>
                              <span className="text-blue-600 font-bold">28% Clicked</span>
                            </div>
                          </div>
                        </>
                      )}
                      {activeUseCase === "sales" && (
                        <>
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="text-center p-3 bg-gradient-to-br from-green-100 to-green-50 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">42</div>
                              <div className="text-xs text-gray-600">Hot Leads</div>
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">18</div>
                              <div className="text-xs text-gray-600">In Progress</div>
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg">
                              <div className="text-2xl font-bold text-purple-600">₹12L</div>
                              <div className="text-xs text-gray-600">This Month</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="p-2 bg-gradient-to-r from-green-50 to-white rounded border-l-2 border-green-600 text-sm">
                              <div className="font-bold text-gray-900">Rohan Patel</div>
                              <div className="text-xs text-gray-600">Qualified • Assigned to Rahul</div>
                            </div>
                            <div className="p-2 bg-gradient-to-r from-blue-50 to-white rounded border-l-2 border-blue-600 text-sm">
                              <div className="font-bold text-gray-900">Priya Singh</div>
                              <div className="text-xs text-gray-600">Negotiating • Closing Soon</div>
                            </div>
                          </div>
                        </>
                      )}
                      {activeUseCase === "support" && (
                        <>
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="text-center p-3 bg-gradient-to-br from-green-100 to-green-50 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">342</div>
                              <div className="text-xs text-gray-600">Resolved</div>
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">28 sec</div>
                              <div className="text-xs text-gray-600">Avg Response</div>
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg">
                              <div className="text-2xl font-bold text-purple-600">4.8/5</div>
                              <div className="text-xs text-gray-600">Rating</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="p-2 bg-gradient-to-r from-green-50 to-white rounded text-sm">
                              <span className="inline-block bg-green-600 text-white text-xs px-2 py-0.5 rounded">Bot</span>
                              <div className="font-medium text-gray-900 mt-1">Order Status Query - Resolved</div>
                            </div>
                            <div className="p-2 bg-gradient-to-r from-blue-50 to-white rounded text-sm">
                              <span className="inline-block bg-blue-600 text-white text-xs px-2 py-0.5 rounded">Agent</span>
                              <div className="font-medium text-gray-900 mt-1">Technical Support - In Progress</div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Floating Badge */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -bottom-4 -right-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg font-bold text-sm"
                >
                  ✨ Real-time Updates
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* LIVE NOW FEATURES - What's Ready */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-green-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              ✅ Live & Ready Today
            </span>
            <h2 className="text-5xl font-bold text-gray-900 mb-4">What You Get Today</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Production-ready features built on Meta's official WhatsApp Cloud API
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {liveNowFeatures.map((feature, i) => {
              const IconComponent = feature.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.05 }}
                  viewport={{ once: true }}
                  className="p-6 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-green-50 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center group-hover:from-green-600 group-hover:to-emerald-600 transition-all">
                      <IconComponent className="h-6 w-6 text-green-600 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-xs font-bold text-green-700 bg-gradient-to-r from-green-100 to-emerald-100 px-2 py-1 rounded">LIVE</span>
                  </div>
                  <h3 className="font-bold text-base text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* PROBLEMS WE SOLVE - Business Pain Points - Interactive */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 via-blue-50 to-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              Real Problems We <span className="text-green-600">Solve</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stop managing customer conversations across multiple platforms. One unified WhatsApp solution for your entire business.
            </p>
          </motion.div>

          {/* Problem Cards - 2 columns */}
          <div className="grid lg:grid-cols-2 gap-6 mb-12">
            {[
              {
                problem: "💥 Getting Blocked by SMS Gateways",
                description: "Third-party SMS platforms flag bulk messages as spam, blocking your business account",
                solution: "Use Meta's official WhatsApp API. Guaranteed 98% delivery, zero spam filters, trusted sender status.",
                features: ["Verified sender", "Official Meta infrastructure", "Enterprise-grade reliability"],
                color: "red",
                gradient: "from-red-600 to-orange-600"
              },
              {
                problem: "🔄 Managing Conversations Everywhere",
                description: "Agents juggling WhatsApp, SMS, Email, Instagram - no central place to see all conversations",
                solution: "Unified inbox with all customer conversations in one workspace. Assign, tag, and track everything.",
                features: ["Single dashboard", "Agent assignment", "Message history"],
                color: "blue",
                gradient: "from-blue-600 to-cyan-600"
              },
              {
                problem: "⏰ Slow Response Times",
                description: "Customers wait hours for replies. Sales leads go cold. Support tickets pile up.",
                solution: "AI chatbots answer 80% of questions instantly 24/7. Humans handle complex cases.",
                features: ["24/7 instant responses", "Lead qualification", "Smart routing"],
                color: "purple",
                gradient: "from-purple-600 to-pink-600"
              },
              {
                problem: "📊 No Visibility Into Results",
                description: "Can't track which campaigns worked, who replied, what converted to sales",
                solution: "Real-time analytics showing opens, clicks, conversions, and agent performance metrics.",
                features: ["Campaign analytics", "Click tracking", "Revenue attribution"],
                color: "green",
                gradient: "from-green-600 to-emerald-600"
              },
              {
                problem: "👥 Team Coordination Chaos",
                description: "Multiple agents don't know who's handling which customer. Duplicate conversations happen.",
                solution: "Team dashboard with conversation assignment, agent status, and real-time collaboration.",
                features: ["Agent assignment", "Status tracking", "Team notifications"],
                color: "amber",
                gradient: "from-amber-600 to-orange-600"
              },
              {
                problem: "💰 High Customer Support Costs",
                description: "Paying agents to manually respond to repetitive questions (FAQs, order status, etc)",
                solution: "Intelligent chatbots handle routine queries. Your agents focus on high-value conversations.",
                features: ["60% cost reduction", "Automated FAQs", "Selective human routing"],
                color: "cyan",
                gradient: "from-cyan-600 to-blue-600"
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -8 }}
                onClick={() => setSelectedProblem(i)}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: (i % 2) * 0.1 }}
                viewport={{ once: true }}
                className={`rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                  selectedProblem === i
                    ? "border-green-600 shadow-2xl scale-105"
                    : "border-gray-200 hover:shadow-xl"
                }`}
              >
                {/* Color header bar */}
                <div className={`h-1 bg-gradient-to-r ${item.gradient}`}></div>
                
                <div className={`p-8 ${
                  selectedProblem === i
                    ? `bg-gradient-to-br from-${item.color}-50 to-white`
                    : "bg-white"
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 flex-1">{item.problem}</h3>
                    {selectedProblem === i && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${item.gradient} text-white flex items-center justify-center font-bold text-sm`}
                      >
                        ✓
                      </motion.div>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-6 text-base leading-relaxed">{item.description}</p>
                  
                  {/* Solution Box */}
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={selectedProblem === i ? { opacity: 1, height: "auto" } : { opacity: 0.7, height: "auto" }}
                    transition={{ duration: 0.3 }}
                    className={`bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-600 p-5 rounded mb-6`}
                  >
                    <p className="font-bold text-gray-900 mb-2">✓ How Replysys Solves It</p>
                    <p className="text-gray-700 leading-relaxed text-sm">{item.solution}</p>
                  </motion.div>

                  {/* Features with animation */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={selectedProblem === i ? { opacity: 1 } : { opacity: 0.7 }}
                    className="space-y-2"
                  >
                    {item.features.map((feature, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={selectedProblem === i ? { opacity: 1, x: 0 } : { opacity: 0.7, x: 0 }}
                        transition={{ delay: selectedProblem === i ? idx * 0.1 : 0 }}
                        className="flex gap-3 items-center"
                      >
                        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center flex-shrink-0`}>
                          <Check className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-gray-700 font-medium text-sm">{feature}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-lg text-gray-600 mb-6">See how we solve all these problems with one platform</p>
            <button
              onClick={() => setShowDemoModal(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-lg font-bold hover:shadow-lg transition-all inline-flex items-center gap-2"
            >
              Book Your Demo <ArrowRight className="h-5 w-5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* WHY REPLYSYS - Differentiators */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-purple-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold text-gray-900 mb-4">Why Choose Replysys?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built specifically for Indian businesses who want to compete globally
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "⚡",
                title: "Built for Indian Businesses",
                description: "Pricing in INR, support in Hindi & English, Meta API compliance for Indian regulations",
              },
              {
                icon: "💰",
                title: "Transparent Pricing",
                description: "What you see is what you pay. Only charged for messages sent. No hidden fees ever.",
              },
              {
                icon: "🎯",
                title: "Meta Embedded OAuth",
                description: "Connect your WhatsApp Business Account in seconds. Automatic phone number sync.",
              },
              {
                icon: "🔒",
                title: "Enterprise Security",
                description: "Role-based access, audit logs, bank-grade encryption, GDPR compliant",
              },
              {
                icon: "⚙️",
                title: "No-Code Workflows",
                description: "Create automation without coding. Visual builder with conditions and routing.",
              },
              {
                icon: "🤝",
                title: "24/7 Dedicated Support",
                description: "Expert team available always. Response time < 1 hour for critical issues.",
              },
            ].map((reason, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`p-8 rounded-xl border border-gray-200 hover:shadow-lg transition-all ${
                  i % 3 === 0
                    ? 'bg-gradient-to-br from-green-50 to-white'
                    : i % 3 === 1
                      ? 'bg-gradient-to-br from-blue-50 to-white'
                      : 'bg-gradient-to-br from-emerald-50 to-white'
                }`}
              >
                <div className="text-4xl mb-4">{reason.icon}</div>
                <h3 className="font-bold text-lg text-gray-900 mb-3">{reason.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{reason.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-green-50 to-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your business. Scale up anytime, no long-term contracts.
            </p>
          </motion.div>

          {isLoadingPlans ? (
            <div className="text-center py-12">Loading plans...</div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {plansToRender.map((plan: any, idx: number) => (
                <motion.div
                  key={plan.planId}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -8 }}
                  className={`rounded-2xl border-2 overflow-hidden transition-all ${
                    plan.isPopular
                      ? "border-green-500 shadow-2xl lg:scale-105 bg-gradient-to-br from-green-50 via-emerald-50 to-white"
                      : "border-gray-200 shadow-lg hover:shadow-xl bg-gradient-to-br from-white via-gray-50 to-white"
                  }`}
                >
                  {/* Premium highlight bar */}
                  <div className={`h-1 bg-gradient-to-r ${
                    plan.isPopular 
                      ? "from-green-500 to-emerald-500"
                      : "from-blue-400 to-cyan-400"
                  }`}></div>

                  {/* Header */}
                  <div className={`p-8 ${plan.isPopular ? "bg-gradient-to-br from-green-50 to-emerald-50" : "bg-gradient-to-br from-gray-50 to-white"}`}>
                    {plan.isPopular && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        className="mb-4 inline-block bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-lg"
                      >
                        🌟 MOST POPULAR
                      </motion.div>
                    )}
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 mb-6 text-sm">
                      {plan.description}
                    </p>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                          ₹{plan.monthlyPrice.toLocaleString()}
                        </span>
                        <span className="text-gray-600">/month</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        + ₹{(plan.setupFee || 3000).toLocaleString()} setup fee (one-time)
                      </p>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedPlanName(plan.name)
                        setShowAgreementModal(true)
                      }}
                      className={`w-full py-3 px-6 rounded-xl font-bold text-center transition-all ${
                        plan.isPopular
                          ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/50"
                          : "bg-gradient-to-r from-gray-900 to-gray-800 text-white hover:shadow-lg hover:shadow-gray-900/50"
                      }`}
                    >
                      Get Started
                    </motion.button>
                  </div>

                  {/* Features */}
                  <div className={`p-8 ${
                    plan.isPopular 
                      ? "bg-gradient-to-br from-white to-green-50"
                      : "bg-gradient-to-br from-white to-gray-50"
                  }`}>
                    <p className="font-semibold text-sm mb-5 text-gray-700 uppercase tracking-wide">What's Included</p>
                    <ul className="space-y-4 mb-8">
                      {plan.features?.included?.map((feature: string, idx: number) => (
                        <motion.li 
                          key={feature}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          viewport={{ once: true }}
                          className="flex gap-3 items-start group"
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            plan.isPopular
                              ? "bg-gradient-to-br from-green-400 to-emerald-500"
                              : "bg-gradient-to-br from-blue-400 to-cyan-500"
                          }`}>
                            <Check className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-gray-700 group-hover:text-gray-900 transition-colors">{feature}</span>
                        </motion.li>
                      ))}
                    </ul>

                    {plan.features?.excluded?.length > 0 && (
                      <>
                        <p className="font-semibold text-sm mb-4 text-gray-500 uppercase tracking-wide">Upgrade to {plansToRender[idx === 0 ? 1 : 0]?.name}</p>
                        <ul className="space-y-3">
                          {plan.features.excluded.map((feature: string) => (
                            <li key={feature} className="flex gap-3 items-start opacity-50">
                              <span className="text-gray-400 mt-0.5 text-lg">−</span>
                              <span className="text-gray-600">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <p className="text-gray-600 mb-4">
              Want a custom plan?{" "}
              <a href="mailto:sales@replysys.com" className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-bold hover:underline">
                Contact our sales team
              </a>
            </p>
            <p className="text-sm text-gray-500">
              All plans include 24/7 customer support. Messages charged at Meta's rates (approximately ₹0.15 per message)
            </p>
          </motion.div>
        </div>
      </section>

      {/* BENCHMARK - Performance */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold text-gray-900 mb-4">Replysys by Numbers</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powered by Meta's official WhatsApp Cloud API
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              {[
                { metric: "99.9%", label: "Platform Uptime" },
                { metric: "< 100ms", label: "Message Delivery" },
                { metric: "4X ROI", label: "Average Improvement" },
                { metric: "60% Savings", label: "On Customer Support" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-6 pb-8 border-b border-gray-200 last:border-0">
                  <div className="text-4xl font-bold text-green-600">{item.metric}</div>
                  <div className="pt-1">
                    <p className="text-gray-600 text-sm">{item.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-emerald-50 via-blue-50 to-cyan-50 p-12 rounded-2xl border border-emerald-200"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Real Customer Results</h3>
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-600 mb-2">E-Commerce Store</p>
                  <p className="text-lg font-semibold text-gray-900">2X Order Conversion</p>
                  <p className="text-xs text-gray-500 mt-1">via WhatsApp cart reminders</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">SaaS Company</p>
                  <p className="text-lg font-semibold text-gray-900">30% Support Cost Reduction</p>
                  <p className="text-xs text-gray-500 mt-1">with AI chatbot handling FAQs</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Service Provider</p>
                  <p className="text-lg font-semibold text-gray-900">3X Lead Response Time</p>
                  <p className="text-xs text-gray-500 mt-1">automatic qualification routing</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-4xl mx-auto text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-bold mb-6">Ready to Transform Customer Engagement?</h2>
            <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
              Join 500+ businesses that have boosted their revenue with Replysys
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowDemoModal(true)}
                className="bg-white text-green-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-bold text-lg inline-flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                Book Demo <ArrowRight className="h-5 w-5" />
              </button>
              <Link
                href="/pricing"
                className="border-2 border-white text-white hover:bg-white hover:text-green-600 px-8 py-4 rounded-lg font-bold text-lg inline-flex items-center justify-center gap-2 transition-all"
              >
                View Pricing <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* PLAN AGREEMENT MODAL */}
      <PlanAgreementModal
        isOpen={showAgreementModal}
        planName={selectedPlanName}
        onClose={() => {
          setShowAgreementModal(false)
          setSelectedPlanName("")
        }}
        onConfirm={() => {
          window.location.href = `/checkout?plan=${encodeURIComponent(selectedPlanName)}`
        }}
      />

      {/* BOOK DEMO MODAL */}
      <BookDemoModal isOpen={showDemoModal} onClose={() => setShowDemoModal(false)} />

      <Footer />
    </div>
  )
}
