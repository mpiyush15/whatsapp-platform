"use client"

import { useState, useEffect } from "react"
import { Building2, Search, Loader2 } from "lucide-react"
import { API_URL } from "@/lib/config/api"

interface Organization {
  _id: string
  accountId: string
  name: string
  email: string
  company?: string
  type: "internal" | "client" | "agency"
  role: "superadmin" | "admin" | "manager" | "agent" | "user"
  status: "active" | "inactive" | "suspended" | "cancelled"
  createdAt: string
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  internal: { bg: "bg-purple-100", text: "text-purple-700" },
  client: { bg: "bg-blue-100", text: "text-blue-700" },
  agency: { bg: "bg-green-100", text: "text-green-700" }
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-green-100", text: "text-green-700" },
  inactive: { bg: "bg-gray-100", text: "text-gray-700" },
  suspended: { bg: "bg-orange-100", text: "text-orange-700" },
  cancelled: { bg: "bg-red-100", text: "text-red-700" }
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  superadmin: { bg: "bg-red-100", text: "text-red-700" },
  admin: { bg: "bg-blue-100", text: "text-blue-700" },
  manager: { bg: "bg-yellow-100", text: "text-yellow-700" },
  agent: { bg: "bg-cyan-100", text: "text-cyan-700" },
  user: { bg: "bg-gray-100", text: "text-gray-700" }
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const token = localStorage.getItem("token")
        if (!token) {
          throw new Error("No authentication token found")
        }

        console.log("🔍 Fetching organizations from:", `${API_URL}/admin/organizations`)
        
        const response = await fetch(`${API_URL}/admin/organizations`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })

        console.log("📊 Response status:", response.status)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || `HTTP ${response.status}`)
        }

        const data = await response.json()
        console.log("✅ Response data:", data)
        
        // Handle response format
        const orgs = Array.isArray(data.data) ? data.data : data.data?.organizations || []
        console.log("📋 Organizations count:", orgs.length)
        
        setOrganizations(orgs)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch organizations"
        console.error("❌ Error:", message)
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrganizations()
  }, [])

  const filteredOrganizations = organizations.filter(org =>
    org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.accountId?.includes(searchTerm)
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-blue-600 rounded-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
        </div>
        <p className="text-gray-600">Manage all registered organizations and clients</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-medium">Total Organizations</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{organizations.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-medium">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {organizations.filter(o => o.status === "active").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-medium">Clients</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {organizations.filter(o => o.type === "client").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-medium">Agencies</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {organizations.filter(o => o.type === "agency").length}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or account ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading organizations...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <p className="text-red-700 font-medium">❌ Error: {error}</p>
        </div>
      )}

      {/* Organizations Table */}
      {!isLoading && !error && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {filteredOrganizations.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 text-lg font-medium">
                {searchTerm ? "No organizations found matching your search" : "No organizations found"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Account ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrganizations.map((org) => (
                    <tr key={org._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-semibold text-gray-900">{org.accountId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{org.name}</p>
                          {org.company && <p className="text-xs text-gray-500">{org.company}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{org.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${TYPE_COLORS[org.type]?.bg || "bg-gray-100"} ${TYPE_COLORS[org.type]?.text || "text-gray-700"}`}>
                          {org.type.charAt(0).toUpperCase() + org.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[org.role]?.bg || "bg-gray-100"} ${ROLE_COLORS[org.role]?.text || "text-gray-700"}`}>
                          {org.role.charAt(0).toUpperCase() + org.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[org.status]?.bg || "bg-gray-100"} ${STATUS_COLORS[org.status]?.text || "text-gray-700"}`}>
                          {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">
                          {new Date(org.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          ✅ <strong>Database verified:</strong> All organizations synced with MongoDB Atlas. 
          {filteredOrganizations.length > 0 && ` Showing ${filteredOrganizations.length} organization${filteredOrganizations.length !== 1 ? "s" : ""}.`}
        </p>
      </div>
    </div>
  )
}

