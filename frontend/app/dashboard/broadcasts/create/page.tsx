"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Send, AlertCircle, X, Search, CheckCircle, Loader } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorToast } from "@/components/ErrorToast"
import Link from "next/link"
import { authService } from "@/lib/auth"
import { useRouter } from "next/navigation"

interface Contact {
  _id: string
  name: string
  phone: string
  whatsappNumber: string
  type?: string
}

interface Template {
  _id: string
  name: string
  status: string
  category: string
  language: string
  content: string
  components?: any[]
}

interface BroadcastFormData {
  name: string
  messageType: "template"
  content: {
    templateName: string
    templateParams: string[]
  }
  recipientList: string
  recipients: {
    phoneNumbers: string[]
    contactIds: string[]
  }
  throttleRate: number
  scheduling?: {
    type: "immediate" | "scheduled"
    scheduledTime?: string // ISO datetime string
  }
}

export default function CreateBroadcastPage() {
  const router = useRouter()
  const user = authService.getCurrentUser()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [recipientMode, setRecipientMode] = useState<"manual" | "contacts">("contacts")
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [hasWABA, setHasWABA] = useState<boolean | null>(null)
  const [checkingWABA, setCheckingWABA] = useState(true)

  const [formData, setFormData] = useState<BroadcastFormData>({
    name: "",
    messageType: "template",
    content: {
      templateName: "",
      templateParams: []
    },
    recipientList: "contacts",
    recipients: {
      phoneNumbers: [],
      contactIds: []
    },
    throttleRate: 50,
    scheduling: {
      type: "immediate",
      scheduledTime: undefined
    }
  })

  // Check WABA connection first, then fetch contacts and templates
  useEffect(() => {
    checkWABAConnection()
  }, [])

  const checkWABAConnection = async () => {
    try {
      setCheckingWABA(true)
      const token = localStorage.getItem("token")
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/phone-numbers`,
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

      // Only fetch contacts and templates if WABA is connected
      if (hasPhones) {
        fetchContacts()
        fetchTemplates()
      }
    } catch (err) {
      console.error("Error checking WABA:", err)
      setHasWABA(false)
    } finally {
      setCheckingWABA(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const token = localStorage.getItem("token")
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/templates`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      )

      if (!response.ok) {
        console.error("Failed to fetch templates:", response.status, response.statusText)
        throw new Error("Failed to fetch templates")
      }

      const data = await response.json()
      
      // Filter only approved templates
      let templatesArray = data.templates || []
      const approvedTemplates = templatesArray.filter((t: Template) => t.status === 'approved')
      setTemplates(approvedTemplates)
    } catch (err) {
      console.error("Error fetching templates:", err)
      setError("Failed to load approved templates")
    } finally {
      setLoadingTemplates(false)
    }
  }

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true)
      const token = localStorage.getItem("token")
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/contacts?limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      )

      if (!response.ok) {
        console.error("Failed to fetch contacts:", response.status, response.statusText)
        throw new Error("Failed to fetch contacts")
      }

      const data = await response.json()
      
      if (data.success && data.contacts) {
        setContacts(data.contacts)
      } else {
        setContacts([])
      }
    } catch (err) {
      console.error("Error fetching contacts:", err)
      setError("Failed to load contacts")
    } finally {
      setLoadingContacts(false)
    }
  }

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.whatsappNumber.includes(searchQuery) ||
    contact.phone.includes(searchQuery)
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template)
    setFormData(prev => ({
      ...prev,
      content: {
        templateName: template.name,
        templateParams: []
      }
    }))
  }

  const handleTemplateParamChange = (index: number, value: string) => {
    const newParams = [...formData.content.templateParams]
    newParams[index] = value
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        templateParams: newParams
      }
    }))
  }

  const handlePhoneNumberChange = (index: number, value: string) => {
    const newPhoneNumbers = [...formData.recipients.phoneNumbers]
    newPhoneNumbers[index] = value
    setFormData(prev => ({
      ...prev,
      recipients: {
        ...prev.recipients,
        phoneNumbers: newPhoneNumbers
      }
    }))
  }

  const addPhoneNumber = () => {
    setFormData(prev => ({
      ...prev,
      recipients: {
        ...prev.recipients,
        phoneNumbers: [...prev.recipients.phoneNumbers, ""]
      }
    }))
  }

  const removePhoneNumber = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recipients: {
        ...prev.recipients,
        phoneNumbers: prev.recipients.phoneNumbers.filter((_, i) => i !== index)
      }
    }))
  }

  const toggleContactSelection = (contactId: string) => {
    setFormData(prev => {
      const contactIds = prev.recipients.contactIds
      if (contactIds.includes(contactId)) {
        return {
          ...prev,
          recipients: {
            ...prev.recipients,
            contactIds: contactIds.filter(id => id !== contactId)
          }
        }
      } else {
        return {
          ...prev,
          recipients: {
            ...prev.recipients,
            contactIds: [...contactIds, contactId]
          }
        }
      }
    })
  }

  const selectAllFilteredContacts = () => {
    const allContactIds = filteredContacts.map(c => c._id)
    setFormData(prev => ({
      ...prev,
      recipients: {
        ...prev.recipients,
        contactIds: Array.from(new Set([...prev.recipients.contactIds, ...allContactIds]))
      }
    }))
  }

  const clearAllContacts = () => {
    setFormData(prev => ({
      ...prev,
      recipients: {
        ...prev.recipients,
        contactIds: []
      }
    }))
  }

  const getPhoneNumbersFromContacts = () => {
    const selectedContacts = contacts.filter(c => formData.recipients.contactIds.includes(c._id))
    return selectedContacts.map(c => c.whatsappNumber || c.phone)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.accountId) {
      setError("User not authenticated")
      return
    }

    if (!formData.name.trim()) {
      setError("Campaign name is required")
      return
    }

    if (!formData.content.templateName) {
      setError("Please select an approved template")
      return
    }

    const phoneNumbers = recipientMode === "contacts" 
      ? getPhoneNumbersFromContacts()
      : formData.recipients.phoneNumbers.filter(p => p.trim())

    if (phoneNumbers.length === 0) {
      setError("At least one recipient is required")
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem("token")

      // Get active phone number for the account
      const phoneResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/phone-numbers`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      )

      if (!phoneResponse.ok) {
        const status = phoneResponse.status
        let errorMessage = "Failed to fetch phone number configuration. "
        
        if (status === 401) {
          errorMessage += "Please login again."
        } else if (status === 403) {
          errorMessage += "You don't have permission to access WhatsApp settings."
        } else if (status === 404) {
          errorMessage += "WhatsApp phone number not found. Please configure one in Settings > WhatsApp Setup."
        } else {
          const errorData = await phoneResponse.json().catch(() => ({}))
          errorMessage += errorData.message || "Please check your WhatsApp configuration."
        }
        
        throw new Error(errorMessage)
      }

      const phoneData = await phoneResponse.json()
      
      if (!phoneData.success) {
        throw new Error(phoneData.message || "Failed to load phone number configuration")
      }

      if (!phoneData.phoneNumbers || phoneData.phoneNumbers.length === 0) {
        throw new Error("❌ No WhatsApp phone numbers configured.\n\nPlease:\n1. Go to Settings > WhatsApp Setup\n2. Add your WhatsApp Business Account\n3. Complete Phone Number verification")
      }

      // Find active phone number or use first one
      const activePhone = phoneData.phoneNumbers.find((p: any) => p.isActive) || phoneData.phoneNumbers[0]

      if (!activePhone?.phoneNumberId) {
        throw new Error("❌ Invalid phone number configuration.\n\nPlease check that your phone number has:\n1. Valid Phone Number ID\n2. Valid WABA ID\n3. Valid Access Token\n4. Active status enabled")
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/broadcasts`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: formData.name,
            messageType: "template",
            content: {
              templateName: formData.content.templateName,
              templateParams: formData.content.templateParams
            },
            recipients: {
              phoneNumbers,
              contactIds: formData.recipients.contactIds
            },
            recipientList: recipientMode === "contacts" ? "segment" : "manual",
            throttleRate: formData.throttleRate,
            phoneNumberId: activePhone.phoneNumberId,
            scheduling: {
              type: formData.scheduling?.type || "immediate",
              scheduledTime: formData.scheduling?.type === "scheduled" ? formData.scheduling.scheduledTime : null
            }
          })
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || data.message || "Failed to create broadcast")
      }

      const data = await response.json()
      
      if (data.success || data.data) {
        router.push(`/dashboard/broadcasts`)
      } else {
        setError(data.error || data.message || "Failed to create broadcast")
      }
    } catch (err) {
      console.error("Error creating broadcast:", err)
      setError(err instanceof Error ? err.message : "Failed to create broadcast")
    } finally {
      setLoading(false)
    }
  }

  // Show blocking message if WABA not connected
  if (checkingWABA) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/broadcasts">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Create Broadcast</h1>
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto p-6">
          <div className="p-8 text-center">
            <Loader className="h-8 w-8 text-gray-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Checking WhatsApp connection...</p>
          </div>
        </div>
      </div>
    )
  }

  if (hasWABA === false) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/broadcasts">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Create Broadcast</h1>
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto p-6">
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
                <Link href="/dashboard/settings?tab=whatsapp">
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    Go to WhatsApp Setup
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/broadcasts">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Broadcast</h1>
              <p className="text-gray-600 mt-1">Send messages to multiple contacts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-900">Configuration Issue</h3>
              <p className="text-red-700 text-sm mt-2 whitespace-pre-line">{error}</p>
              <a 
                href="/dashboard/settings" 
                className="text-red-600 hover:text-red-700 text-sm font-medium mt-2 inline-block underline"
              >
                → Go to Settings
              </a>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campaign Name */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Campaign Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Summer Sale 2026"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Template Selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-900 mb-4">
              Select Approved Template
            </label>
            
            {loadingTemplates ? (
              <div className="text-center py-8 text-gray-600">Loading approved templates...</div>
            ) : templates.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  No approved templates found. Please create and approve templates in the Templates section first.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template._id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate?._id === template._id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{template.name}</h3>
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">✓ Approved</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{template.content}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{template.category}</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{template.language}</span>
                        </div>
                      </div>
                      {selectedTemplate?._id === template._id && (
                        <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Template Parameters */}
          {selectedTemplate && selectedTemplate.components && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-900 mb-4">
                Template Parameters
              </label>
              <div className="space-y-3">
                {selectedTemplate.components
                  .filter((c: any) => c.type === 'BODY' && c.parameters)
                  .flatMap((c: any) => c.parameters || [])
                  .map((param: any, index: number) => (
                    <div key={index}>
                      <label className="block text-sm text-gray-700 mb-1">
                        Parameter {index + 1}
                      </label>
                      <input
                        type="text"
                        value={formData.content.templateParams[index] || ''}
                        onChange={(e) => handleTemplateParamChange(index, e.target.value)}
                        placeholder={`Enter parameter ${index + 1}`}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Recipients */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-900 mb-4">
              Recipients
            </label>
            
            {/* Mode Selection */}
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recipientMode"
                  value="manual"
                  checked={recipientMode === "manual"}
                  onChange={(e) => setRecipientMode("manual")}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Manual Entry</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recipientMode"
                  value="contacts"
                  checked={recipientMode === "contacts"}
                  onChange={(e) => setRecipientMode("contacts")}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Select from Contacts ({contacts.length})</span>
              </label>
            </div>

            {/* Manual Entry Mode */}
            {recipientMode === "manual" && (
              <div className="space-y-3">
                {formData.recipients.phoneNumbers.map((phone, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneNumberChange(index, e.target.value)}
                      placeholder="Enter phone number (+1234567890)"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoneNumber(index)}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPhoneNumber}
                  className="w-full px-4 py-2 border border-green-200 text-green-600 rounded-lg hover:bg-green-50 font-medium"
                >
                  + Add Phone Number
                </button>
              </div>
            )}

            {/* Contacts Selection Mode */}
            {recipientMode === "contacts" && (
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search contacts by name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Bulk Actions */}
                {filteredContacts.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllFilteredContacts}
                      className="flex-1 px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium"
                    >
                      Select All ({filteredContacts.length})
                    </button>
                    {formData.recipients.contactIds.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllContacts}
                        className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                )}

                {/* Selected Count */}
                {formData.recipients.contactIds.length > 0 && (
                  <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                    {formData.recipients.contactIds.length} contact(s) selected
                  </div>
                )}

                {/* Contacts List */}
                {loadingContacts ? (
                  <div className="text-center py-4 text-gray-600">Loading contacts...</div>
                ) : filteredContacts.length === 0 ? (
                  <div className="text-center py-4 text-gray-600">
                    {contacts.length === 0 ? "No contacts available" : "No matching contacts"}
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-lg divide-y max-h-64 overflow-y-auto">
                    {filteredContacts.map((contact) => (
                      <label
                        key={contact._id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.recipients.contactIds.includes(contact._id)}
                          onChange={() => toggleContactSelection(contact._id)}
                          className="w-4 h-4 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                          <p className="text-sm text-gray-600 truncate">{contact.whatsappNumber || contact.phone}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scheduling */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-900 mb-4">
              Send Time
            </label>
            <div className="space-y-4">
              {/* Toggle: Send Now vs Schedule */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scheduling"
                    value="immediate"
                    checked={formData.scheduling?.type === "immediate"}
                    onChange={(e) => setFormData({
                      ...formData,
                      scheduling: { type: "immediate" as const, scheduledTime: undefined }
                    })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Send Now</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scheduling"
                    value="scheduled"
                    checked={formData.scheduling?.type === "scheduled"}
                    onChange={(e) => setFormData({
                      ...formData,
                      scheduling: { type: "scheduled" as const, scheduledTime: formData.scheduling?.scheduledTime }
                    })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Schedule for Later</span>
                </label>
              </div>

              {/* DateTime picker for scheduled broadcasts */}
              {formData.scheduling?.type === "scheduled" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduling?.scheduledTime || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      scheduling: {
                        type: "scheduled",
                        scheduledTime: e.target.value
                      }
                    })}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Messages will be sent at the scheduled time. The system will queue and process them automatically.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Throttle Rate */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Send Rate (messages per second)
            </label>
            <input
              type="number"
              name="throttleRate"
              value={formData.throttleRate}
              onChange={handleInputChange}
              min="1"
              max="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-600 mt-2">Recommended: 1-50 messages per second to avoid WhatsApp rate limits</p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Link href="/dashboard/broadcasts" className="flex-1">
              <Button variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Create Broadcast
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
