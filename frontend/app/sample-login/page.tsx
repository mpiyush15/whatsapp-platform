"use client";
import React from 'react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen font-sans bg-white w-full">
      {/* LEFT COLUMN: THE LOGIN FORM */}
      <div className="flex w-full flex-col justify-center px-8 sm:px-16 lg:w-1/2 xl:px-24 py-12">
        <div className="mx-auto w-full max-w-sm">
            
            {/* Logo & Back Link */}
            <div className="mb-10 flex items-center justify-between">
              <a href="/sample-landing" className="flex items-center gap-1 font-black text-2xl tracking-tight text-[#1c1e21] hover:opacity-80 transition-opacity">
                Reply<span className="text-[#008069]">Sys</span>
              </a>
              <a href="/sample-landing" className="text-sm font-semibold text-gray-500 hover:text-[#008069] transition-colors">
                &larr; Back to Home
              </a>
            </div>
            
            {/* Headings */}
            <h2 className="text-3xl font-extrabold text-[#1c1e21] tracking-tight">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Sign in to manage your WhatsApp operations.
            </p>

            {/* OAuth Buttons */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              {/* Google Button */}
              <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>
              {/* Facebook Button */}
              <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all">
                <svg className="h-5 w-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </button>
            </div>

            {/* Divider */}
            <div className="relative mt-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-400">Or continue with email</span>
              </div>
            </div>

            {/* The Form */}
            <form className="mt-8 space-y-5" action="#" method="POST">
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-gray-700">Email Address</label>
                <div className="mt-2">
                  <input 
                    id="email" name="email" type="email" placeholder="you@example.com" required 
                    className="block w-full rounded-xl border border-gray-200 px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:border-[#008069] focus:ring-[#008069] focus:outline-none focus:ring-1 transition-colors sm:text-sm" 
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-bold text-gray-700">Password</label>
                  <a href="#" className="text-sm font-bold text-[#008069] hover:text-[#006653]">Forgot password?</a>
                </div>
                <div className="mt-2">
                  <input 
                    id="password" name="password" type="password" placeholder="••••••••" required 
                    className="block w-full rounded-xl border border-gray-200 px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:border-[#008069] focus:ring-[#008069] focus:outline-none focus:ring-1 transition-colors sm:text-sm" 
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input 
                  id="remember-me" name="remember-me" type="checkbox" 
                  className="h-4 w-4 rounded border-gray-300 text-[#008069] focus:ring-[#008069]" 
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-gray-900">
                  Remember me
                </label>
              </div>
              
              <button type="submit" className="flex w-full justify-center rounded-xl bg-[#008069] px-3 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-[#006653] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008069]">
                Sign in
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: THE FEATURE HIGHLIGHTS */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-[#D9FDD3] overflow-hidden items-center justify-center p-12 lg:p-16 xl:p-24">
          
          {/* Subtle Background Pattern (Optional) */}
          <div className="absolute inset-0 bg-[radial-gradient(#115B4C_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03]"></div>

          <div className="relative z-10 w-full max-w-lg">
            
            <h3 className="text-3xl lg:text-4xl font-extrabold text-[#115B4C] tracking-tight mb-10 leading-tight">
              Everything your team needs to scale.
            </h3>

            {/* Feature List */}
            <div className="space-y-8 mb-12">
              
              {/* Feature 1 */}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm text-2xl">
                  📥
                </div>
                <div>
                  <h4 className="text-lg font-bold text-[#115B4C]">Shared Team Inbox</h4>
                  <p className="text-sm text-[#115B4C]/80 mt-1 leading-relaxed">
                    Multiple agents managing conversations from one official business number without losing context.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm text-2xl">
                  🚀
                </div>
                <div>
                  <h4 className="text-lg font-bold text-[#115B4C]">Smart Broadcasts</h4>
                  <p className="text-sm text-[#115B4C]/80 mt-1 leading-relaxed">
                    Send massive promotional campaigns that actually get read, with 98% open rates.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm text-2xl">
                  🤖
                </div>
                <div>
                  <h4 className="text-lg font-bold text-[#115B4C]">No-Code Automations</h4>
                  <p className="text-sm text-[#115B4C]/80 mt-1 leading-relaxed">
                    Instantly answer FAQs 24/7 and route complex questions to the right human agent.
                  </p>
                </div>
              </div>

            </div>

            {/* Floating UI Card (Matching your screenshot) */}
            <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white p-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-[#115B4C]/10 pb-4 mb-4">
                 <div className="h-10 w-10 rounded-full bg-[#008069] flex items-center justify-center text-white font-bold text-sm">RS</div>
                 <div>
                   <div className="text-[#1c1e21] font-bold text-sm">ReplySys Dashboard</div>
                   <div className="text-[#008069] text-xs font-semibold flex items-center gap-1">
                     <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-[#25D366]"></span>
                     </span>
                     Active • Online
                   </div>
                 </div>
              </div>
              
              {/* Fake Dashboard Skeleton UI */}
              <div className="space-y-3 opacity-60">
                <div className="h-8 w-full bg-[#115B4C]/10 rounded-lg"></div>
                <div className="h-8 w-3/4 bg-[#115B4C]/10 rounded-lg"></div>
                <div className="h-8 w-full bg-[#115B4C]/10 rounded-lg"></div>
              </div>
            </div>

          </div>
        </div>
    </div>
  );
}
