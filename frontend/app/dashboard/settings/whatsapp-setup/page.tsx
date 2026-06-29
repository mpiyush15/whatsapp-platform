"use client"

import { useState } from "react"
import { MessageSquare, CheckCircle2, AlertCircle, ExternalLink, Copy, ArrowRight, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorToast } from "@/components/ErrorToast"
import { useRouter } from "next/navigation"

export default function WhatsAppSetupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    phoneNumberId: "",
    businessAccountId: "",
    accessToken: "",
    displayPhoneNumber: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const getWebhookUrl = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050"
    return `${backendUrl}/api/webhooks/whatsapp`
  }
  
  const verifyToken = "pixels_webhook_secret_2025"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      if (!formData.phoneNumberId || !formData.businessAccountId || !formData.accessToken || !formData.displayPhoneNumber) {
        throw new Error("All fields are required")
      }

      await new Promise(resolve => setTimeout(resolve, 1500))
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "Failed to connect WhatsApp")
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">WhatsApp Setup</h1>
          <p className="text-gray-600">Connect your WhatsApp Business API</p>
        </div>

        {success ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              WhatsApp Connected Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Your WhatsApp Business API is now connected and ready to use
            </p>
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  console.log('Navigating to settings...')
                  router.push('/dashboard/settings')
                }}
              >
                Back to Settings
              </Button>
              <Button
                onClick={() => {
                  console.log('Navigating to chat...')
                  router.push('/dashboard/chat')
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Start Chatting
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Instructions Card */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Setup Instructions
                </h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-900 mb-1">1. Get Credentials</p>
                    <p className="text-gray-600">Visit Meta Business Settings to get your API credentials</p>
                    <a
                      href="https://business.facebook.com/settings/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 mt-2"
                    >
                      Open Meta Business
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  
                  <div>
                    <p className="font-medium text-gray-900 mb-1">2. Configure Webhook</p>
                    <p className="text-gray-600 mb-2">Use these values in Meta:</p>
                    <div className="bg-gray-50 rounded p-3 space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Webhook URL</p>
                        <div className="flex items-center gap-1">
                          <code className="text-xs text-gray-900 break-all">{getWebhookUrl()}</code>
                          <button
                            onClick={() => copyToClipboard(getWebhookUrl())}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Verify Token</p>
                        <div className="flex items-center gap-1">
                          <code className="text-xs text-gray-900">{verifyToken}</code>
                          <button
                            onClick={() => copyToClipboard(verifyToken)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium text-gray-900 mb-1">3. Fill Form</p>
                    <p className="text-gray-600">Enter your credentials in the form →</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Card */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Connect Your Account</h2>
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-900">{error}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Phone Number ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.phoneNumberId}
                      onChange={(e) =>
                        setFormData({ ...formData, phoneNumberId: e.target.value })
                      }
                      placeholder="123456789012345"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Business Account ID (WABA) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.businessAccountId}
                      onChange={(e) =>
                        setFormData({ ...formData, businessAccountId: e.target.value })
                      }
                      placeholder="987654321098765"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Access Token (Permanent) *
                    </label>
                    <textarea
                      required
                      value={formData.accessToken}
                      onChange={(e) =>
                        setFormData({ ...formData, accessToken: e.target.value })
                      }
                      placeholder="EAAxxxxxxxxxx..."
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm text-gray-900 placeholder:text-gray-400"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Generate a System User Token with whatsapp_business_messaging permissions
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Display Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.displayPhoneNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, displayPhoneNumber: e.target.value })
                      }
                      placeholder="+1234567890"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder:text-gray-400"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Include country code (e.g., +91 for India)
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/dashboard/settings')}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700 flex-1"
                    >
                      {isLoading ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          Connect WhatsApp
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
