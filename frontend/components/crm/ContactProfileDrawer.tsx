"use client"

import { X } from "lucide-react"
import { useState, useEffect } from "react"
import TagInput from "@/components/crm/TagInput"

interface Contact {
  _id?: string
  userPhone: string
  userName: string
  email?: string
  messageCount: number
  updatedAt: string
  tags?: string[]
  source?: string
  area?: string
  courseInterest?: string
  notes?: string
  leadStatus?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
  leadValue?: number
  lastActive?: string
  createdAt?: string
  firstMessage?: string
  incoming?: number
  optedIn?: boolean
}

interface ContactProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  onUpdate: (id: string, payload: any) => Promise<any>;
  onContactUpdated: (contact: Contact) => void;
}

const statusLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
}

export default function ContactProfileDrawer({
  isOpen,
  onClose,
  contact,
  onUpdate,
  onContactUpdated
}: ContactProfileDrawerProps) {
  const [formData, setFormData] = useState({
    userName: '',
    userPhone: '',
    email: '',
    leadStatus: 'new',
    notes: '',
    leadValue: 0,
    tags: [] as string[],
    source: '',
    area: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (contact) {
      setFormData({
        userName: contact.userName || '',
        userPhone: contact.userPhone || '',
        email: contact.email || '',
        leadStatus: contact.leadStatus || 'new',
        notes: contact.notes || '',
        leadValue: contact.leadValue || 0,
        tags: contact.tags || [],
        source: contact.source || 'Manual',
        area: contact.area || ''
      })
      setError('')
      setSuccessMsg('')
    }
  }, [contact])

  const handleSave = async () => {
    if (!contact || !contact._id) return
    try {
      setSaving(true)
      setError('')
      setSuccessMsg('')
      
      const payload: Record<string, any> = {
        name: formData.userName,
        phone: formData.userPhone,
        email: formData.email,
        leadStatus: formData.leadStatus,
        notes: formData.notes,
        leadValue: Number(formData.leadValue),
        tags: formData.tags,
        source: formData.source,
        customAttributes: { area: formData.area }
      }
      
      const updatedData = await onUpdate(contact._id, payload);
      
      const mergedContact = { ...contact, ...updatedData, ...formData };
      onContactUpdated(mergedContact);
      setSuccessMsg('Contact updated successfully');
      
      setTimeout(() => {
        setSuccessMsg('')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contact')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !contact) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl z-50 transform transition-transform duration-300 overflow-y-auto sm:w-[32rem]">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">Contact Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">{error}</div>}
          {successMsg && <div className="p-3 bg-green-100 border border-green-300 rounded text-green-700 text-sm">{successMsg}</div>}

          {/* Edit Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.userName}
                onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.userPhone}
                onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <hr className="border-gray-200 my-4" />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Pipeline Status</label>
              <select
                value={formData.leadStatus}
                onChange={(e) => setFormData({ ...formData, leadStatus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Est. Deal Value (₹)</label>
              <input
                type="number"
                value={formData.leadValue}
                onChange={(e) => setFormData({ ...formData, leadValue: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Source</label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Area / Location</label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tags</label>
              <TagInput
                value={formData.tags}
                onChange={(newTags) => setFormData({ ...formData, tags: newTags })}
                placeholder="Add a tag"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add conversation notes..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition disabled:bg-green-400"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition"
            >
              Close
            </button>
          </div>
          
        </div>
      </div>
    </>
  )
}
