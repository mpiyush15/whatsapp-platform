"use client"

import { Building2, Plus, Search, MoreVertical, Users, TrendingUp, DollarSign, Activity, X, Bell, Mail } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import { Button } from "@/components/ui/button"
import { ErrorToast } from "@/components/ErrorToast"
import InvoiceTemplate from "@/components/InvoiceTemplate"
import Link from "next/link"
import { useState, useEffect } from "react"
import { API_URL } from "@/lib/config/api"

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<any>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const [isGeneratingPaymentLink, setIsGeneratingPaymentLink] = useState(false)
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<any>(null)
  const [availablePlans, setAvailablePlans] = useState<any[]>([])
  const [isPaymentLinkModal, setIsPaymentLinkModal] = useState(false)
  const [isEmailDrawerOpen, setIsEmailDrawerOpen] = useState(false)
  const [selectedOrgForEmail, setSelectedOrgForEmail] = useState<any>(null)
  const [emailType, setEmailType] = useState("payment_reminder")
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailMessage, setEmailMessage] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [invoicePreview, setInvoicePreview] = useState<any>(null)
  const [showInvoicePreview, setShowInvoicePreview] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    countryCode: "+91",
    phoneNumber: "",
    plan: "free",
    status: "active",
    billingCycle: "monthly"
  })

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem("token")
        
        console.log('🔍 [Organizations] Token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN')
        console.log('🔍 [Organizations] Fetching from:', `${API_URL}/admin/organizations`)
        
        const response = await fetch(`${API_URL}/admin/organizations`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })

        console.log('🔍 [Organizations] Response status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('🔍 [Organizations] Error response:', errorText)
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const data = await response.json()
        console.log('🔍 [Organizations] Response data:', data)
        console.log('🔍 [Organizations] data.data type:', typeof data.data, 'is array:', Array.isArray(data.data))
        console.log('🔍 [Organizations] Setting organizations:', Array.isArray(data.data) ? data.data : [])
        
        setOrganizations(Array.isArray(data.data) ? data.data : [])
      } catch (err) {
        console.error("❌ Error fetching organizations:", err)
        setError("Failed to load organizations")
      } finally {
        setIsLoading(false)
      }
    }

    // Fetch available pricing plans
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${API_URL}/pricing/plans/public`)
        if (response.ok) {
          const data = await response.json()
          setAvailablePlans(data.data || [])
        }
      } catch (err) {
        console.error("Error fetching plans:", err)
      }
    }

    fetchOrganizations()
    fetchPlans()
  }, [])

  const filteredOrganizations = Array.isArray(organizations) ? organizations.filter(org =>
    org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : []

  const handleAddOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem("token")
      
      // Calculate next billing date based on billing cycle
      const signupDate = new Date()
      let nextBillingDate = new Date(signupDate)
      
      if (formData.billingCycle === "monthly") {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
      } else if (formData.billingCycle === "quarterly") {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 3)
      } else if (formData.billingCycle === "annually") {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
      }
      
      const dataToSend = {
        ...formData,
        nextBillingDate: nextBillingDate.toISOString()
      }
      
      const response = await fetch(`${API_URL}/admin/organizations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(dataToSend)
      })

      if (!response.ok) {
        throw new Error("Failed to create organization")
      }

      // Refresh organizations list
      const data = await response.json()
      setOrganizations([...organizations, data.data])
      setFormData({ name: "", email: "", password: "", countryCode: "+91", phoneNumber: "", plan: "free", status: "active", billingCycle: "monthly" })
      setIsDrawerOpen(false)
    } catch (err) {
      console.error("Error creating organization:", err)
      alert("Failed to create organization")
    }
  }

  // Refresh/Sync invoices for selected organization
  const handleRefreshInvoices = async () => {
    if (!selectedOrg) return
    
    const token = localStorage.getItem("token")
    const orgAccountId = selectedOrg.accountId
    
    console.log("🔄 Refreshing invoices for accountId:", orgAccountId)
    
    try {
      let invoices = []
      
      // Primary: Fetch by accountId
      if (orgAccountId) {
        const invoiceResponse = await fetch(`${API_URL}/billing/admin/invoices?accountId=${orgAccountId}&limit=100`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })
        
        if (invoiceResponse.ok) {
          const invoiceData = await invoiceResponse.json()
          invoices = invoiceData.data || []
          console.log("✅ Found", invoices.length, "invoices by accountId")
        }
      }
      
      // Fallback: Fetch all and filter
      if (invoices.length === 0) {
        console.log("⚠️ Trying fallback search...")
        const allResponse = await fetch(`${API_URL}/billing/admin/invoices?limit=200`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })
        
        if (allResponse.ok) {
          const allData = await allResponse.json()
          const allInvoices = allData.data || []
          
          invoices = allInvoices.filter((inv: any) => 
            inv.accountId === orgAccountId || 
            inv.accountId === selectedOrg._id ||
            inv.accountId === selectedOrg._id.toString()
          )
          console.log("✅ Found", invoices.length, "invoices in fallback search")
        }
      }
      
      // Update state
      setSelectedOrg({
        ...selectedOrg,
        _invoices: invoices
      })
      
      alert(`✅ Synced! Found ${invoices.length} invoice(s)`)
    } catch (err) {
      console.error("Error refreshing invoices:", err)
      alert("Failed to refresh invoices")
    }
  }

  const handleOpenDetails = async (org: any) => {
    setSelectedOrg(org)
    setEditData({ ...org })
    setIsDetailDrawerOpen(true)
    setIsEditMode(false)
    
    // ✅ Fetch invoices and transactions using accountId
    try {
      const token = localStorage.getItem("token")
      const orgAccountId = org.accountId // Use the 7-digit accountId (YYXXXXX format)
      const orgId = org._id // MongoDB ObjectId
      
      console.log("📦 Fetching details for organization:", org.name)
      console.log("   - MongoDB ID (_id):", orgId)
      console.log("   - Account ID (accountId):", orgAccountId)
      
      // Fetch invoices directly using the accountId
      let invoices = []
      if (orgAccountId) {
        console.log("📋 Fetching invoices for accountId:", orgAccountId)
        try {
          const invoiceResponse = await fetch(`${API_URL}/billing/admin/invoices?accountId=${orgAccountId}`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          })
          
          if (invoiceResponse.ok) {
            const invoiceData = await invoiceResponse.json()
            invoices = invoiceData.data || []
            console.log("✅ Invoices fetched by accountId:", invoices.length, "found")
            invoices.forEach((inv: any, idx: number) => {
              console.log(`   [${idx + 1}] ${inv.invoiceNumber} - ₹${inv.amount} (${inv.status})`)
            })
          } else {
            console.warn("⚠️ Invoice fetch returned status:", invoiceResponse.status)
          }
        } catch (e) {
          console.error("❌ Error fetching invoices by accountId:", e)
        }
      } else {
        console.warn("⚠️ No accountId found for organization")
      }
      
      // If no invoices found by accountId, try to fetch by searching all and filtering
      if (invoices.length === 0) {
        console.log("⚠️ No invoices by accountId, attempting fallback search...")
        try {
          const allInvoicesResponse = await fetch(`${API_URL}/billing/admin/invoices?limit=100`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          })
          
          if (allInvoicesResponse.ok) {
            const allInvoiceData = await allInvoicesResponse.json()
            const allInvoices = allInvoiceData.data || []
            
            // Filter invoices that match this org's accountId or might be linked via subscription
            invoices = allInvoices.filter((inv: any) => {
              const matchesAccountId = inv.accountId === orgAccountId
              const matchesOrgId = inv.accountId === orgId || inv.accountId === orgId.toString()
              return matchesAccountId || matchesOrgId
            })
            
            console.log("✅ Invoices found via fallback search:", invoices.length)
            invoices.forEach((inv: any, idx: number) => {
              console.log(`   [${idx + 1}] ${inv.invoiceNumber} - ₹${inv.amount} (${inv.status})`)
            })
          }
        } catch (e) {
          console.error("❌ Error in fallback search:", e)
        }
      }
      
      // Also fetch organization details for updated info
      try {
        const orgResponse = await fetch(`${API_URL}/admin/organizations/${org._id}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })
        
        if (orgResponse.ok) {
          const orgData = await orgResponse.json()
          console.log("✅ Organization details updated")
          
          // ✅ Update selectedOrg with invoices and latest org data
          setSelectedOrg({
            ...orgData.data,
            _invoices: invoices // Use fetched invoices
          })
          setEditData(orgData.data)
        }
      } catch (e) {
        console.error("Error fetching org details:", e)
        // Still show invoices even if org detail fetch fails
        setSelectedOrg({
          ...org,
          _invoices: invoices
        })
      }
    } catch (err) {
      console.error("Error in handleOpenDetails:", err)
      alert("Failed to load organization details")
    }
  }

  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Update form submitted")
    try {
      const token = localStorage.getItem("token")
      
      // Calculate next billing date based on signup date + billing cycle
      let dataToSend = { ...editData }
      
      const signupDate = new Date(selectedOrg.createdAt || new Date())
      let nextBillingDate = new Date(signupDate)
      
      if (editData.billingCycle === "monthly") {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
      } else if (editData.billingCycle === "quarterly") {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 3)
      } else if (editData.billingCycle === "annually") {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
      }
      
      dataToSend.nextBillingDate = nextBillingDate.toISOString()
      
      // Add password if provided and send email
      if (newPassword) {
        dataToSend.password = newPassword
        dataToSend.sendEmail = true // Tell backend to send email
      }
      
      const response = await fetch(`${API_URL}/admin/organizations/${selectedOrg._id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(dataToSend)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to update organization`)
      }

      const data = await response.json()
      setOrganizations(organizations.map(org => org._id === selectedOrg._id ? data.data : org))
      setSelectedOrg(data.data)
      setEditData({ ...data.data })
      setNewPassword("")
      setShowPasswordSection(false)
      setIsEditMode(false)
      alert("Organization updated successfully" + (newPassword ? " and password email sent!" : ""))
    } catch (err) {
      console.error("Error updating organization:", err)
      alert(err instanceof Error ? err.message : "Failed to update organization")
    }
  }

  const handleDeleteOrganization = async () => {
    if (!confirm(`Are you sure you want to delete "${selectedOrg.email}"? This action cannot be undone.`)) {
      return
    }

    try {
      const token = localStorage.getItem("token")
      
      const response = await fetch(`${API_URL}/admin/organizations/${selectedOrg._id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        throw new Error("Failed to delete organization")
      }

      setOrganizations(organizations.filter(org => org._id !== selectedOrg._id))
      setIsDetailDrawerOpen(false)
      alert("Organization deleted successfully")
    } catch (err) {
      console.error("Error deleting organization:", err)
      alert("Failed to delete organization")
    }
  }

  const handleActivateUser = async (email: string, plan: string) => {
    if (!confirm(`Activate user ${email}? This will unlock their dashboard access.`)) {
      return
    }

    try {
      const token = localStorage.getItem("token")
      
      const response = await fetch(`${API_URL}/admin/change-user-status`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          status: "active",
          planName: plan
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to activate user")
      }

      // Update the organization in the list
      setOrganizations(organizations.map(org => 
        org.email === email 
          ? { ...org, status: "active" }
          : org
      ))
      
      alert("User activated successfully! Dashboard is now unlocked.")
    } catch (err) {
      console.error("Error activating user:", err)
      alert(err instanceof Error ? err.message : "Failed to activate user")
    }
  }

  // Generate random password and send via email
  const handleGenerateAndSendPassword = async () => {
    try {
      setIsGeneratingPassword(true)
      const token = localStorage.getItem("token")

      // Generate random password
      const generatePassword = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%"
        let password = ""
        for (let i = 0; i < 12; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return password
      }

      const generatedPassword = generatePassword()
      setNewPassword(generatedPassword)

      // Update password in database and send email
      const response = await fetch(`${API_URL}/admin/organizations/${selectedOrg._id}/reset-password`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password: generatedPassword,
          sendEmail: true
        })
      })

      if (!response.ok) {
        throw new Error("Failed to reset password")
      }

      alert(`✅ Password generated and sent to ${selectedOrg.email}!\n\nTemporary Password: ${generatedPassword}`)
    } catch (err) {
      console.error("Error generating password:", err)
      alert("Failed to generate password")
    } finally {
      setIsGeneratingPassword(false)
    }
  }

  // 💳 Generate Payment Link for Client
  const handleGeneratePaymentLink = async () => {
    if (!selectedPlanForPayment) {
      alert("Please select a plan")
      return
    }

    try {
      setIsGeneratingPaymentLink(true)
      const token = localStorage.getItem("token")

      const response = await fetch(`${API_URL}/admin/organizations/${selectedOrg._id}/generate-payment-link`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          planId: selectedPlanForPayment._id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to generate payment link")
      }

      const data = await response.json()
      
      alert(`✅ Payment link generated!\n\nInvoice: ${data.data.invoiceNumber}\nAmount: ₹${data.data.amount}\n\n📧 Email sent to client`)
      
      setIsPaymentLinkModal(false)
      setSelectedPlanForPayment(null)
      
      // Refresh organizations list
      const orgResponse = await fetch(`${API_URL}/admin/organizations`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      if (orgResponse.ok) {
        const orgData = await orgResponse.json()
        setOrganizations(orgData.data || [])
      }
    } catch (err) {
      console.error("Error generating payment link:", err)
      alert(`❌ ${err instanceof Error ? err.message : "Failed to generate payment link"}`)
    } finally {
      setIsGeneratingPaymentLink(false)
    }
  }

  // 📋 Create Free Invoice for Client
  const handleCreateInvoice = async () => {
    try {
      if (!selectedOrg || !selectedOrg._id) {
        alert("❌ Error: Organization data not available. Please try again.")
        return
      }

      setIsGeneratingPaymentLink(true)
      const token = localStorage.getItem("token")
      
      console.log("📋 Creating invoice for:", selectedOrg?.name, "ID:", selectedOrg?._id)
      console.log("🔑 Token present:", !!token)

      // Calculate next billing date based on plan and purchase date
      const purchaseDate = new Date()
      let nextBillingDate = new Date(purchaseDate)
      const billingCycle = selectedOrg.billingCycle || "monthly"
      
      if (billingCycle === "monthly") {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
      } else if (billingCycle === "quarterly") {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 3)
      } else if (billingCycle === "annually") {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
      }
      
      console.log(`📅 Billing Cycle: ${billingCycle}`)
      console.log(`📅 Next Billing Date will be: ${nextBillingDate.toLocaleDateString('en-IN')}`)

      const response = await fetch(`${API_URL}/admin/organizations/${selectedOrg._id}/create-invoice`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: 0,
          description: `${selectedOrg.plan?.charAt(0).toUpperCase() + selectedOrg.plan?.slice(1) || "Plan"} Plan - ${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)} Billing`,
          nextBillingDate: nextBillingDate.toISOString(),
          billingCycle: billingCycle
        })
      })

      console.log("📡 Response status:", response.status, response.statusText)

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          console.error("❌ API Error Response:", response.status)
          console.error("📋 Full Error Data:", JSON.stringify(errorData, null, 2))
          errorMessage = errorData.message || errorData.error || errorData?.details?.message || errorMessage
          console.error("📝 Error Message:", errorMessage)
        } catch (e) {
          console.error("❌ Could not parse error response", e)
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log("✅ Invoice created:", data)
      
      alert(`✅ Free invoice created!\n\nInvoice: ${data.data.invoiceNumber}\nAmount: ₹${data.data.amount}`)
      
      setIsDetailDrawerOpen(false)
      
      // Refresh organizations list
      const orgResponse = await fetch(`${API_URL}/admin/organizations`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      if (orgResponse.ok) {
        const orgData = await orgResponse.json()
        setOrganizations(orgData.data || [])
      }
    } catch (err) {
      console.error("Error creating invoice:", err)
      alert(`❌ ${err instanceof Error ? err.message : "Failed to create invoice"}`)
    } finally {
      setIsGeneratingPaymentLink(false)
    }
  }


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Registered Users & Organizations</h1>
          <p className="text-gray-600 mt-1">View all registered users using our services</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            Total Users: <span className="font-bold text-green-600">{organizations.length}</span>
          </div>
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            <Plus className="h-5 w-5" />
            Add Organization
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Registered Users</p>
              <p className="text-2xl font-bold text-gray-900">{organizations.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{organizations.filter((o: any) => o.status === "active").length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Joined This Month</p>
              <p className="text-2xl font-bold text-gray-900">{organizations.filter((o: any) => o.createdAt?.includes("2026-01")).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Loading...</p>
              <p className="text-2xl font-bold text-gray-900">Real-time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">All Registered Users</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent w-64"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading registered users...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No registered users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Phone</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Plan</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Joined Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrganizations.map((org, index) => (
                    <tr 
                      key={index} 
                      className="border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="py-4 px-4">
                        <p className="text-sm text-gray-900">{org.email || "N/A"}</p>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{org.phoneNumber || "N/A"}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          org.plan === "pro"
                            ? "bg-blue-100 text-blue-700"
                            : org.plan === "starter"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-purple-100 text-purple-700"
                        }`}>
                          {org.plan || "Free"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          org.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }`}>
                          {org.status || "Inactive"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {org.createdAt ? new Date(org.createdAt).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="py-4 px-4 flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedOrg(org)
                            setEditData({ ...org })
                            setIsEditMode(false)
                            setIsDetailDrawerOpen(true)
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrg(org)
                            setEditData({ ...org })
                            setIsEditMode(true)
                            setIsDetailDrawerOpen(true)
                          }}
                          className="text-green-600 hover:text-green-800 font-medium text-sm"
                        >
                          Edit
                        </button>
                        {org.status === "pending" && (
                          <button
                            onClick={() => handleActivateUser(org.email, org.plan || "starter")}
                            className="text-emerald-600 hover:text-emerald-800 font-medium text-sm"
                            title="Activate User & Unlock Dashboard"
                          >
                            Activate
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedOrgForEmail(org)
                            setIsEmailDrawerOpen(true)
                            setEmailType("payment_reminder")
                          }}
                          className="text-purple-600 hover:text-purple-800 p-1"
                          title="Send Email"
                        >
                          <Mail size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrg(org)
                            handleDeleteOrganization()
                          }}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                          title="Delete Organization"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Right Side Drawer with Glass Blur */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Glass Blur Background */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add New Organization</h2>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleAddOrganization} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter organization name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Country Code"
                      value={formData.countryCode}
                      onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                      className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    />
                    <input
                      type="tel"
                      placeholder="Enter phone number"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan
                  </label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={formData.password || ""}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Billing Cycle
                  </label>
                  <select
                    value={formData.billingCycle}
                    onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Create Organization
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="flex-1 bg-gray-200 text-gray-900 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer - Clean Organization Dashboard */}
      {isDetailDrawerOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Glass Blur Background */}
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => {
              setIsDetailDrawerOpen(false)
              setIsEditMode(false)
            }}
          />
          
          {/* Drawer */}
          <div className="relative w-[550px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedOrg.name || "Organization"}</h2>
                <p className="text-xs text-blue-100 mt-1">Organization Dashboard</p>
              </div>
              <button
                onClick={() => {
                  setIsDetailDrawerOpen(false)
                  setIsEditMode(false)
                }}
                className="text-white hover:text-blue-100 transition-colors p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
              {isEditMode ? (
                <form id="editForm" onSubmit={handleUpdateOrganization} onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Organization Name</label>
                    <input
                      type="text"
                      value={editData?.name || ""}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
                    <input
                      type="email"
                      value={editData?.email || ""}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={editData?.phoneNumber || ""}
                      onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Plan</label>
                    <select
                      value={editData?.plan || ""}
                      onChange={(e) => setEditData({ ...editData, plan: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                    >
                      <option value="">Select Plan</option>
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Status</label>
                    <select
                      value={editData?.status || ""}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                    >
                      <option value="">Select Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Billing Cycle</label>
                    <select
                      value={editData?.billingCycle || "monthly"}
                      onChange={(e) => setEditData({ ...editData, billingCycle: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </div>

                  {/* Password Section */}
                  <div className="border-t pt-5">
                    <button
                      type="button"
                      onClick={() => setShowPasswordSection(!showPasswordSection)}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                    >
                      {showPasswordSection ? "✓ Hide" : "+ Set"} New Password
                    </button>

                    {showPasswordSection && (
                      <div className="space-y-3 mt-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">New Password</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">Notification will be sent to {selectedOrg.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              ) : (
                <div className="p-6 space-y-5">
                  {/* Organization Info Card */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                    <h3 className="text-xs font-bold text-gray-600 uppercase">Basic Information</h3>
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedOrg.name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedOrg.email || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedOrg.phoneNumber || "—"}</p>
                    </div>
                  </div>

                  {/* Plan & Status Card */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                    <h3 className="text-xs font-bold text-gray-600 uppercase">Plan & Status</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Plan</p>
                        <p className="text-sm font-bold text-blue-700 capitalize">{selectedOrg.plan || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Billing Cycle</p>
                        <p className="text-sm font-bold text-gray-900 capitalize">{selectedOrg.billingCycle || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <span className={`inline-block text-xs font-bold px-2 py-1 rounded ${
                          selectedOrg.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {selectedOrg.status?.charAt(0).toUpperCase() + selectedOrg.status?.slice(1) || "—"}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Member Since</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedOrg.createdAt ? new Date(selectedOrg.createdAt).toLocaleDateString('en-IN') : "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Billing Info Card */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                    <h3 className="text-xs font-bold text-gray-600 uppercase">Billing Summary</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                        <p className="text-xs text-blue-600 font-semibold">Total Bill</p>
                        <p className="text-base font-bold text-blue-700 mt-1">₹{(selectedOrg.billAmount || 0)?.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <p className="text-xs text-green-600 font-semibold">Paid</p>
                        <p className="text-base font-bold text-green-700 mt-1">₹{(selectedOrg.totalPayments || 0)?.toLocaleString('en-IN')}</p>
                      </div>
                      <div className={`p-3 rounded border ${(selectedOrg.billAmount || 0) - (selectedOrg.totalPayments || 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                        <p className={`text-xs font-semibold ${(selectedOrg.billAmount || 0) - (selectedOrg.totalPayments || 0) > 0 ? 'text-red-600' : 'text-gray-600'}`}>Due</p>
                        <p className={`text-base font-bold mt-1 ${(selectedOrg.billAmount || 0) - (selectedOrg.totalPayments || 0) > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                          ₹{Math.max(0, (selectedOrg.billAmount || 0) - (selectedOrg.totalPayments || 0))?.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <div className="pt-3 border-t space-y-2">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Next Billing Date</p>
                        <p className="text-sm font-bold text-blue-700 mt-1">
                          {(() => {
                            if (selectedOrg.nextBillingDate) {
                              return new Date(selectedOrg.nextBillingDate).toLocaleDateString('en-IN', {day: 'numeric', month: 'long', year: 'numeric'})
                            }
                            // Auto-calculate based on createdAt + billingCycle
                            if (selectedOrg.createdAt && selectedOrg.billingCycle) {
                              const signupDate = new Date(selectedOrg.createdAt)
                              let nextDate = new Date(signupDate)
                              if (selectedOrg.billingCycle === 'monthly') {
                                nextDate.setMonth(nextDate.getMonth() + 1)
                              } else if (selectedOrg.billingCycle === 'quarterly') {
                                nextDate.setMonth(nextDate.getMonth() + 3)
                              } else if (selectedOrg.billingCycle === 'annually') {
                                nextDate.setFullYear(nextDate.getFullYear() + 1)
                              }
                              return nextDate.toLocaleDateString('en-IN', {day: 'numeric', month: 'long', year: 'numeric'})
                            }
                            return 'Not scheduled'
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Wallet Card */}
                  {selectedOrg.walletBalance > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-300 p-4">
                      <p className="text-xs font-bold text-green-700 uppercase">Wallet Credit</p>
                      <p className="text-2xl font-bold text-green-700 mt-2">₹{selectedOrg.walletBalance?.toLocaleString('en-IN')}</p>
                    </div>
                  )}

                  {/* Free Plan Badge */}
                  {selectedOrg.plan === "free" && (
                    <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
                      <p className="text-sm font-semibold text-blue-700">📦 Free Plan - No Billing</p>
                    </div>
                  )}

                  {/* Recent Invoices */}
                  {selectedOrg._invoices && selectedOrg._invoices.length > 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-gray-600 uppercase">Transactions & Invoices ({selectedOrg._invoices.length})</h3>
                        <button
                          onClick={handleRefreshInvoices}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                        >
                          🔄 Sync
                        </button>
                      </div>
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {selectedOrg._invoices.map((invoice: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded border border-gray-100">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{invoice.invoiceNumber || `INV-${idx + 1}`}</p>
                              <p className="text-xs text-gray-500">{new Date(invoice.invoiceDate || invoice.createdAt || invoice.date).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'})}</p>
                            </div>
                            <div className="text-right space-x-2">
                              <button
                                onClick={() => {
                                  setInvoicePreview(invoice)
                                  setShowInvoicePreview(true)
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                              >
                                👁️ View
                              </button>
                              <span className="text-sm font-bold text-gray-900">₹{(invoice.totalAmount || invoice.amount || 0)?.toLocaleString('en-IN')}</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded inline-block ${
                                invoice.status === 'paid' ? 'bg-green-100 text-green-700' : invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1) || 'Pending'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-4 text-center space-y-3">
                      <p className="text-sm text-gray-600">No invoices/transactions yet</p>
                      <button
                        onClick={handleRefreshInvoices}
                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 font-semibold"
                      >
                        🔄 Sync Invoices
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-white px-6 py-3 flex gap-2">
              {isEditMode ? (
                <>
                  <button
                    type="submit"
                    form="editForm"
                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors font-semibold text-sm"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className="flex-1 bg-gray-200 text-gray-900 py-2 rounded hover:bg-gray-300 transition-colors font-semibold text-sm"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsPaymentLinkModal(true)}
                    className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors font-semibold text-xs"
                  >
                    Payment Link
                  </button>
                  <button
                    onClick={handleCreateInvoice}
                    disabled={isGeneratingPaymentLink}
                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors font-semibold text-xs disabled:opacity-50"
                  >
                    Invoice
                  </button>
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="flex-1 bg-gray-200 text-gray-900 py-2 rounded hover:bg-gray-300 transition-colors font-semibold text-xs"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Link Modal */}
      {isPaymentLinkModal && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsPaymentLinkModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">💳 Generate Payment Link</h3>
              <button 
                onClick={() => setIsPaymentLinkModal(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-4">
                Select a plan to create invoice and send payment link to <strong>{selectedOrg.name}</strong>
              </p>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {availablePlans && availablePlans.length > 0 ? (
                  availablePlans.map((plan: any) => (
                    <div 
                      key={plan._id}
                      onClick={() => setSelectedPlanForPayment(plan)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedPlanForPayment?._id === plan._id 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                          <p className="text-sm text-gray-600">{plan.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">₹{plan.monthlyPrice?.toLocaleString('en-IN')}</p>
                          <p className="text-xs text-gray-500">/month</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500">No plans available</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleGeneratePaymentLink}
                disabled={!selectedPlanForPayment || isGeneratingPaymentLink}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold text-sm"
              >
                {isGeneratingPaymentLink ? "Generating..." : "Generate Link"}
              </button>
              <button
                onClick={() => setIsPaymentLinkModal(false)}
                className="flex-1 bg-gray-300 text-gray-900 py-2.5 rounded-lg hover:bg-gray-400 transition-colors font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Drawer */}
      {isEmailDrawerOpen && selectedOrgForEmail && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsEmailDrawerOpen(false)}
          />
          <div className="relative ml-auto bg-white w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="border-b border-gray-200 px-8 py-4 flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Send Email</h3>
              <button
                onClick={() => setIsEmailDrawerOpen(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
              {/* Organization Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                <input
                  type="text"
                  disabled
                  value={selectedOrgForEmail.name || ""}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 cursor-not-allowed"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={selectedOrgForEmail.email || ""}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 cursor-not-allowed"
                />
              </div>

              {/* Email Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Type</label>
                <select
                  value={emailType}
                  onChange={(e) => setEmailType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="payment_reminder">Payment Reminder</option>
                  <option value="custom_message">Custom Message</option>
                  <option value="renewal_notice">Renewal Notice</option>
                </select>
              </div>

              {/* Plan Details (for payment reminder) */}
              {emailType === "payment_reminder" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-blue-900">
                    <strong>Current Plan:</strong> {selectedOrgForEmail.plan || "Free"}
                  </p>
                  <p className="text-sm text-blue-900">
                    <strong>Billing Cycle:</strong> {selectedOrgForEmail.billingCycle || "Monthly"}
                  </p>
                  <p className="text-sm text-blue-900">
                    <strong>Status:</strong> {selectedOrgForEmail.status || "Inactive"}
                  </p>
                  
                  {/* ✅ Plan Amount from available plans */}
                  {selectedOrgForEmail.plan && selectedOrgForEmail.plan !== "free" && availablePlans.length > 0 && (
                    (() => {
                      const planObj = availablePlans.find((p: any) => 
                        p.name?.toLowerCase() === selectedOrgForEmail.plan?.toLowerCase()
                      );
                      
                      let amount = 0;
                      if (selectedOrgForEmail.billingCycle === "monthly") {
                        amount = planObj?.monthlyPrice || 0;
                      } else if (selectedOrgForEmail.billingCycle === "quarterly") {
                        amount = planObj?.quarterlyPrice || 0;
                      } else if (selectedOrgForEmail.billingCycle === "annual") {
                        amount = planObj?.annualPrice || 0;
                      }
                      
                      return amount > 0 ? (
                        <p className="text-sm font-bold text-green-700 bg-green-100 px-3 py-2 rounded">
                          Amount Due: ₹{amount?.toLocaleString('en-IN')} ({selectedOrgForEmail.billingCycle})
                        </p>
                      ) : null;
                    })()
                  )}
                  
                  {selectedOrgForEmail.plan && selectedOrgForEmail.plan !== "free" && selectedOrgForEmail.nextBillingDate && (
                    <p className="text-sm text-blue-900">
                      <strong>Next Billing:</strong> {new Date(selectedOrgForEmail.nextBillingDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {/* Custom Message (for custom message type) */}
              {emailType === "custom_message" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder="Enter your message here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none h-32"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-8 py-4 flex gap-3">
              <button
                onClick={async () => {
                  try {
                    setIsSendingEmail(true)
                    const token = localStorage.getItem("token")
                    
                    const response = await fetch(`${API_URL}/admin/send-payment-reminder`, {
                      method: "POST",
                      headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({
                        accountId: selectedOrgForEmail._id,
                        emailType: emailType,
                        message: emailMessage || undefined
                      })
                    })

                    if (!response.ok) {
                      const error = await response.json()
                      throw new Error(error.message || "Failed to send email")
                    }

                    const result = await response.json()
                    console.log("Email sent successfully:", result)
                    setIsEmailDrawerOpen(false)
                    setEmailMessage("")
                  } catch (err) {
                    console.error("Error sending email:", err)
                    alert(`Error: ${err instanceof Error ? err.message : "Failed to send email"}`)
                  } finally {
                    setIsSendingEmail(false)
                  }
                }}
                disabled={isSendingEmail || (emailType === "custom_message" && !emailMessage.trim())}
                className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold text-sm"
              >
                {isSendingEmail ? "Sending..." : "Send Email"}
              </button>
              <button
                onClick={() => setIsEmailDrawerOpen(false)}
                className="flex-1 bg-gray-300 text-gray-900 py-2.5 rounded-lg hover:bg-gray-400 transition-colors font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {showInvoicePreview && invoicePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <div className="sticky top-0 right-0 p-4 flex justify-end bg-white border-b border-gray-200">
              <button
                onClick={() => setShowInvoicePreview(false)}
                className="text-gray-600 hover:text-gray-900 p-2"
              >
                <X size={24} />
              </button>
            </div>

            {/* Invoice Template */}
            <div className="p-8">
              <InvoiceTemplate invoice={invoicePreview} organization={selectedOrg} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

