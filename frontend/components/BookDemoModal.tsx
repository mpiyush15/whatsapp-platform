'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface BookDemoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BookDemoModal({ isOpen, onClose }: BookDemoModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/demo/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to book demo')
      }

      setSuccess(true)
      setFormData({ name: '', email: '', phone: '', company: '', message: '' })
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className='bg-white rounded-2xl max-w-md w-full shadow-2xl'
          >
            <div className='p-8'>
              {/* Header */}
              <div className='flex items-center justify-between mb-6'>
                <h2 className='text-2xl font-bold text-black'>Book a Demo</h2>
                <button
                  onClick={onClose}
                  className='p-1 hover:bg-gray-100 rounded-lg transition'
                >
                  <X className='h-5 w-5 text-gray-600' />
                </button>
              </div>

              {success ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='text-center py-8'
                >
                  <div className='w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <span className='text-2xl'>✓</span>
                  </div>
                  <h3 className='text-lg font-bold text-black mb-2'>Demo Request Sent!</h3>
                  <p className='text-gray-600'>
                    Our team will contact you soon to schedule your demo. Check your email for updates.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>Name</label>
                    <input
                      type='text'
                      name='name'
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent'
                      placeholder='Your name'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>Email</label>
                    <input
                      type='email'
                      name='email'
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent'
                      placeholder='your@email.com'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>Phone</label>
                    <input
                      type='tel'
                      name='phone'
                      value={formData.phone}
                      onChange={handleChange}
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent'
                      placeholder='+91 XXXXX XXXXX'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>Company</label>
                    <input
                      type='text'
                      name='company'
                      value={formData.company}
                      onChange={handleChange}
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent'
                      placeholder='Your company'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>Message (optional)</label>
                    <textarea
                      name='message'
                      value={formData.message}
                      onChange={handleChange}
                      rows={3}
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent'
                      placeholder='Tell us about your needs...'
                    />
                  </div>

                  {error && <p className='text-sm text-red-600'>{error}</p>}

                  <button
                    type='submit'
                    disabled={loading}
                    className='w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50'
                  >
                    {loading ? 'Booking...' : 'Schedule Demo'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
