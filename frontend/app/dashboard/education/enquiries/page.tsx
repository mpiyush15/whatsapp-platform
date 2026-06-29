'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Edit, Eye, IndianRupee, PlusCircle, Trash2 } from 'lucide-react';
import { ErrorToast } from '@/components/ErrorToast';
import { EnquiryModal } from '@/components/education/EnquiryModal';
import { PaymentLogsModal } from '@/components/education/PaymentLogsModal';
import { AddPaymentLogModal } from '@/components/education/AddPaymentLogModal';
import { authService } from '@/lib/auth';
import { API_URL } from '@/lib/config/api';
import { StatCardSkeleton, TableRowsSkeleton } from '@/components/ui/skeleton';

const getHeaders = () => {
  const token = authService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

type EnquiryStatus = 'new' | 'contacted' | 'admitted' | 'dropped';

type PaymentLog = {
  amount: number;
  date: string;
  method: string;
  notes?: string;
};

type EducationEnquiry = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  status: EnquiryStatus;
  courseId?: { _id: string; name: string; fees?: number; duration?: string } | null;
  batchId?: { _id: string; name: string; timing?: string; startDate?: string } | null;
  source?: string;
  fees?: number;
  tags?: string[];
  notes?: string;
  paymentLogs?: PaymentLog[];
  createdAt?: string;
};

type EnquiryStats = {
  total: number;
  new: number;
  contacted: number;
  admitted: number;
  dropped: number;
  paid: number;
  pendingFees: number;
};

const statusLabels: Record<EnquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  admitted: 'Admitted',
  dropped: 'Dropped',
};

const statusClass: Record<EnquiryStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  admitted: 'bg-green-100 text-green-700',
  dropped: 'bg-red-100 text-red-700',
};

const currency = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(value || 0);

const paidAmount = (enquiry: EducationEnquiry) =>
  (enquiry.paymentLogs || []).reduce((sum, log) => sum + Number(log.amount || 0), 0);

export default function EducationEnquiriesPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [enquiries, setEnquiries] = useState<EducationEnquiry[]>([]);
  const [stats, setStats] = useState<EnquiryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [selectedEnquiry, setSelectedEnquiry] = useState<EducationEnquiry | null>(null);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [isPaymentLogsModalOpen, setIsPaymentLogsModalOpen] = useState(false);
  const [isAddPaymentLogModalOpen, setIsAddPaymentLogModalOpen] = useState(false);

  const fetchEnquiries = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const query = new URLSearchParams({ projectId });

      const response = await fetch(`${API_URL}/education/enquiries?${query}`, { headers: getHeaders() });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to fetch enquiries');
      setEnquiries(payload.enquiries || payload.data || []);
      setStats(payload.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch enquiries');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchEnquiries();
  }, [fetchEnquiries, projectId]);

  const visibleEnquiries = useMemo(() => enquiries.filter((enquiry) => {
    const term = searchTerm.trim().toLowerCase();
    if (statusFilter !== 'all' && enquiry.status !== statusFilter) return false;
    if (tagFilter !== 'all' && !(enquiry.tags || []).includes(tagFilter)) return false;
    if (courseFilter !== 'all' && enquiry.courseId?._id !== courseFilter) return false;
    if (batchFilter !== 'all' && enquiry.batchId?._id !== batchFilter) return false;
    if (term) {
      const haystack = [
        enquiry.name,
        enquiry.email,
        enquiry.phone,
        enquiry.status,
        enquiry.source,
        enquiry.notes,
        enquiry.courseId?.name,
        enquiry.batchId?.name,
        ...(enquiry.tags || []),
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  }), [enquiries, statusFilter, searchTerm, tagFilter, courseFilter, batchFilter]);

  const availableTags = Array.from(new Set(enquiries.flatMap((enquiry) => enquiry.tags || []))).sort();
  const availableCourses = Array.from(new Map(enquiries
    .map((enquiry) => enquiry.courseId)
    .filter(Boolean)
    .map((course) => [course!._id, course!] as const)).values()).sort((a, b) => a.name.localeCompare(b.name));
  const availableBatches = Array.from(new Map(enquiries
    .map((enquiry) => enquiry.batchId)
    .filter(Boolean)
    .map((batch) => [batch!._id, batch!] as const)).values()).sort((a, b) => a.name.localeCompare(b.name));

  const visibleStats = visibleEnquiries.reduce((acc, enquiry) => {
    acc.total += 1;
    acc[enquiry.status] += 1;
    const paid = paidAmount(enquiry);
    acc.paid += paid;
    acc.pendingFees += Math.max(0, Number(enquiry.fees || 0) - paid);
    return acc;
  }, { total: 0, new: 0, contacted: 0, admitted: 0, dropped: 0, paid: 0, pendingFees: 0 } as EnquiryStats);

  const handleStatusChange = async (enquiryId: string, status: EnquiryStatus) => {
    const previous = enquiries;
    setEnquiries((current) => current.map((enquiry) => enquiry._id === enquiryId ? { ...enquiry, status } : enquiry));
    try {
      const response = await fetch(`${API_URL}/education/enquiries/${enquiryId}?projectId=${projectId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to update status');
    } catch (err) {
      setEnquiries(previous);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleTagsChange = async (enquiryId: string, tags: string[]) => {
    const cleanTags = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
    const previous = enquiries;
    setEnquiries((current) => current.map((enquiry) => enquiry._id === enquiryId ? { ...enquiry, tags: cleanTags } : enquiry));
    try {
      const response = await fetch(`${API_URL}/education/enquiries/${enquiryId}?projectId=${projectId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ tags: cleanTags }),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to update tags');
    } catch (err) {
      setEnquiries(previous);
      setError(err instanceof Error ? err.message : 'Failed to update tags');
    }
  };

  const addTag = (enquiry: EducationEnquiry) => {
    const tag = window.prompt('Add tag, for example: NEET, Hot, Scholarship, Andheri');
    if (!tag?.trim()) return;
    handleTagsChange(enquiry._id, [...(enquiry.tags || []), tag.trim()]);
  };

  const removeTag = (enquiry: EducationEnquiry, tag: string) => {
    handleTagsChange(enquiry._id, (enquiry.tags || []).filter((item) => item !== tag));
  };

  const handleDeleteEnquiry = async (enquiry: EducationEnquiry) => {
    if (!window.confirm(`Delete enquiry from ${enquiry.name}?`)) return;
    try {
      const response = await fetch(`${API_URL}/education/enquiries/${enquiry._id}?projectId=${projectId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to delete enquiry');
      fetchEnquiries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete enquiry');
    }
  };

  const handleExport = async () => {
    try {
      const query = new URLSearchParams({ projectId });
      if (statusFilter !== 'all') query.set('status', statusFilter);
      if (searchTerm.trim()) query.set('search', searchTerm.trim());
      if (tagFilter !== 'all') query.set('tag', tagFilter);
      const response = await fetch(`${API_URL}/education/enquiries/bulk/export?${query}`, { headers: getHeaders() });
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'education-enquiries.csv';
      link.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export enquiries');
    }
  };

  const initialLoading = loading && enquiries.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      {error && <ErrorToast message={error} onDismiss={() => setError('')} />}
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Education Enquiries</h1>
            <p className="text-sm text-slate-500">Track students, courses, batches, payments, tags, and follow-ups.</p>
          </div>
          <button onClick={() => { setSelectedEnquiry(null); setIsEnquiryModalOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
            <PlusCircle className="h-4 w-4" /> Add Enquiry
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {initialLoading ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />) : (
            <>
              <StatCard label="Total" value={visibleStats.total} />
              <StatCard label="New" value={visibleStats.new} tone="blue" />
              <StatCard label="Contacted" value={visibleStats.contacted} tone="amber" />
              <StatCard label="Admitted" value={visibleStats.admitted} tone="green" />
              <StatCard label="Dropped" value={visibleStats.dropped} tone="red" />
              <StatCard label="Pending Fees" value={currency(visibleStats.pendingFees)} />
            </>
          )}
        </div>

        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row">
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search student, phone, course, notes..." className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm xl:w-56"><option value="all">All courses</option>{availableCourses.map((course) => <option key={course._id} value={course._id}>{course.name}</option>)}</select>
            <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm xl:w-52"><option value="all">All batches</option>{availableBatches.map((batch) => <option key={batch._id} value={batch._id}>{batch.name}</option>)}</select>
            <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm xl:w-44"><option value="all">All tags</option>{availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm xl:w-44"><option value="all">All status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <button onClick={handleExport} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Export CSV</button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {initialLoading ? (
            <div className="overflow-x-auto">
              <table className="min-w-[1760px] w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr><Th>Student</Th><Th>Course</Th><Th>Batch</Th><Th>Tags</Th><Th>Notes</Th><Th>Fees</Th><Th>Status</Th><Th>Date</Th><Th>Actions</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200"><TableRowsSkeleton rows={7} columns={9} /></tbody>
              </table>
            </div>
          ) : visibleEnquiries.length === 0 ? (
            <div className="animate-content-in p-8 text-center text-slate-600">No enquiries found. Live chat and chatbot replies will create education enquiries here.</div>
          ) : (
            <div className="animate-content-in overflow-x-auto">
              <table className="min-w-[1760px] w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <Th>Student</Th><Th>Course</Th><Th>Batch</Th><Th>Tags</Th><Th>Notes</Th><Th>Fees</Th><Th>Status</Th><Th>Date</Th><Th>Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleEnquiries.map((enquiry) => {
                    const paid = paidAmount(enquiry);
                    const pending = Math.max(0, Number(enquiry.fees || 0) - paid);
                    return (
                      <tr key={enquiry._id} className="transition hover:bg-slate-50">
                        <Td><p className="truncate text-sm font-medium text-slate-900">{enquiry.name || enquiry.phone || 'Unknown student'}</p><p className="mt-0.5 truncate text-xs text-slate-500">{enquiry.email || enquiry.phone || 'No contact detail'}</p></Td>
                        <Td><p className="truncate text-sm text-slate-800">{enquiry.courseId?.name || 'Not selected'}</p><p className="text-xs text-slate-500">{enquiry.courseId?.duration || ''}</p></Td>
                        <Td><p className="truncate text-sm text-slate-800">{enquiry.batchId?.name || 'Not selected'}</p><p className="text-xs text-slate-500">{enquiry.batchId?.timing || ''}</p></Td>
                        <Td><div className="flex max-w-[280px] gap-1.5 overflow-x-auto whitespace-nowrap pb-1">{(enquiry.tags || []).map((tag) => <span key={tag} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700">{tag}<button onClick={() => removeTag(enquiry, tag)} className="text-green-500 hover:text-red-600">x</button></span>)}<button onClick={() => addTag(enquiry)} className="inline-flex shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">+ Tag</button></div></Td>
                        <Td><p className="line-clamp-2 max-w-[360px] text-xs text-slate-600">{enquiry.notes || 'No notes yet'}</p></Td>
                        <Td><p className="text-sm font-medium text-slate-900">{currency(enquiry.fees || 0)}</p><p className="text-xs text-green-700">Paid {currency(paid)}</p><p className="text-xs text-red-600">Pending {currency(pending)}</p></Td>
                        <Td><select value={enquiry.status} onChange={(e) => handleStatusChange(enquiry._id, e.target.value as EnquiryStatus)} className={`cursor-pointer rounded-md border-0 px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500 ${statusClass[enquiry.status]}`}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Td>
                        <Td><span className="text-xs text-slate-500">{enquiry.createdAt ? new Date(enquiry.createdAt).toLocaleDateString() : '-'}</span></Td>
                        <Td><div className="flex items-center gap-2"><button onClick={() => { setSelectedEnquiry(enquiry); setIsEnquiryModalOpen(true); }} className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50" title="Edit"><Edit className="h-4 w-4" /></button><button onClick={() => { setSelectedEnquiry(enquiry); setIsPaymentLogsModalOpen(true); }} className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50" title="Payments"><Eye className="h-4 w-4" /></button><button onClick={() => { setSelectedEnquiry(enquiry); setIsAddPaymentLogModalOpen(true); }} className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50" title="Add payment"><IndianRupee className="h-4 w-4" /></button>{enquiry.phone ? <Link href={`/projects/${projectId}/live-chat-v2?phone=${encodeURIComponent(enquiry.phone)}`} className="rounded-md bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700">Message</Link> : null}<button onClick={() => handleDeleteEnquiry(enquiry)} className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50" title="Delete"><Trash2 className="h-4 w-4" /></button></div></Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isEnquiryModalOpen && <EnquiryModal isOpen={isEnquiryModalOpen} onClose={() => setIsEnquiryModalOpen(false)} onEnquirySaved={fetchEnquiries} enquiry={selectedEnquiry} projectId={projectId} />}
      {isPaymentLogsModalOpen && <PaymentLogsModal isOpen={isPaymentLogsModalOpen} onClose={() => setIsPaymentLogsModalOpen(false)} paymentLogs={selectedEnquiry?.paymentLogs || []} />}
      {isAddPaymentLogModalOpen && <AddPaymentLogModal isOpen={isAddPaymentLogModalOpen} onClose={() => setIsAddPaymentLogModalOpen(false)} onPaymentLogSaved={fetchEnquiries} enquiryId={selectedEnquiry?._id || ''} projectId={projectId} />}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: 'blue' | 'amber' | 'green' | 'red' }) {
  const color = tone === 'blue' ? 'text-blue-600' : tone === 'amber' ? 'text-amber-600' : tone === 'green' ? 'text-emerald-600' : tone === 'red' ? 'text-red-600' : 'text-slate-900';
  return <div className="animate-content-in rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><p className="text-xs font-medium text-slate-500">{label}</p><p className={`mt-1 text-xl font-semibold ${color}`}>{value}</p></div>;
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}
