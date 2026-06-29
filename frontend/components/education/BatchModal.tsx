'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { apiPost, apiPut, apiGet } from '@/lib/api-client';

interface BatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchSaved: () => void;
  batch?: any;
  projectId: string;
}

export function BatchModal({ isOpen, onClose, onBatchSaved, batch, projectId }: BatchModalProps) {
  const [formData, setFormData] = useState({
    courseId: '',
    name: '',
    startDate: '',
    endDate: '',
    timing: '',
    maxStudents: '',
    isActive: true,
  });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await apiGet(`/education/courses?projectId=${projectId}`);
        setCourses(response.data);
      } catch (err) {
        console.error('Failed to fetch courses', err);
      }
    };
    if (isOpen) {
      fetchCourses();
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (batch) {
      setFormData({
        courseId: batch.courseId?._id || batch.courseId || '',
        name: batch.name || '',
        startDate: batch.startDate ? new Date(batch.startDate).toISOString().split('T')[0] : '',
        endDate: batch.endDate ? new Date(batch.endDate).toISOString().split('T')[0] : '',
        timing: batch.timing || '',
        maxStudents: batch.maxStudents?.toString() || '',
        isActive: batch.isActive !== false,
      });
    } else {
      setFormData({
        courseId: '',
        name: '',
        startDate: '',
        endDate: '',
        timing: '',
        maxStudents: '',
        isActive: true,
      });
    }
  }, [batch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        endDate: formData.endDate || undefined,
        maxStudents: formData.maxStudents ? Number(formData.maxStudents) : undefined,
        projectId
      };
      if (batch) {
        await apiPut(`/education/batches/${batch._id}`, payload);
      } else {
        await apiPost('/education/batches', payload);
      }
      onBatchSaved();
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
                <h2 className="text-2xl font-bold text-black">{batch ? 'Edit Batch' : 'Add New Batch'}</h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                  <select
                    name="courseId"
                    value={formData.courseId}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  >
                    <option value="">Select a course</option>
                    {courses.map((c: any) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Batch Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="e.g., Morning Batch"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timing</label>
                  <input
                    type="text"
                    name="timing"
                    value={formData.timing}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="e.g., 10:00 AM - 12:00 PM"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Students</label>
                  <input
                    type="number"
                    name="maxStudents"
                    value={formData.maxStudents}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="e.g., 50"
                  />
                </div>

                <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  <span>
                    <span className="block font-medium">Show in chatbot batch list</span>
                    <span className="text-xs text-gray-500">Inactive batches stay in admin but will not appear in dynamic WhatsApp flows.</span>
                  </span>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                </label>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Batch'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
