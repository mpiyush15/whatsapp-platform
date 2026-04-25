"use client"

import { Megaphone, Plus, Calendar, Users, Send, MoreVertical, Loader, Edit, Trash2, Clock, CheckCircle, Eye, X, Copy, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorToast } from "@/components/ErrorToast"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { authService } from "@/lib/auth"

interface Broadcast {
  id: string
  name: string
  status: string
  sent: number
  delivered: number
  read: number
  date: string
}

interface BroadcastDetail {
  _id: string
  name: string
  messageType: string
  content: {
    text?: string
    templateName?: string
    templateParams?: string[]
    mediaUrl?: string
    mediaType?: string
  }
  recipients: {
    phoneNumbers?: string[]
    contactIds?: string[]
  }
  stats: {
    sent: number
    delivered: number
  }
}

export default function BroadcastsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  
  const user = authService.getCurrentUser()
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [stats, setStats] = useState({
    totalSent: 0,
    totalDelivered: 0,
    readRate: 0,
    scheduled: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [viewingBroadcast, setViewingBroadcast] = useState<BroadcastDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)
  const [hasWABA, setHasWABA] = useState<boolean | null>(null)
  const [checkingWABA, setCheckingWABA] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)

  useEffect(() => {
    // Check WABA connection first
    checkWABAConnection()
  }, [projectId])

  const checkWABAConnection = async () => {
    try {
      setCheckingWABA(true)
      const token = localStorage.getItem("token")
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/phone-numbers?projectId=${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      )

      if (!response.ok) {
        setHasWABA(false)
        setCheckingWABA(false)
        return
      }

      const data = await response.json()
      const hasPhones = data.phoneNumbers && data.phoneNumbers.length > 0
      setHasWABA(hasPhones)

      // Only fetch broadcasts if WABA is connected
      if (hasPhones) {
        fetchBroadcastsData()
      }
    } catch (err) {
      console.error("Error checking WABA:", err)
      setHasWABA(false)
    } finally {
      setCheckingWABA(false)
    }
  }

  const fetchBroadcastsData = async () => {
    if (!user?.accountId) return

    let isMounted = true

    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("token")
      
      // Check if token exists
      if (!token) {
        console.warn('⚠️ No token in localStorage, unable to fetch broadcasts');
        setError("Please login to view broadcasts")
        setLoading(false)
        return;
      }
      
      // Fetch broadcasts - first try to get all broadcasts for the account
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/broadcasts?projectId=${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      )

      if (!response.ok) {
        console.error('Broadcasts fetch failed:', response.status, response.statusText);
        setError(`Failed to fetch broadcasts (${response.status})`);
        setLoading(false);
        return;
      }

      const data = await response.json()
      
      if (!isMounted) return

      // Check if response is successful, regardless of HTTP status
      if (data.success || (data.data && !response.ok === false)) {
        const broadcastsList: Broadcast[] = (data.data?.broadcasts || []).map((broadcast: any) => ({
          id: broadcast._id,
          name: broadcast.name,
          status: broadcast.status,
          sent: broadcast.stats?.sent || 0,
          delivered: broadcast.stats?.delivered || broadcast.stats?.sent || 0,
          read: broadcast.stats?.read || 0,
          date: new Date(broadcast.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        }))

        setBroadcasts(broadcastsList)

        // Calculate stats
        const totalSent = broadcastsList.reduce((sum: number, b: Broadcast) => sum + b.sent, 0)
        const totalDelivered = broadcastsList.reduce((sum: number, b: Broadcast) => sum + b.delivered, 0)
        const scheduledCount = broadcastsList.filter((b: Broadcast) => b.status === 'scheduled').length
        const readRateValue = totalSent > 0 ? parseFloat(((totalDelivered / totalSent) * 100).toFixed(1)) : 0

        setStats({
          totalSent,
          totalDelivered,
          readRate: readRateValue,
          scheduled: scheduledCount
        })
      } else if (!response.ok) {
        // Only treat as error if HTTP response is not OK
        throw new Error(data.error || data.message || "Failed to fetch broadcasts")
      }
    } catch (err) {
      console.error("Error fetching broadcasts:", err)
      if (isMounted) {
        setError(err instanceof Error ? err.message : "Failed to load broadcasts")
      }
    } finally {
      if (isMounted) {
        setLoading(false)
      }
    }

    // Cleanup function
    return () => {
      isMounted = false
    }
  }

  useEffect(() => {
    if (!user?.accountId) return

    let isMounted = true

    const fetchBroadcasts = async () => {
      try {
        setLoading(true)
        setError("")
        const token = localStorage.getItem("token")
        
        // Check if token exists
        if (!token) {
          console.warn('⚠️ No token in localStorage, unable to fetch broadcasts');
          setError("Please login to view broadcasts")
          setLoading(false)
          return;
        }
        
        // Fetch broadcasts - first try to get all broadcasts for the account
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/broadcasts?projectId=${projectId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          }
        )

        if (!response.ok) {
          console.error('Broadcasts fetch failed:', response.status, response.statusText);
          setError(`Failed to fetch broadcasts (${response.status})`);
          setLoading(false);
          return;
        }

        const data = await response.json()
        
        if (!isMounted) return

        // Check if response is successful, regardless of HTTP status
        if (data.success || (data.data && !response.ok === false)) {
          const broadcastsList: Broadcast[] = (data.data?.broadcasts || []).map((broadcast: any) => ({
            id: broadcast._id,
            name: broadcast.name,
            status: broadcast.status,
            sent: broadcast.stats?.sent || 0,
            delivered: broadcast.stats?.delivered || broadcast.stats?.sent || 0,
            read: broadcast.stats?.read || 0,
            date: new Date(broadcast.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          }))

          setBroadcasts(broadcastsList)

          // Calculate stats
          const totalSent = broadcastsList.reduce((sum: number, b: Broadcast) => sum + b.sent, 0)
          const totalDelivered = broadcastsList.reduce((sum: number, b: Broadcast) => sum + b.delivered, 0)
          const scheduledCount = broadcastsList.filter((b: Broadcast) => b.status === 'scheduled').length
          const readRateValue = totalSent > 0 ? parseFloat(((totalDelivered / totalSent) * 100).toFixed(1)) : 0

          setStats({
            totalSent,
            totalDelivered,
            readRate: readRateValue,
            scheduled: scheduledCount
          })
        } else if (!response.ok) {
          // Only treat as error if HTTP response is not OK
          throw new Error(data.error || data.message || "Failed to fetch broadcasts")
        }
      } catch (err) {
        console.error("Error fetching broadcasts:", err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load broadcasts")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    // Fetch once on mount
    fetchBroadcasts()

    // Cleanup function
    return () => {
      isMounted = false
    }
  }, [user?.accountId, refreshKey, projectId])

  const handleSendBroadcast = async (broadcastId: string) => {
    setActionLoading(broadcastId)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/broadcasts/${broadcastId}/start?projectId=${projectId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        // Close menu and wait a moment before refreshing
        setOpenMenu(null)
        // Trigger refresh after 2 seconds to allow backend to update stats
        setTimeout(() => {
          setRefreshKey(prev => prev + 1)
        }, 2000)
      } else {
        alert(data.error || "Failed to send broadcast")
      }
    } catch (err) {
      alert("Error sending broadcast: " + (err instanceof Error ? err.message : "Unknown error"))
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteBroadcast = async (broadcastId: string) => {
    if (!confirm("Are you sure you want to delete this broadcast?")) return
    
    setActionLoading(broadcastId)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/broadcasts/${broadcastId}?projectId=${projectId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        setBroadcasts(broadcasts.filter(b => b.id !== broadcastId))
        setOpenMenu(null)
      } else {
        alert(data.error || "Failed to delete broadcast")
      }
    } catch (err) {
      alert("Error deleting broadcast: " + (err instanceof Error ? err.message : "Unknown error"))
    } finally {
      setActionLoading(null)
    }
  }

  const handleViewBroadcast = async (broadcastId: string) => {
    setLoadingDetail(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/broadcasts/${broadcastId}?projectId=${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      )
      const data = await response.json()
      if (data.success || data.data) {
        setViewingBroadcast(data.data)
        setOpenMenu(null)
      } else {
        alert(data.error || "Failed to fetch broadcast details")
      }
    } catch (err) {
      alert("Error fetching broadcast: " + (err instanceof Error ? err.message : "Unknown error"))
    } finally {
      setLoadingDetail(false)
    }
  }

  const copyToClipboard = (text: string, phone: string) => {
    navigator.clipboard.writeText(text)
    setCopiedPhone(phone)
    setTimeout(() => setCopiedPhone(null), 2000)
  }

  // Show blocking message if WABA not connected
  if (checkingWABA) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Broadcasts</h1>
          </div>
        </div>
        <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
          <Loader className="h-8 w-8 text-gray-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Checking WhatsApp connection...</p>
        </div>
      </div>
    )
  }

  if (hasWABA === false) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Broadcasts</h1>
            <p className="text-gray-600 mt-1">Send bulk messages to your contacts</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-8">
          <div className="flex gap-4">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-red-900 mb-3">WhatsApp Business Account Not Connected</h2>
              <p className="text-red-700 mb-4">
                You must connect a WhatsApp Business Account (WABA) before creating broadcasts.
              </p>
              <div className="bg-white rounded p-4 mb-4 text-sm text-gray-700">
                <p className="font-semibold mb-3">To connect your WhatsApp account:</p>
                <ol className="space-y-2 list-decimal list-inside">
                  <li>Go to <strong>Dashboard → Settings</strong></li>
                  <li>Click <strong>"Add Phone Number"</strong></li>
                  <li>Enter your <strong>Phone Number ID</strong>, <strong>WABA ID</strong>, and <strong>Access Token</strong></li>
                  <li>Click <strong>"Add"</strong> to complete setup</li>
                </ol>
              </div>
              <Link href={`/projects/${projectId}/settings?tab=whatsapp`}>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Go to WhatsApp Setup
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Broadcasts</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Send bulk messages to your contacts</p>
        </div>
        <Link href={`/projects/${projectId}/broadcasts/create`}>
          <Button className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            New Broadcast
          </Button>
        </Link>
      </div>

      {/* Stats Cards - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Total Sent</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{stats.totalSent.toLocaleString()}</p>
            </div>
            <Send className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Delivered</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{stats.totalDelivered.toLocaleString()}</p>
            </div>
            <Megaphone className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Delivery Rate</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{stats.readRate}%</p>
            </div>
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 flex-shrink-0" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Scheduled</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{stats.scheduled}</p>
            </div>
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Broadcasts Table/Cards */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Filter Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex flex-wrap gap-0 px-3 sm:px-6 pt-4">
            {[
              { label: "All Broadcasts", value: null },
              { label: "Draft", value: "draft", icon: "📝", count: broadcasts.filter(b => b.status === "draft").length },
              { label: "Scheduled", value: "scheduled", icon: "⏰", count: broadcasts.filter(b => b.status === "scheduled").length },
              { label: "Running", value: "running", icon: "▶️", count: broadcasts.filter(b => b.status === "running").length },
              { label: "Completed", value: "completed", icon: "✅", count: broadcasts.filter(b => b.status === "completed").length },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterStatus(tab.value)}
                className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  filterStatus === tab.value
                    ? "border-green-600 text-green-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                <span className="hidden sm:inline">{tab.icon} </span>
                {tab.label}
                {tab.count !== undefined && <span className="ml-1 text-xs bg-gray-200 px-2 py-0.5 rounded-full">{tab.count}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 sm:p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-6 w-6 animate-spin text-gray-600" />
              <span className="ml-2 text-gray-600">Loading broadcasts...</span>
            </div>
          ) : broadcasts.filter(b => !filterStatus || b.status === filterStatus).length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">{filterStatus ? `No ${filterStatus} broadcasts` : "No broadcasts yet"}</p>
              <Link href={`/projects/${projectId}/broadcasts/create`}>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Broadcast
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Table - Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Type</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Sent</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Delivered</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {broadcasts
                      .filter(b => !filterStatus || b.status === filterStatus)
                      .map((broadcast) => (
                        <tr key={broadcast.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{broadcast.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">Text</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900 font-medium">{broadcast.sent.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900 font-medium">{broadcast.delivered.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                              broadcast.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : broadcast.status === "running"
                                ? "bg-blue-100 text-blue-700"
                                : broadcast.status === "scheduled"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-gray-100 text-gray-700"
                            }`}>
                              {broadcast.status.charAt(0).toUpperCase() + broadcast.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{broadcast.date}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="relative">
                              <button 
                                onClick={() => setOpenMenu(openMenu === broadcast.id ? null : broadcast.id)}
                                className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-200 rounded transition"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              
                              {openMenu === broadcast.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999]">
                                  <button
                                    onClick={() => handleViewBroadcast(broadcast.id)}
                                    disabled={loadingDetail}
                                    className="block w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-200 text-blue-600 disabled:opacity-50 text-sm"
                                  >
                                    {loadingDetail ? (
                                      <Loader className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                    <span>{loadingDetail ? "Loading..." : "View Details"}</span>
                                  </button>
                                  {broadcast.status === "draft" && (
                                    <>
                                      <Link 
                                        href={`/projects/${projectId}/broadcasts/edit/${broadcast.id}`}
                                        className="block w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-200 text-sm"
                                      >
                                        <Edit className="h-4 w-4" />
                                        <span>Edit</span>
                                      </Link>
                                      <button
                                        onClick={() => handleSendBroadcast(broadcast.id)}
                                        disabled={actionLoading === broadcast.id}
                                        className="block w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-200 text-green-600 disabled:opacity-50 text-sm"
                                      >
                                        {actionLoading === broadcast.id ? (
                                          <Loader className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Send className="h-4 w-4" />
                                        )}
                                        <span>{actionLoading === broadcast.id ? "Sending..." : "Send Now"}</span>
                                      </button>
                                    </>
                                  )}
                                  
                                  {broadcast.status === "completed" && (
                                    <button
                                      onClick={() => handleSendBroadcast(broadcast.id)}
                                      disabled={actionLoading === broadcast.id}
                                      className="block w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-200 text-green-600 disabled:opacity-50 text-sm"
                                    >
                                      {actionLoading === broadcast.id ? (
                                        <Loader className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4" />
                                      )}
                                      <span>{actionLoading === broadcast.id ? "Sending..." : "Send Again"}</span>
                                    </button>
                                  )}

                                  {broadcast.status === "scheduled" && (
                                    <button
                                      onClick={() => handleSendBroadcast(broadcast.id)}
                                      disabled={actionLoading === broadcast.id}
                                      className="block w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-200 text-blue-600 disabled:opacity-50 text-sm"
                                    >
                                      {actionLoading === broadcast.id ? (
                                        <Loader className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Clock className="h-4 w-4" />
                                      )}
                                      <span>{actionLoading === broadcast.id ? "Sending..." : "Send Now"}</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleDeleteBroadcast(broadcast.id)}
                                    disabled={actionLoading === broadcast.id}
                                    className="block w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600 disabled:opacity-50 text-sm"
                                  >
                                    {actionLoading === broadcast.id ? (
                                      <Loader className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                    <span>{actionLoading === broadcast.id ? "Deleting..." : "Delete"}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Cards - Mobile View */}
              <div className="md:hidden space-y-3">
                {broadcasts
                  .filter(b => !filterStatus || b.status === filterStatus)
                  .map((broadcast) => (
                    <div key={broadcast.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{broadcast.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">{broadcast.date}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                          broadcast.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : broadcast.status === "running"
                            ? "bg-blue-100 text-blue-700"
                            : broadcast.status === "scheduled"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {broadcast.status.charAt(0).toUpperCase() + broadcast.status.slice(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500">Sent</p>
                          <p className="font-bold text-gray-900">{broadcast.sent.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Delivered</p>
                          <p className="font-bold text-gray-900">{broadcast.delivered.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Read</p>
                          <p className="font-bold text-gray-900">{broadcast.read.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="relative">
                        <button 
                          onClick={() => setOpenMenu(openMenu === broadcast.id ? null : broadcast.id)}
                          className="w-full text-sm text-gray-600 hover:text-gray-900 px-2 py-2 hover:bg-gray-100 rounded flex items-center justify-center gap-2"
                        >
                          <MoreVertical className="h-4 w-4" /> Options
                        </button>
                        
                        {openMenu === broadcast.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999]">
                            <button
                              onClick={() => handleViewBroadcast(broadcast.id)}
                              disabled={loadingDetail}
                              className="block w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-200 text-blue-600 disabled:opacity-50 text-sm"
                            >
                              {loadingDetail ? (
                                <Loader className="h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                              <span>Details</span>
                            </button>
                            {broadcast.status === "draft" && (
                              <>
                                <Link 
                                  href={`/projects/${projectId}/broadcasts/edit/${broadcast.id}`}
                                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-200 text-sm"
                                >
                                  <Edit className="h-4 w-4" />
                                  <span>Edit</span>
                                </Link>
                                <button
                                  onClick={() => handleSendBroadcast(broadcast.id)}
                                  disabled={actionLoading === broadcast.id}
                                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-200 text-green-600 disabled:opacity-50 text-sm"
                                >
                                  {actionLoading === broadcast.id ? (
                                    <Loader className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                  <span>Send</span>
                                </button>
                              </>
                            )}
                            
                            {broadcast.status === "completed" && (
                              <button
                                onClick={() => handleSendBroadcast(broadcast.id)}
                                disabled={actionLoading === broadcast.id}
                                className="block w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-200 text-green-600 disabled:opacity-50 text-sm"
                              >
                                {actionLoading === broadcast.id ? (
                                  <Loader className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                <span>Again</span>
                              </button>
                            )}

                            {broadcast.status === "scheduled" && (
                              <button
                                onClick={() => handleSendBroadcast(broadcast.id)}
                                disabled={actionLoading === broadcast.id}
                                className="block w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-200 text-blue-600 disabled:opacity-50 text-sm"
                              >
                                {actionLoading === broadcast.id ? (
                                  <Loader className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Clock className="h-4 w-4" />
                                )}
                                <span>Send</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteBroadcast(broadcast.id)}
                              disabled={actionLoading === broadcast.id}
                              className="block w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600 disabled:opacity-50 text-sm"
                            >
                              {actionLoading === broadcast.id ? (
                                <Loader className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* View Details Modal */}
      {viewingBroadcast && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-white">{viewingBroadcast.name}</h2>
                <p className="text-blue-100 text-sm mt-1">Message Details</p>
              </div>
              <button
                onClick={() => setViewingBroadcast(null)}
                className="text-white hover:bg-blue-500 p-2 rounded transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Message Content */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Message Content</h3>
                <div className="bg-white p-4 rounded border border-gray-200">
                  {viewingBroadcast.messageType === "text" && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Text Message:</p>
                      <p className="text-gray-900 whitespace-pre-wrap">{viewingBroadcast.content.text}</p>
                    </div>
                  )}
                  {viewingBroadcast.messageType === "template" && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Template:</p>
                      <p className="text-gray-900 font-medium">{viewingBroadcast.content.templateName}</p>
                      {viewingBroadcast.content.templateParams && viewingBroadcast.content.templateParams.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600 mb-2">Parameters:</p>
                          <ul className="space-y-1">
                            {viewingBroadcast.content.templateParams.map((param, idx) => (
                              <li key={idx} className="text-sm text-gray-700">• {param}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {viewingBroadcast.messageType === "media" && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Media ({viewingBroadcast.content.mediaType}):</p>
                      <p className="text-gray-900 text-sm break-all">{viewingBroadcast.content.mediaUrl}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-gray-600">Total Sent</p>
                  <p className="text-2xl font-bold text-blue-600">{viewingBroadcast.stats?.sent || 0}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-gray-600">Delivered</p>
                  <p className="text-2xl font-bold text-green-600">{viewingBroadcast.stats?.delivered || 0}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm text-gray-600">Rate</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {viewingBroadcast.stats?.sent ? 
                      ((viewingBroadcast.stats.delivered / viewingBroadcast.stats.sent) * 100).toFixed(1) 
                      : 0}%
                  </p>
                </div>
              </div>

              {/* Recipients */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Recipients ({viewingBroadcast.recipients?.phoneNumbers?.length || 0})</h3>
                {viewingBroadcast.recipients?.phoneNumbers && viewingBroadcast.recipients.phoneNumbers.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {viewingBroadcast.recipients.phoneNumbers.map((phone, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-3 rounded border border-gray-200 flex items-center justify-between hover:bg-gray-50"
                      >
                        <span className="text-gray-900 font-mono text-sm">{phone}</span>
                        <button
                          onClick={() => copyToClipboard(phone, phone)}
                          className="p-1 hover:bg-gray-200 rounded transition ml-2"
                          title="Copy to clipboard"
                        >
                          {copiedPhone === phone ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded text-center text-gray-500">
                    No recipients found
                  </div>
                )}
              </div>

              {/* Download Button */}
              <button
                onClick={() => {
                  const phones = viewingBroadcast.recipients?.phoneNumbers?.join("\n") || ""
                  const element = document.createElement("a")
                  element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(phones))
                  element.setAttribute("download", `${viewingBroadcast.name}_recipients.txt`)
                  element.style.display = "none"
                  document.body.appendChild(element)
                  element.click()
                  document.body.removeChild(element)
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
              >
                Download Recipients List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
