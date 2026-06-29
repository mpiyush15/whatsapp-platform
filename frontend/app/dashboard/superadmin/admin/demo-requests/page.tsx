'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Clock, Mail, Phone, Building2 } from 'lucide-react'
import { API_URL } from '@/lib/config/api'
import DataTable from '@/components/DataTable'

interface DemoRequest {
  _id: string
  name: string
  email: string
  phone?: string
  company?: string
  message?: string
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled'
  requestedAt: string
  scheduledDate?: string
  scheduledTime?: string
  notes?: string
}

export default function DemoRequestsPage() {
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<DemoRequest | null>(null)
  const [showConfirmForm, setShowConfirmForm] = useState(false)
  const [formData, setFormData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchDemoRequests()
  }, [])

  const fetchDemoRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/admin/demo-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to fetch demo requests (${response.status})`)
      }

      const data = await response.json()
      setDemoRequests(data.demoRequests || [])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Error fetching demo requests:', error)
      setError(errorMessage)
      setDemoRequests([])
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDemo = async () => {
    if (!selectedRequest) return

    try {
      setSubmitting(true)
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${API_URL}/admin/demo-requests/${selectedRequest._id}/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            scheduledDate: formData.scheduledDate,
            scheduledTime: formData.scheduledTime,
            notes: formData.notes,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to confirm demo')
      }

      // Refresh the list
      await fetchDemoRequests()
      setShowConfirmForm(false)
      setSelectedRequest(null)
      setFormData({ scheduledDate: '', scheduledTime: '', notes: '' })
    } catch (error) {
      console.error('Error confirming demo:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelDemo = async (requestId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${API_URL}/admin/demo-requests/${requestId}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to cancel demo')
      }

      await fetchDemoRequests()
    } catch (error) {
      console.error('Error cancelling demo:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const columns = [
    {
      key: 'name',
      label: 'Name'
    },
    {
      key: 'email',
      label: 'Email',
      render: (value: string) => (
        <a href={`mailto:${value}`} className='text-blue-600 hover:text-blue-800'>
          {value}
        </a>
      )
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (value: string) => 
        value ? (
          <a href={`tel:${value}`} className='text-blue-600 hover:text-blue-800'>
            {value}
          </a>
        ) : (
          <span className='text-gray-400'>-</span>
        )
    },
    {
      key: 'company',
      label: 'Company',
      render: (value: string) => value || <span className='text-gray-400'>-</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => getStatusBadge(value)
    },
    {
      key: 'requestedAt',
      label: 'Requested',
      render: (value: string) => new Date(value).toLocaleDateString('en-IN')
    }
  ]

  const actions = [
    {
      label: 'Confirm',
      onClick: (request: DemoRequest) => {
        setSelectedRequest(request)
        setShowConfirmForm(true)
      },
      variant: 'primary' as const
    },
    {
      label: 'Decline',
      onClick: (request: DemoRequest) => handleCancelDemo(request._id),
      variant: 'danger' as const
    }
  ]

  return (
    <div className='p-8 max-w-7xl mx-auto'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>Demo Requests</h1>
        <p className='text-gray-600'>Manage and confirm demo bookings from potential customers</p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className='mb-6 bg-red-50 border border-red-200 rounded-lg p-4'
        >
          <p className='text-red-800 font-medium'>⚠️ Error: {error}</p>
          <button
            onClick={fetchDemoRequests}
            className='mt-2 text-sm text-red-600 hover:text-red-700 font-semibold'
          >
            Try again
          </button>
        </motion.div>
      )}

      <div className='mb-6 grid grid-cols-4 gap-4'>
        <div className='bg-white rounded-lg border border-gray-200 p-4'>
          <p className='text-sm text-gray-600'>Total Requests</p>
          <p className='text-3xl font-bold text-gray-900 mt-2'>{demoRequests.length}</p>
        </div>
        <div className='bg-white rounded-lg border border-gray-200 p-4'>
          <p className='text-sm text-gray-600'>Pending</p>
          <p className='text-3xl font-bold text-yellow-600 mt-2'>
            {demoRequests.filter(r => r.status === 'pending').length}
          </p>
        </div>
        <div className='bg-white rounded-lg border border-gray-200 p-4'>
          <p className='text-sm text-gray-600'>Scheduled</p>
          <p className='text-3xl font-bold text-blue-600 mt-2'>
            {demoRequests.filter(r => r.status === 'scheduled').length}
          </p>
        </div>
        <div className='bg-white rounded-lg border border-gray-200 p-4'>
          <p className='text-sm text-gray-600'>Completed</p>
          <p className='text-3xl font-bold text-green-600 mt-2'>
            {demoRequests.filter(r => r.status === 'completed').length}
          </p>
        </div>
      </div>

      <div className='bg-white rounded-lg border border-gray-200 p-6'>
        <DataTable
          columns={columns}
          data={demoRequests}
          loading={loading}
          error={error}
          actions={actions.filter(a => true)}
          emptyMessage='No demo requests found'
        />
      </div>

      {/* Confirm Demo Modal */}
      {showConfirmForm && selectedRequest && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className='bg-white rounded-xl max-w-md w-full p-8 shadow-2xl'
          >
            <h2 className='text-2xl font-bold text-black mb-4'>Confirm Demo</h2>
            <p className='text-gray-600 mb-6'>
              Schedule demo for <strong>{selectedRequest.name}</strong>
            </p>

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Scheduled Date
                </label>
                <input
                  type='date'
                  value={formData.scheduledDate}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledDate: e.target.value })
                  }
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600'
                  required
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Scheduled Time
                </label>
                <input
                  type='time'
                  value={formData.scheduledTime}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledTime: e.target.value })
                  }
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600'
                  required
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600'
                  placeholder='Any notes for the customer...'
                />
              </div>
            </div>

            <div className='flex gap-4 mt-8'>
              <button
                onClick={() => {
                  setShowConfirmForm(false)
                  setSelectedRequest(null)
                }}
                className='flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all'
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDemo}
                disabled={submitting || !formData.scheduledDate || !formData.scheduledTime}
                className='flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all disabled:opacity-50'
              >
                {submitting ? 'Confirming...' : 'Confirm & Send Email'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
