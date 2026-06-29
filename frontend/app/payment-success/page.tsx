"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle, Copy, Download, AlertCircle } from "lucide-react"
import Link from "next/link"
import { API_URL } from "@/lib/config/api"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [paymentData, setPaymentData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        const orderId = searchParams.get("orderId")
        const status = searchParams.get("status")

        if (!orderId || status !== "success") {
          setError("Invalid payment status")
          setLoading(false)
          return
        }

        const token = localStorage.getItem("token")
        if (!token) {
          router.push("/auth/login")
          return
        }

        const response = await fetch(`${API_URL}/payments/status/${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setPaymentData(data.data)
        } else {
          setError("Failed to fetch payment details")
        }
      } catch (err) {
        console.error("Error fetching payment:", err)
        setError("An error occurred while fetching payment details")
      } finally {
        setLoading(false)
      }
    }

    fetchPaymentDetails()
  }, [searchParams, router])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-600">Processing your payment...</p>
        </div>
      </div>
    )
  }

  if (error || !paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full">
          <AlertCircle className="h-12 sm:h-16 w-12 sm:w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-2">Payment Error</h1>
          <p className="text-sm sm:text-base text-gray-600 text-center mb-6">{error || "Failed to process payment"}</p>
          <Link href="/dashboard/billing">
            <button className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 sm:py-2 rounded-lg text-base">
              Back to Billing
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const customerId = paymentData.customerId || paymentData.accountId?._id
  const planName = paymentData.subscriptionId?.planId?.name || "Premium Plan"

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payment Confirmed</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Your subscription is now active</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Success Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8 mb-6 sm:mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <CheckCircle className="h-16 sm:h-20 w-16 sm:w-20 text-green-600" />
              <div className="absolute inset-0 animate-ping rounded-full bg-green-600 opacity-20"></div>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-2">Payment Successful!</h2>
          <p className="text-center text-sm sm:text-base text-gray-600 mb-8">
            Thank you for subscribing to {planName}. Your account is now active.
          </p>

          {/* Key Details */}
          <div className="space-y-4 bg-gray-50 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-8">
            {/* Customer ID */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Your Customer ID</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customerId || "N/A"}
                  readOnly
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg bg-white font-mono text-xs sm:text-sm"
                />
                <button
                  onClick={() => copyToClipboard(customerId)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                >
                  <Copy className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600" />
                </button>
              </div>
              {copied && <p className="text-green-600 text-xs sm:text-sm mt-1">✓ Copied to clipboard</p>}
            </div>

            {/* Order ID */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Order ID</label>
              <input
                type="text"
                value={paymentData.orderId || "N/A"}
                readOnly
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg bg-white font-mono text-xs sm:text-sm"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Amount Paid</label>
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                ₹{paymentData.amount?.toLocaleString() || "N/A"}
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Payment Date: {new Date(paymentData.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Plan Details */}
            <div className="pt-4 border-t border-gray-200">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Subscription Plan</label>
              <div className="text-base sm:text-lg font-semibold text-gray-900">{planName}</div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Your subscription is active and will renew automatically
              </p>
            </div>
          </div>

          {/* Invoice */}
          {paymentData.invoice && (
            <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900">Invoice Available</h3>
                  <p className="text-sm text-gray-600">Invoice #{paymentData.invoice.invoiceNumber}</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="mb-8 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-3">What's Next?</h3>
            <ol className="space-y-2 text-xs sm:text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="font-semibold text-green-600 flex-shrink-0">1.</span>
                <span>Go to your dashboard to set up WhatsApp numbers</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-green-600 flex-shrink-0">2.</span>
                <span>Create your first broadcast campaign</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-green-600 flex-shrink-0">3.</span>
                <span>Build chatbots to automate responses</span>
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link href="/dashboard" className="flex-1">
              <button className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base">
                Go to Dashboard
              </button>
            </Link>
            <Link href="/" className="flex-1">
              <button className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 transition-colors text-sm sm:text-base">
                Back to Home
              </button>
            </Link>
          </div>
        </div>

        {/* Support */}
        <div className="text-center">
          <p className="text-gray-600">
            Need help?{" "}
            <a href="mailto:support@pixelswhatsapp.com" className="text-green-600 hover:text-green-700 font-semibold">
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
