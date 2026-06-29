"use client"

import { X } from "lucide-react"
import { useState, useEffect } from "react"
import { LeadStatus } from "@/lib/enums"
import { patchPlatformLead } from "@/lib/superadminApi"
import TagInput from "@/components/crm/TagInput"

interface Lead {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  intent: string;
  score: number;
  messageCount?: number;
  status: string;
  accountId?: string;
  notes?: string;
  conversionValue?: number;
  nextFollowUp?: string;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  demoScheduled?: string;
  demoCompleted?: string;
  demoMissed?: boolean;
  source?: string;
  location?: string;
  vertical?: string;
}


interface LeadProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onUpdate: () => void;
  onLeadUpdated: (lead: Lead) => void;
}

export default function LeadProfileDrawer({
  isOpen,
  onClose,
  lead,
  onUpdate,
  onLeadUpdated
}: LeadProfileDrawerProps) {
  const [formData, setFormData] = useState({
    status: '',
    notes: '',
    conversionValue: 0,
    nextFollowUp: '',
    tags: [] as string[],
    source: '',
    demoScheduled: '',
    demoCompleted: '',
    demoMissed: false,
    location: '',
    vertical: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (lead) {
      setFormData({
        status: lead.status || 'new',
        notes: lead.notes || '',
        conversionValue: lead.conversionValue || 0,
        nextFollowUp: lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().split('T')[0] : '',
        tags: lead.tags || [],
        source: lead.source || 'manual',
        demoScheduled: lead.demoScheduled ? new Date(lead.demoScheduled).toISOString().split('T')[0] : '',
        demoCompleted: lead.demoCompleted ? new Date(lead.demoCompleted).toISOString().split('T')[0] : '',
        demoMissed: !!lead.demoMissed,
        vertical: lead.vertical || '',
        location: lead.location || ''
      })
      setError('')
      setSuccessMsg('')
    }
  }, [lead])

  const handleSave = async () => {
    if (!lead) return
    try {
      setSaving(true)
      setError('')
      setSuccessMsg('')
      
      const payload: Record<string, any> = {
        status: formData.status,
        notes: formData.notes,
        conversionValue: Number(formData.conversionValue),
        tags: formData.tags,
        source: formData.source,
        location: formData.location,
        vertical: formData.vertical
      }
      
      if (formData.nextFollowUp) {
        payload.nextFollowUp = new Date(formData.nextFollowUp).toISOString()
      }
      if (formData.demoScheduled) {
        payload.demoScheduled = new Date(formData.demoScheduled).toISOString()
      }
      if (formData.demoCompleted) {
        payload.demoCompleted = new Date(formData.demoCompleted).toISOString()
      }
      if (formData.demoMissed !== undefined) {
        payload.demoMissed = formData.demoMissed
      }

      console.log('Payload prepared:', payload);
      await patchPlatformLead(lead._id, payload);
      const updatedLead = { ...lead, ...payload };
      console.log('Updated lead after merge:', updatedLead);
      onLeadUpdated(updatedLead);
      setSuccessMsg('Lead updated successfully');
      
      setTimeout(() => {
        setSuccessMsg('')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !lead) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl z-50 transform transition-transform duration-300 overflow-y-auto sm:w-[32rem]">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">Lead Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">{error}</div>}
          {successMsg && <div className="p-3 bg-green-100 border border-green-300 rounded text-green-700 text-sm">{successMsg}</div>}

          {/* Lead Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Name</p>
              <p className="text-sm font-medium text-gray-900">{lead.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Account ID</p>
              <p className="text-sm font-mono text-gray-700">{lead.accountId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Email</p>
              <p className="text-sm text-gray-700">{lead.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Location</p>
              <p className="text-sm text-gray-700">{lead.location || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Phone</p>
              <p className="text-sm text-gray-700">{lead.phone || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Intent</p>
              <p className="text-sm capitalize text-gray-900">{lead.intent?.replace(/_/g, ' ') || 'Inquiry'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Lead Score</p>
              <p className="text-sm font-bold text-blue-600">{lead.score}/100</p>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Edit Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Pipeline Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.values(LeadStatus).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {/* Source selection */}
               <label className="block text-sm font-semibold text-gray-700 mb-1 mt-4">Source</label>
               <select
                 value={formData.source}
                 onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               >
                 <option value="manual">Manual</option>
                 <option value="contact">Contact</option>
                 <option value="api">API</option>
                 <option value="webhook">Webhook</option>
                 <option value="social_media_ads">Social Media Ads</option>
               </select>
               {/* Vertical selection */}
               <label className="block text-sm font-semibold text-gray-700 mb-1 mt-4">Vertical</label>
               <select
                 value={formData.vertical}
                 onChange={(e) => setFormData({ ...formData, vertical: e.target.value })}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="ecommerce">E‑commerce</option>
                  <option value="education">Education</option>
                  <option value="labs">Labs</option>
               </select>
               {/* Location selection */}
               <label className="block text-sm font-semibold text-gray-700 mb-1 mt-4">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter location"
          />
              <label className="block text-sm font-semibold text-gray-700 mb-1 mt-4">Tags</label>
              <TagInput
                value={formData.tags}
                onChange={(newTags) => setFormData({ ...formData, tags: newTags })}
                placeholder="Add a tag"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Est. Deal Value (₹)</label>
              <input
                type="number"
                value={formData.conversionValue}
                onChange={(e) => setFormData({ ...formData, conversionValue: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. 50000"
              />
              <p className="text-xs text-gray-500 mt-1">Used for sales revenue projections</p>
            </div>

            {/* Demo Tracking Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Demo Scheduled</label>
                <input
                  type="date"
                  value={formData.demoScheduled}
                  onChange={(e) => setFormData({ ...formData, demoScheduled: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Demo Completed</label>
                <input
                  type="date"
                  value={formData.demoCompleted}
                  onChange={(e) => setFormData({ ...formData, demoCompleted: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="col-span-2 flex items-center">
                <input
                  type="checkbox"
                  checked={formData.demoMissed}
                  onChange={(e) => setFormData({ ...formData, demoMissed: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  id="demoMissed"
                />
                <label htmlFor="demoMissed" className="ml-2 text-sm font-medium text-gray-700">Demo Missed</label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Next Follow-up Date</label>
              <input
                type="date"
                value={formData.nextFollowUp}
                onChange={(e) => setFormData({ ...formData, nextFollowUp: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nurture Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add conversation notes, next steps, objections..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition disabled:bg-blue-400"
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
