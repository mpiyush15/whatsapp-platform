"use client"

import { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, RefreshCw, X } from "lucide-react"
import { API_URL } from "@/lib/config/api"
import { ErrorToast } from "@/components/ErrorToast"

interface CreditPack {
  _id: string
  packId: string
  name: string
  description?: string
  credits: number
  bonusCredits?: number
  price: number
  displayOrder?: number
  isPopular?: boolean
  isActive: boolean
}

interface Settings {
  minimumCreditPurchase: number
  minimumCreditAmount: number
  maximumCreditAmount: number
  enableCustomAmount: boolean
  lowCreditWarningThreshold: number
  renewalReminderDays: number[]
}

type ViewState = "list" | "form" | "settings"

export default function CreditPacksPage() {
  const [view, setView] = useState<ViewState>("list")
  const [packs, setPacks] = useState<CreditPack[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingPack, setEditingPack] = useState<CreditPack | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    credits: "",
    bonusCredits: "",
    price: "",
    displayOrder: "",
    isPopular: false,
  })

  const fetchPacks = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/dashboard/superadmin/credit-packs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setPacks(data.data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch packs")
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/dashboard/superadmin/credit-packs/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSettings(data.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch settings")
    }
  }

  useEffect(() => {
    if (view === "list") {
      fetchPacks()
    } else if (view === "settings") {
      fetchSettings()
    }
  }, [view])

  const handleOpenCreate = () => {
    setEditingPack(null)
    setFormData({
      name: "",
      description: "",
      credits: "",
      bonusCredits: "",
      price: "",
      displayOrder: "",
      isPopular: false,
    })
    setView("form")
  }

  const handleOpenEdit = (pack: CreditPack) => {
    setEditingPack(pack)
    setFormData({
      name: pack.name,
      description: pack.description || "",
      credits: pack.credits.toString(),
      bonusCredits: (pack.bonusCredits || 0).toString(),
      price: pack.price.toString(),
      displayOrder: (pack.displayOrder || 0).toString(),
      isPopular: pack.isPopular || false,
    })
    setView("form")
  }

  const handleSavePack = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const token = localStorage.getItem("token")

      const payload = {
        name: formData.name,
        description: formData.description,
        credits: parseInt(formData.credits),
        bonusCredits: parseInt(formData.bonusCredits) || 0,
        price: parseInt(formData.price),
        displayOrder: parseInt(formData.displayOrder) || 0,
        isPopular: formData.isPopular,
      }

      const url = editingPack
        ? `${API_URL}/dashboard/superadmin/credit-packs/${editingPack.packId}`
        : `${API_URL}/dashboard/superadmin/credit-packs`

      const res = await fetch(url, {
        method: editingPack ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSuccess(editingPack ? "✅ Pack updated!" : "✅ Pack created!")
        setView("list")
        await fetchPacks()
        setTimeout(() => setSuccess(null), 2000)
      } else {
        setError(data.error || "Failed to save pack")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving pack")
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePack = async (packId: string) => {
    if (!confirm("Delete this pack?")) return

    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/dashboard/superadmin/credit-packs/${packId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setSuccess("✅ Pack deleted")
        await fetchPacks()
        setTimeout(() => setSuccess(null), 2000)
      }
    } catch (err) {
      setError("Delete failed")
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const token = localStorage.getItem("token")

      const res = await fetch(`${API_URL}/dashboard/superadmin/credit-packs/settings`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSuccess("✅ Settings updated!")
        setTimeout(() => setSuccess(null), 2000)
      } else {
        setError(data.error || "Failed to save settings")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving settings")
    } finally {
      setLoading(false)
    }
  }

  // LIST VIEW
  if (view === "list") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
        {success && (
          <div className="fixed top-4 right-4 p-3 bg-green-100 border border-green-300 rounded text-green-700 text-sm z-50">
            {success}
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Credit Packs</h1>
              <p className="text-gray-600 text-sm">Manage credit packages available for purchase</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView("settings")}
                className="px-4 py-2 border border-gray-300 bg-white rounded-lg hover:bg-gray-50"
              >
                Settings
              </button>
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> Create Pack
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Credits</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Price</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {packs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No packs yet. Click "Create Pack" to add one.
                    </td>
                  </tr>
                ) : (
                  packs.map((pack) => (
                    <tr key={pack.packId} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold">{pack.name}</p>
                        {pack.description && <p className="text-xs text-gray-600">{pack.description}</p>}
                      </td>
                      <td className="px-6 py-4">
                        {pack.credits}
                        {pack.bonusCredits ? ` (+${pack.bonusCredits})` : ""}
                      </td>
                      <td className="px-6 py-4 font-semibold">₹{pack.price}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            pack.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {pack.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(pack)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePack(pack.packId)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // FORM VIEW
  if (view === "form") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}

        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">{editingPack ? "Edit Pack" : "Create Pack"}</h1>
            <button onClick={() => setView("list")} className="p-2 hover:bg-gray-200 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSavePack} className="bg-white rounded-lg shadow p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Pack Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Starter Pack"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Credits</label>
                <input
                  type="number"
                  required
                  value={formData.credits}
                  onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                  placeholder="1000"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bonus Credits</label>
                <input
                  type="number"
                  value={formData.bonusCredits}
                  onChange={(e) => setFormData({ ...formData, bonusCredits: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Price (₹)</label>
                <input
                  type="number"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="299"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Display Order</label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isPopular}
                onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Mark as popular</span>
            </label>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setView("list")}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Pack"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // SETTINGS VIEW
  if (view === "settings") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
        {success && (
          <div className="fixed top-4 right-4 p-3 bg-green-100 border border-green-300 rounded text-green-700 text-sm z-50">
            {success}
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Credit Pack Settings</h1>
            <button onClick={() => setView("list")} className="p-2 hover:bg-gray-200 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>

          {settings && (
            <form onSubmit={handleSaveSettings} className="bg-white rounded-lg shadow p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Minimum Credit Amount (₹)</label>
                <input
                  type="number"
                  value={settings.minimumCreditAmount}
                  onChange={(e) =>
                    setSettings({ ...settings, minimumCreditAmount: parseInt(e.target.value) || 50 })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-600 mt-1">Minimum rupees for custom purchase</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Maximum Credit Amount (₹)</label>
                <input
                  type="number"
                  value={settings.maximumCreditAmount}
                  onChange={(e) =>
                    setSettings({ ...settings, maximumCreditAmount: parseInt(e.target.value) || 100000 })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-600 mt-1">Maximum rupees per transaction</p>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.enableCustomAmount}
                  onChange={(e) => setSettings({ ...settings, enableCustomAmount: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Allow custom amounts</span>
              </label>

              <div>
                <label className="block text-sm font-medium mb-1">Low Credit Warning Threshold</label>
                <input
                  type="number"
                  value={settings.lowCreditWarningThreshold ?? 200}
                  onChange={(e) =>
                    setSettings({ ...settings, lowCreditWarningThreshold: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-600 mt-1">Show low-credit warning when balance is below this value</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Renewal Reminder Days (comma-separated)</label>
                <input
                  type="text"
                  value={(settings.renewalReminderDays || [15, 7, 3, 1]).join(",")}
                  onChange={(e) => {
                    const days = e.target.value
                      .split(",")
                      .map((value) => Number(value.trim()))
                      .filter((value) => Number.isFinite(value) && value > 0)
                    setSettings({ ...settings, renewalReminderDays: days })
                  }}
                  placeholder="15,7,3,1"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-600 mt-1">Example: 15,7,3,1 will trigger D-15, D-7, D-3, D-1 states</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )
  }
}
