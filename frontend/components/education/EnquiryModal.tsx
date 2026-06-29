'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { apiPost, apiPut, apiGet } from '@/lib/api-client';

interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnquirySaved: () => void;
  enquiry?: any;
  projectId: string;
  defaultStatus?: string;
}

export function EnquiryModal({ isOpen, onClose, onEnquirySaved, enquiry, projectId, defaultStatus = 'new' }: EnquiryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    courseId: '',
    batchId: '',
    fees: '',
    status: defaultStatus,
    parentName: '',
    parentPhone: '',
    address: '',
    tenthMarks: '',
  });
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCoursesAndBatches = async () => {
      try {
        const [coursesRes, batchesRes] = await Promise.all([
          apiGet(`/education/courses?projectId=${projectId}`),
          apiGet(`/education/batches?projectId=${projectId}`),
        ]);
        setCourses(coursesRes.data);
        setBatches(batchesRes.data);
      } catch (err) {
        console.error('Failed to fetch courses or batches', err);
      }
    };
    if (isOpen) {
        fetchCoursesAndBatches();
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (enquiry) {
      setFormData({
        name: enquiry.name || '',
        email: enquiry.email || '',
        phone: enquiry.phone || '',
        courseId: enquiry.courseId?._id || '',
        batchId: enquiry.batchId?._id || '',
        fees: enquiry.fees?.toString() || '',
        status: enquiry.status || 'new',
        parentName: enquiry.studentDetails?.parentName || '',
        parentPhone: enquiry.studentDetails?.parentPhone || '',
        address: enquiry.studentDetails?.address || '',
        tenthMarks: enquiry.studentDetails?.tenthMarks || '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        courseId: '',
        batchId: '',
        fees: '',
        status: defaultStatus,
        parentName: '',
        parentPhone: '',
        address: '',
        tenthMarks: '',
      });
    }
  }, [enquiry, defaultStatus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        status: formData.status,
        courseId: formData.courseId || undefined,
        batchId: formData.batchId || undefined,
        fees: formData.fees ? Number(formData.fees) : undefined,
        studentDetails: {
          parentName: formData.parentName,
          parentPhone: formData.parentPhone,
          address: formData.address,
          tenthMarks: formData.tenthMarks,
        },
        projectId
      };
      if (enquiry) {
        await apiPut(`/education/enquiries/${enquiry._id}`, payload);
      } else {
        await apiPost('/education/enquiries', payload);
      }
      onEnquirySaved();
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
            <div className="max-h-[90vh] overflow-y-auto p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-black">{enquiry ? 'Edit Student Details' : defaultStatus === 'admitted' ? 'Add Admission' : 'Add New Enquiry'}</h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Name" className="w-full px-4 py-2 border-gray-300 rounded-lg" />
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full px-4 py-2 border-gray-300 rounded-lg" />
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} required placeholder="Phone" className="w-full px-4 py-2 border-gray-300 rounded-lg" />
                <select name="courseId" value={formData.courseId} onChange={handleChange} className="w-full px-4 py-2 border-gray-300 rounded-lg">
                    <option value="">Select a course</option>
                    {courses.map((c: any) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                </select>
                <select name="batchId" value={formData.batchId} onChange={handleChange} className="w-full px-4 py-2 border-gray-300 rounded-lg">
                    <option value="">Select a batch</option>
                    {batches.map((b: any) => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                </select>
                <input type="number" name="fees" value={formData.fees} onChange={handleChange} placeholder="Fees (₹)" className="w-full px-4 py-2 border-gray-300 rounded-lg" />
                <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 border-gray-300 rounded-lg">
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="admitted">Admitted</option>
                    <option value="dropped">Dropped</option>
                </select>
                {formData.status === 'admitted' && (
                  <div className="rounded-lg border border-green-100 bg-green-50 p-3">
                    <p className="mb-3 text-sm font-semibold text-green-800">Student admission details</p>
                    <div className="space-y-3">
                      <input type="text" name="parentName" value={formData.parentName} onChange={handleChange} placeholder="Parent name" className="w-full px-4 py-2 border-gray-300 rounded-lg" />
                      <input type="text" name="parentPhone" value={formData.parentPhone} onChange={handleChange} placeholder="Parent phone number" className="w-full px-4 py-2 border-gray-300 rounded-lg" />
                      <textarea name="address" value={formData.address} onChange={handleChange} placeholder="Student address" rows={3} className="w-full px-4 py-2 border-gray-300 rounded-lg" />
                      <input type="text" name="tenthMarks" value={formData.tenthMarks} onChange={handleChange} placeholder="10th marks, e.g. 92%" className="w-full px-4 py-2 border-gray-300 rounded-lg" />
                    </div>
                  </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : formData.status === 'admitted' ? 'Save Admission' : 'Save Enquiry'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
