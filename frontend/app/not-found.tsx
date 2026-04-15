"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="text-8xl font-bold text-red-600 mb-2">404</div>
          <div className="text-2xl font-bold text-gray-900">Page Not Found</div>
        </div>

        {/* Message */}
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or you don't have permission to access it.
        </p>

        {/* Info */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-red-800">
            <strong>Access Denied:</strong> This route is not available for your account type or role.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </Link>
          <Link href="/dashboard" className="flex-1">
            <Button className="w-full bg-green-600 hover:bg-green-700">
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-500 mt-8">
          If you believe this is a mistake, please contact support.
        </p>
      </div>
    </div>
  )
}
