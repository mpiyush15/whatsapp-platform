"use client"

import { useState, useEffect } from "react"
import { API_URL } from "@/lib/config/api"
import DataTable from "@/components/DataTable"
import OrganizationDetailsDrawer from "@/components/OrganizationDetailsDrawer"

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${API_URL}/admin/organizations`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })

        if (!response.ok) throw new Error("Failed to fetch")
        
        const data = await response.json()
        let orgs = []
        if (Array.isArray(data.data)) {
          orgs = data.data
        } else if (data.data?.data && Array.isArray(data.data.data)) {
          orgs = data.data.data
        } else if (data.data) {
          orgs = Object.values(data.data || {})
        }
        
        setOrganizations(orgs)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchOrgs()
  }, [])

  const columns = [
    {
      key: "accountId",
      label: "Account ID",
      render: (value) => <span className="font-mono text-sm font-semibold">{value}</span>
    },
    {
      key: "name",
      label: "Name"
    },
    {
      key: "email",
      label: "Email"
    },
    {
      key: "type",
      label: "Type",
      render: (value) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          value === 'internal' ? 'bg-purple-100 text-purple-700' :
          value === 'client' ? 'bg-blue-100 text-blue-700' :
          'bg-green-100 text-green-700'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: "role",
      label: "Role",
      render: (value) => (
        <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700">
          {value}
        </span>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          value === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: "createdAt",
      label: "Created",
      render: (value) => new Date(value).toLocaleDateString('en-IN')
    }
  ]

  const actions = [
    {
      label: "View",
      onClick: (row) => {
        setSelectedOrg(row)
        setDrawerOpen(true)
      },
      variant: "primary" as const
    },
    {
      label: "Edit",
      onClick: (row) => alert(`Editing ${row.name}`),
      variant: "secondary" as const
    }
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
        <p className="text-gray-600 mt-2">Manage all registered organizations and clients</p>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Organizations</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{organizations.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {organizations.filter(o => o.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Clients</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {organizations.filter(o => o.type === 'client').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Agencies</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {organizations.filter(o => o.type === 'agency').length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <DataTable
          columns={columns}
          data={organizations}
          loading={loading}
          error={error}
          actions={actions}
          emptyMessage="No organizations found"
        />
      </div>

      {/* Organization Details Drawer */}
      <OrganizationDetailsDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedOrg(null)
        }}
        organization={selectedOrg}
      />
    </div>
  )
}

