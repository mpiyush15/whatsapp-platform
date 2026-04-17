'use client'

import Link from 'next/link'
import { MessageSquare, Facebook, Twitter, Linkedin, Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 hover:opacity-80 transition">
              <div className="h-10 w-10 bg-green-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                <span className="text-green-400">Replysys</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 mb-4">
              A product of Pixels Digital Solutions. Transform your customer engagement with our powerful WhatsApp Business API platform.
            </p>
            {/* Social Links */}
            <div className="flex gap-4">
              <a href="#" className="hover:text-green-400 transition">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-green-400 transition">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-green-400 transition">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/#features" className="text-sm hover:text-green-400 transition">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm hover:text-green-400 transition">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/services" className="text-sm hover:text-green-400 transition">
                  Solutions
                </Link>
              </li>
              <li>
                <Link href="/api-documentation" className="text-sm hover:text-green-400 transition">
                  API Docs
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm hover:text-green-400 transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm hover:text-green-400 transition">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm hover:text-green-400 transition">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-sm hover:text-green-400 transition">
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-sm hover:text-green-400 transition">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm hover:text-green-400 transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-sm hover:text-green-400 transition">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/refunds" className="text-sm hover:text-green-400 transition">
                  Refunds & Cancellations
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <Mail className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-400" />
                <span className="text-sm">support@replysys.com</span>
              </li>
              <li className="flex gap-3">
                <Phone className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-400" />
                <span className="text-sm">+91 9999 999 999</span>
              </li>
              <li className="flex gap-3">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-400" />
                <span className="text-sm">India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-8">
          {/* Bottom Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400 mb-6">
            <div>
              <span className="font-semibold text-white">100%</span> Uptime SLA
            </div>
            <div>
              <span className="font-semibold text-white">256-bit</span> SSL Encryption
            </div>
            <div>
              <span className="font-semibold text-white">GDPR</span> Compliant
            </div>
          </div>

          {/* Copyright */}
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400">
              © {currentYear} Replysys by <span className="text-green-400 font-semibold">Pixels Digital Solutions</span>. All rights reserved.
            </p>
            <p className="text-sm text-gray-400">
              Made with ❤️ in India
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
