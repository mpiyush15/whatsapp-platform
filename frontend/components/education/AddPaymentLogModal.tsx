'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { apiPost } from '@/lib/api-client';

interface AddPaymentLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentLogSaved: () => void;
  enquiryId: string;
  projectId: string;
}

export function AddPaymentLogModal({ isOpen, onClose, onPaymentLogSaved, enquiryId, projectId }: AddPaymentLogModalProps) {
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'cash',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiPost(`/education/enquiries/${enquiryId}/payment-logs`, { ...formData, amount: Number(formData.amount), projectId });
      onPaymentLogSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-black">Add Payment Log</h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="number" name="amount" value={formData.amount} onChange={handleChange} required placeholder="Amount (₹)" className="w-full px-4 py-2 border-gray-300 rounded-lg" />
                <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full px-4 py-2 border-gray-300 rounded-lg" />
                <select name="method" value={formData.method} onChange={handleChange} className="w-full px-4 py-2 border-gray-300 rounded-lg">
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                </select>
                <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Notes" className="w-full px-4 py-2 border-gray-300 rounded-lg" />

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Payment'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
