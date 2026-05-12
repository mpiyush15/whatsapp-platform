"use client"

import { useState, useEffect } from "react"
import { X, Zap, AlertCircle, Loader2 } from "lucide-react"
import { API_URL } from "@/lib/config/api"

interface CreditPack {
  _id: string
  packId: string
  name: string
  description?: string
  credits: number
  bonusCredits?: number
  price: number
  isPopular?: boolean
}

interface Settings {
  minimumCreditAmount: number
  maximumCreditAmount: number
  enableCustomAmount: boolean
}

interface BuyCreditModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (credits: number) => void
  currentCredits?: number
  projectId?: string
}

export function BuyCreditModal({
  isOpen,
  onClose,
  onSuccess,
  currentCredits = 0,
  projectId,
}: BuyCreditModalProps) {
  const [packs, setPacks] = useState<CreditPack[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Selection state
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState<number | null>(null)
  const [isCustom, setIsCustom] = useState(false)

  // Payment state
  const [processingPayment, setProcessingPayment] = useState(false)

  const loadCashfreeSdk = async () => {
    if ((window as any).Cashfree) return

    const script = document.createElement('script')
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'

    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Cashfree SDK'))
      document.body.appendChild(script)
    })

    let retries = 0
    while (!(window as any).Cashfree && retries < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      retries += 1
    }

    if (!(window as any).Cashfree) {
      throw new Error('Cashfree SDK timeout')
    }
  }

  // Fetch credit packs on mount
  useEffect(() => {
    if (isOpen) {
      fetchCreditPacks()
    }
  }, [isOpen])

  const fetchCreditPacks = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem("token")
      if (!token) {
        setError("Not authenticated")
        return
      }

      const response = await fetch(`${API_URL}/subscriptions/credit-packs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data?.message || "Failed to fetch credit packs")
      }

      setPacks(data.data?.packs || [])
      setSettings(data.data?.settings || null)

      // Auto-select first pack
      if (data.data?.packs?.length > 0) {
        setSelectedPackId(data.data.packs[0].packId)
        setIsCustom(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load credit packs")
    } finally {
      setLoading(false)
    }
  }

  const handleBuyCredits = async () => {
    try {
      if (!selectedPackId && !isCustom) {
        setError("Please select a pack or custom amount")
        return
      }

      if (isCustom && !customAmount) {
        setError("Please enter an amount")
        return
      }

      if (isCustom && settings) {
        if (customAmount! < settings.minimumCreditAmount) {
          setError(`Minimum amount: ₹${settings.minimumCreditAmount}`)
          return
        }
        if (customAmount! > settings.maximumCreditAmount) {
          setError(`Maximum amount: ₹${settings.maximumCreditAmount}`)
          return
        }
      }

      setProcessingPayment(true)
      setError(null)

      const token = localStorage.getItem("token")
      if (!token) {
        setError("Not authenticated")
        return
      }

      const payload = {
        ...(isCustom ? { customAmount } : { packId: selectedPackId }),
        ...(projectId ? { projectId } : {}),
      }

      const response = await fetch(`${API_URL}/subscriptions/buy-credits`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data?.message || "Failed to initiate payment")
      }

      const paymentSessionId = data?.data?.paymentSessionId || data?.data?.sessionId
      if (!paymentSessionId) {
        throw new Error('No payment session returned')
      }

      await loadCashfreeSdk()

      const mode = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
      const cashfree = await (window as any).Cashfree({ mode })
      const result = await cashfree.checkout({
        paymentSessionId,
        redirectTarget: '_modal',
      })

      if (result?.error) {
        throw new Error(result.error?.message || 'Payment failed')
      }

      if (result?.paymentDetails) {
        onSuccess?.(Number(data?.data?.credits || 0))
        onClose()
        return
      }

      throw new Error('Checkout was closed before payment completion')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process payment")
    } finally {
      setProcessingPayment(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-yellow-600" />
            <div>
              <h2 className="text-xl font-bold">Buy Credits</h2>
              <p className="text-sm text-gray-600">Current balance: {currentCredits} credits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-gray-600">Loading credit packs...</p>
            </div>
          ) : (
            <>
              {/* Credit Packs Grid */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Select a pack</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {packs.map((pack) => {
                    const totalCredits = pack.credits + (pack.bonusCredits || 0)
                    const isSelected = selectedPackId === pack.packId && !isCustom
                    return (
                      <button
                        key={pack.packId}
                        onClick={() => {
                          setSelectedPackId(pack.packId)
                          setIsCustom(false)
                          setError(null)
                        }}
                        className={`p-4 rounded-lg border-2 transition text-left ${
                          isSelected
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-900">{pack.name}</p>
                            {pack.description && (
                              <p className="text-xs text-gray-600 mt-1">{pack.description}</p>
                            )}
                          </div>
                          {pack.isPopular && (
                            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                              Popular
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex justify-between items-end">
                          <div>
                            <p className="text-2xl font-bold text-gray-900">{totalCredits}</p>
                            <p className="text-xs text-gray-600">
                              {pack.bonusCredits ? `(+${pack.bonusCredits} bonus)` : ""}
                            </p>
                          </div>
                          <p className="text-lg font-semibold text-gray-900">₹{pack.price}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Custom Amount */}
              {settings?.enableCustomAmount && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="radio"
                      id="custom-amount"
                      checked={isCustom}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setIsCustom(true)
                          setError(null)
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor="custom-amount" className="text-sm font-semibold text-gray-700">
                      Custom amount
                    </label>
                  </div>

                  {isCustom && (
                    <div className="pl-7 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 font-medium">₹</span>
                        <input
                          type="number"
                          value={customAmount || ""}
                          onChange={(e) => {
                            setCustomAmount(e.target.value ? parseInt(e.target.value) : null)
                            setError(null)
                          }}
                          placeholder={`Min: ₹${settings.minimumCreditAmount}`}
                          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                      <p className="text-xs text-gray-600">
                        Min: ₹{settings.minimumCreditAmount} | Max: ₹{settings.maximumCreditAmount}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={processingPayment}
            className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleBuyCredits}
            disabled={processingPayment || loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processingPayment ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Proceed to Payment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
