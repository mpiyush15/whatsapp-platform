"use client";
import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-[#1C1E21] pt-20 pb-10 px-6 border-t border-gray-800 font-sans">
      <div className="mx-auto max-w-7xl">
        
        {/* TOP SECTION: THE LINKS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">

          {/* Column 1: Brand & Trust Badge (Takes up 2 columns on Desktop) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="text-3xl font-black text-white tracking-tight">
              Reply<span className="text-[#008069]">Sys</span>
            </div>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
              The smartest WhatsApp marketing and engagement platform. Built for growing businesses to automate support, broadcast offers, and close deals at scale.
            </p>
            
            {/* Meta Partner Badge */}
            <div className="inline-flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-3 mt-4">
              <span className="text-blue-500 font-bold text-xl">∞</span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Verified</span>
                <span className="text-sm font-semibold text-white tracking-wide">Meta Business Partner</span>
              </div>
            </div>
          </div>

          {/* Column 2: Platform Links */}
          <div>
            <h4 className="text-white font-bold mb-6 tracking-wide">Platform</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><a href="#features" className="hover:text-[#25D366] transition-colors">Features</a></li>
              <li><a href="/pricing" className="hover:text-[#25D366] transition-colors">Pricing</a></li>
              <li><a href="/demo" className="hover:text-[#25D366] transition-colors">Book a Demo</a></li>
              <li><a href="/api" className="hover:text-[#25D366] transition-colors">WhatsApp API</a></li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h4 className="text-white font-bold mb-6 tracking-wide">Resources</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><a href="/help" className="hover:text-[#25D366] transition-colors">Help Center</a></li>
              <li><a href="/blog" className="hover:text-[#25D366] transition-colors">Blog</a></li>
              <li><a href="/case-studies" className="hover:text-[#25D366] transition-colors">Case Studies</a></li>
              <li><a href="/developer" className="hover:text-[#25D366] transition-colors">Developer Docs</a></li>
            </ul>
          </div>

          {/* Column 4: Company */}
          <div>
            <h4 className="text-white font-bold mb-6 tracking-wide">Company</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><a href="/about" className="hover:text-[#25D366] transition-colors">About Us</a></li>
              <li><a href="/contact" className="hover:text-[#25D366] transition-colors">Contact Support</a></li>
              <li><a href="/privacy" className="hover:text-[#25D366] transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-[#25D366] transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        {/* BOTTOM SECTION: COPYRIGHT */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div>
            © {new Date().getFullYear()} ReplySys. All rights reserved.
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-[#25D366] transition-colors">Twitter</a>
            <a href="#" className="hover:text-[#25D366] transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-[#25D366] transition-colors">Facebook</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
