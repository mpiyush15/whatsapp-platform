'use client'

import { X } from 'lucide-react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

export default function WhatsAppWidget() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const superadminNumber = '919766504856' // Replysys superadmin number

  const whatsappLink = `https://wa.me/${superadminNumber}?text=Hi%2C%20I%20need%20help%20with%20Replysys`

  // Hide the floating widget on all dashboard/project pages
  if (pathname?.startsWith('/projects')) {
    return null;
  }

  if (isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 max-w-[90vw]">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                {/* WhatsApp Logo */}
                <svg
                  className="h-6 w-6 drop-shadow-sm"
                  viewBox="0 0 32 32"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M16.002 2.127a13.844 13.844 0 0 0-11.83 20.89L2.127 29.873l6.98-2.032A13.842 13.842 0 1 0 16.002 2.127z" fill="#25D366" />
                  <path d="M23.167 19.34c-.358-.18-2.115-1.045-2.443-1.163-.328-.12-.567-.18-.805.18-.24.358-.925 1.164-1.134 1.403-.21.24-.418.27-.776.09-2.02-.995-3.62-2.18-5.06-4.664-.225-.39-.025-.6.155-.78.16-.16.358-.42.537-.63.18-.21.24-.36.358-.6.12-.24.06-.45-.03-.63-.09-.18-.806-1.94-1.104-2.657-.29-.7-.58-.606-.805-.616h-.686c-.24 0-.627.09-.955.448-.328.36-1.253 1.224-1.253 2.985s1.283 3.462 1.462 3.701c.18.24 2.528 3.86 6.122 5.412 2.454 1.06 3.394 1.155 4.56.967 1.343-.218 2.115-.866 2.413-1.702.298-.836.298-1.552.21-1.701-.09-.15-.328-.24-.686-.42z" fill="#FFF" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm">Replysys Support</p>
                <p className="text-xs text-green-100">We typically reply in minutes</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-1 rounded-full transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Message Area */}
          <div className="p-4">
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-700">
                👋 Hello! Welcome to Replysys. How can we help you today?
              </p>
            </div>

            <div className="space-y-2 mb-4">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                {/* WhatsApp Logo */}
                <svg
                  className="h-5 w-5 mr-1 drop-shadow-sm"
                  viewBox="0 0 32 32"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M16.002 2.127a13.844 13.844 0 0 0-11.83 20.89L2.127 29.873l6.98-2.032A13.842 13.842 0 1 0 16.002 2.127z" fill="#FFF" />
                  <path d="M23.167 19.34c-.358-.18-2.115-1.045-2.443-1.163-.328-.12-.567-.18-.805.18-.24.358-.925 1.164-1.134 1.403-.21.24-.418.27-.776.09-2.02-.995-3.62-2.18-5.06-4.664-.225-.39-.025-.6.155-.78.16-.16.358-.42.537-.63.18-.21.24-.36.358-.6.12-.24.06-.45-.03-.63-.09-.18-.806-1.94-1.104-2.657-.29-.7-.58-.606-.805-.616h-.686c-.24 0-.627.09-.955.448-.328.36-1.253 1.224-1.253 2.985s1.283 3.462 1.462 3.701c.18.24 2.528 3.86 6.122 5.412 2.454 1.06 3.394 1.155 4.56.967 1.343-.218 2.115-.866 2.413-1.702.298-.836.298-1.552.21-1.701-.09-.15-.328-.24-.686-.42z" fill="#25D366" />
                </svg>
                Start Chat on WhatsApp
              </a>
            </div>

            <p className="text-xs text-gray-500 text-center">
              💬 Chat with our support team on WhatsApp
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-6 z-40 bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group"
      title="Chat with us on WhatsApp"
    >
      <div className="relative">
        {/* WhatsApp Logo */}
        <svg
          className="h-8 w-8 drop-shadow-md"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M16.002 2.127a13.844 13.844 0 0 0-11.83 20.89L2.127 29.873l6.98-2.032A13.842 13.842 0 1 0 16.002 2.127z" fill="#FFF" />
          <path d="M23.167 19.34c-.358-.18-2.115-1.045-2.443-1.163-.328-.12-.567-.18-.805.18-.24.358-.925 1.164-1.134 1.403-.21.24-.418.27-.776.09-2.02-.995-3.62-2.18-5.06-4.664-.225-.39-.025-.6.155-.78.16-.16.358-.42.537-.63.18-.21.24-.36.358-.6.12-.24.06-.45-.03-.63-.09-.18-.806-1.94-1.104-2.657-.29-.7-.58-.606-.805-.616h-.686c-.24 0-.627.09-.955.448-.328.36-1.253 1.224-1.253 2.985s1.283 3.462 1.462 3.701c.18.24 2.528 3.86 6.122 5.412 2.454 1.06 3.394 1.155 4.56.967 1.343-.218 2.115-.866 2.413-1.702.298-.836.298-1.552.21-1.701-.09-.15-.328-.24-.686-.42z" fill="#25D366" />
        </svg>
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
      </div>
    </button>
  )
}
