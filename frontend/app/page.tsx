'use client'

import { useState } from 'react'
import { Mail, MessageCircle, Zap, CheckCircle } from 'lucide-react'

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Email submitted:', email)
      setSubmitted(true)
      setEmail('')
      setTimeout(() => setSubmitted(false), 5000)
    } catch (error) {
      console.error('Error submitting email:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 overflow-hidden">
      {/* Background animated elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        
        {/* Logo/Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-2">
              <MessageCircle size={40} className="text-green-600" />
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-green-600 via-green-500 to-blue-600 bg-clip-text text-transparent">
                Reply
              </h1>
              <span className="text-5xl md:text-6xl font-bold text-gray-900">Sys</span>
            </div>
          </div>

          <div className="space-y-4 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
              WhatsApp Automation Platform
            </h2>
            <p className="text-xl md:text-2xl text-gray-600">
              Coming Soon
            </p>
          </div>
        </div>

        {/* Main CTA Section */}
        <div className="max-w-lg w-full bg-white rounded-2xl border border-gray-200 p-8 md:p-10 mb-12 shadow-lg">
          <h3 className="text-2xl font-bold mb-6 text-center text-gray-900">
            Be the First to Know
          </h3>
          
          <p className="text-gray-600 text-center mb-8">
            Get notified when we launch. Join thousands of businesses automating their WhatsApp messaging.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-6 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition"
              />
              <Mail className="absolute right-4 top-3.5 text-gray-400" size={20} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Notify Me
                </>
              )}
            </button>
          </form>

          {submitted && (
            <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg flex items-center gap-2 animate-in">
              <CheckCircle size={20} className="text-green-600" />
              <span className="text-green-800">Thanks! We'll keep you updated.</span>
            </div>
          )}
        </div>

        {/* Features Preview */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mb-12">
          {[
            {
              icon: MessageCircle,
              title: 'Automated Responses',
              description: 'Smart replies and automated workflows for instant customer engagement'
            },
            {
              icon: Zap,
              title: 'Lightning Fast',
              description: 'Real-time message delivery with instant notifications'
            },
            {
              icon: Mail,
              title: 'Full Integration',
              description: 'Seamlessly connect your WhatsApp Business Account'
            }
          ].map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-green-400 shadow-md hover:shadow-lg transition-all duration-300"
              >
                <Icon className="w-10 h-10 text-green-600 mb-4" />
                <h4 className="font-bold text-lg mb-2 text-gray-900">{feature.title}</h4>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm border-t border-gray-200 pt-8">
          <p>© 2026 ReplySys. All rights reserved.</p>
          <div className="flex gap-6 justify-center mt-4">
            <a href="#" className="hover:text-green-600 transition">Privacy</a>
            <a href="#" className="hover:text-green-600 transition">Terms</a>
            <a href="#" className="hover:text-green-600 transition">Contact</a>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
