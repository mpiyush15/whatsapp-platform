'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Edit, Eye, IndianRupee, PlusCircle, RotateCcw } from 'lucide-react';
import { AddPaymentLogModal } from '@/components/education/AddPaymentLogModal';
import { EnquiryModal } from '@/components/education/EnquiryModal';
import { PaymentLogsModal } from '@/components/education/PaymentLogsModal';
import { ErrorToast } from '@/components/ErrorToast';
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

type PaymentLog = {
  amount: number;
  date: string;
  method: string;
  notes?: string;
};

type Admission = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'new' | 'contacted' | 'admitted' | 'dropped';
  courseId?: { _id: string; name: string; fees?: number; duration?: string } | null;
  batchId?: { _id: string; name: string; timing?: string; startDate?: string } | null;
  contactId?: { source?: string; firstContactAt?: string; lastMessageAt?: string; messageCount?: number; engagementScore?: number } | null;
  source?: string;
  fees?: number;
  studentDetails?: {
    parentName?: string;
    parentPhone?: string;
    address?: string;
    tenthMarks?: string;
  };
  tags?: string[];
  notes?: string;
  paymentLogs?: PaymentLog[];
  createdAt?: string;
};

const currency = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(value || 0);

const paidAmount = (admission: Admission) =>
  (admission.paymentLogs || []).reduce((sum, log) => sum + Number(log.amount || 0), 0);

const admissionSource = (admission: Admission) => admission.source || admission.contactId?.source || 'Manual';

export function AdmissionsHub() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [feeFilter, setFeeFilter] = useState('all');
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [isAdmissionModalOpen, setIsAdmissionModalOpen] = useState(false);
  const [isPaymentLogsModalOpen, setIsPaymentLogsModalOpen] = useState(false);
  const [isAddPaymentLogModalOpen, setIsAddPaymentLogModalOpen] = useState(false);

  const fetchAdmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const query = new URLSearchParams({ projectId, status: 'admitted' });

      const response = await fetch(`${API_URL}/education/enquiries?${query}`, { headers: getHeaders() });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to fetch admissions');
      setAdmissions(payload.enquiries || payload.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch admissions');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchAdmissions();
  }, [fetchAdmissions, projectId]);

  const availableTags = Array.from(new Set(admissions.flatMap((admission) => admission.tags || []))).sort();
  const availableSources = Array.from(new Set(admissions.map(admissionSource))).sort();
  const availableCourses = Array.from(new Map(admissions
    .map((admission) => admission.courseId)
    .filter(Boolean)
    .map((course) => [course!._id, course!] as const)).values()).sort((a, b) => a.name.localeCompare(b.name));
  const availableBatches = Array.from(new Map(admissions
    .map((admission) => admission.batchId)
    .filter(Boolean)
    .map((batch) => [batch!._id, batch!] as const)).values()).sort((a, b) => a.name.localeCompare(b.name));

  const visibleAdmissions = useMemo(() => admissions.filter((admission) => {
    const search = searchTerm.trim().toLowerCase();
    const searchable = [
      admission.name,
      admission.email,
      admission.phone,
      admission.notes,
      admission.courseId?.name,
      admission.batchId?.name,
      admission.studentDetails?.parentName,
      admission.studentDetails?.parentPhone,
      admission.studentDetails?.address,
      admission.studentDetails?.tenthMarks,
      admissionSource(admission),
      ...(admission.tags || []),
    ].filter(Boolean).join(' ').toLowerCase();

    if (search && !searchable.includes(search)) return false;
    if (tagFilter !== 'all' && !(admission.tags || []).includes(tagFilter)) return false;
    if (sourceFilter !== 'all' && admissionSource(admission) !== sourceFilter) return false;
    if (courseFilter !== 'all' && admission.courseId?._id !== courseFilter) return false;
    if (batchFilter !== 'all' && admission.batchId?._id !== batchFilter) return false;
    const pending = Math.max(0, Number(admission.fees || 0) - paidAmount(admission));
    if (feeFilter === 'paid' && pending > 0) return false;
    if (feeFilter === 'pending' && pending <= 0) return false;
    return true;
  }), [admissions, batchFilter, courseFilter, feeFilter, searchTerm, sourceFilter, tagFilter]);

  const metrics = visibleAdmissions.reduce((acc, admission) => {
    const paid = paidAmount(admission);
    const fees = Number(admission.fees || 0);
    acc.total += 1;
    acc.totalFees += fees;
    acc.collected += paid;
    acc.pending += Math.max(0, fees - paid);
    if (admission.courseId?._id) acc.courseIds.add(admission.courseId._id);
    if (admissionSource(admission)) acc.sources.add(admissionSource(admission));
    return acc;
  }, { total: 0, totalFees: 0, collected: 0, pending: 0, courseIds: new Set<string>(), sources: new Set<string>() });

  const updateStatus = async (admission: Admission, status: Admission['status']) => {
    try {
      const response = await fetch(`${API_URL}/education/enquiries/${admission._id}?projectId=${projectId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to update admission');
      fetchAdmissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update admission');
    }
  };

  const handleExport = async () => {
    try {
      const query = new URLSearchParams({ projectId, status: 'admitted' });
      if (searchTerm.trim()) query.set('search', searchTerm.trim());
      if (tagFilter !== 'all') query.set('tag', tagFilter);
      if (sourceFilter !== 'all') query.set('source', sourceFilter);
      const response = await fetch(`${API_URL}/education/enquiries/bulk/export?${query}`, { headers: getHeaders() });
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'education-admissions.csv';
      link.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export admissions');
    }
  };

  const initialLoading = loading && admissions.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      {error && <ErrorToast message={error} onDismiss={() => setError('')} />}
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Admissions Hub</h1>
            <p className="text-sm text-slate-500">Central view for admitted students, source attribution, course batches, fees, and payment follow-up.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExport} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Export CSV</button>
            <button onClick={() => { setSelectedAdmission(null); setIsAdmissionModalOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
              <PlusCircle className="h-4 w-4" /> Add Admission
            </button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {initialLoading ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />) : (
            <>
              <StatCard label="Admissions" value={metrics.total} tone="green" />
              <StatCard label="Collected" value={currency(metrics.collected)} tone="green" />
              <StatCard label="Pending Fees" value={currency(metrics.pending)} tone="red" />
              <StatCard label="Total Fees" value={currency(metrics.totalFees)} />
              <StatCard label="Courses" value={metrics.courseIds.size} tone="blue" />
              <StatCard label="Sources" value={metrics.sources.size} tone="amber" />
            </>
          )}
        </div>

        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search student, phone, notes..." className="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 xl:col-span-2" />
            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">All courses</option>{availableCourses.map((course) => <option key={course._id} value={course._id}>{course.name}</option>)}</select>
            <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">All batches</option>{availableBatches.map((batch) => <option key={batch._id} value={batch._id}>{batch.name}</option>)}</select>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">All sources</option>{availableSources.map((source) => <option key={source} value={source}>{source}</option>)}</select>
            <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">All tags</option>{availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select>
            <select value={feeFilter} onChange={(e) => setFeeFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">All fees</option><option value="pending">Pending fees</option><option value="paid">Fully paid</option></select>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {initialLoading ? (
            <div className="overflow-x-auto">
              <table className="min-w-[1900px] w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr><Th>Student</Th><Th>Parent</Th><Th>Address</Th><Th>10th Marks</Th><Th>Source</Th><Th>Course</Th><Th>Batch</Th><Th>Fees</Th><Th>Tags</Th><Th>Notes</Th><Th>Admitted</Th><Th>Actions</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200"><TableRowsSkeleton rows={7} columns={12} /></tbody>
              </table>
            </div>
          ) : visibleAdmissions.length === 0 ? (
            <div className="animate-content-in p-8 text-center text-slate-600">No admissions found. Convert enquiries to admitted or add an admission manually.</div>
          ) : (
            <div className="animate-content-in overflow-x-auto">
              <table className="min-w-[1900px] w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <Th>Student</Th><Th>Parent</Th><Th>Address</Th><Th>10th Marks</Th><Th>Source</Th><Th>Course</Th><Th>Batch</Th><Th>Fees</Th><Th>Tags</Th><Th>Notes</Th><Th>Admitted</Th><Th>Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleAdmissions.map((admission) => {
                    const paid = paidAmount(admission);
                    const pending = Math.max(0, Number(admission.fees || 0) - paid);
                    return (
                      <tr key={admission._id} className="transition hover:bg-slate-50">
                        <Td><p className="truncate text-sm font-medium text-slate-900">{admission.name || admission.phone || 'Unknown student'}</p><p className="mt-0.5 truncate text-xs text-slate-500">{admission.email || admission.phone || 'No contact detail'}</p></Td>
                        <Td><p className="truncate text-sm text-slate-800">{admission.studentDetails?.parentName || 'Not added'}</p><p className="text-xs text-slate-500">{admission.studentDetails?.parentPhone || ''}</p></Td>
                        <Td><p className="line-clamp-2 max-w-[260px] text-xs text-slate-600">{admission.studentDetails?.address || 'Not added'}</p></Td>
                        <Td><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{admission.studentDetails?.tenthMarks || 'Not added'}</span></Td>
                        <Td><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{admissionSource(admission)}</span><p className="mt-1 text-xs text-slate-500">{admission.contactId?.messageCount || 0} messages</p></Td>
                        <Td><p className="truncate text-sm text-slate-800">{admission.courseId?.name || 'Not selected'}</p><p className="text-xs text-slate-500">{admission.courseId?.duration || ''}</p></Td>
                        <Td><p className="truncate text-sm text-slate-800">{admission.batchId?.name || 'Not selected'}</p><p className="text-xs text-slate-500">{admission.batchId?.timing || ''}</p></Td>
                        <Td><p className="text-sm font-medium text-slate-900">{currency(admission.fees || 0)}</p><p className="text-xs text-green-700">Paid {currency(paid)}</p><p className="text-xs text-red-600">Pending {currency(pending)}</p></Td>
                        <Td><div className="flex max-w-[250px] gap-1.5 overflow-x-auto whitespace-nowrap pb-1">{(admission.tags || []).map((tag) => <span key={tag} className="inline-flex shrink-0 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700">{tag}</span>)}</div></Td>
                        <Td><p className="line-clamp-2 max-w-[360px] text-xs text-slate-600">{admission.notes || 'No notes yet'}</p></Td>
                        <Td><span className="text-xs text-slate-500">{admission.createdAt ? new Date(admission.createdAt).toLocaleDateString() : '-'}</span></Td>
                        <Td><div className="flex items-center gap-2"><button onClick={() => { setSelectedAdmission(admission); setIsAdmissionModalOpen(true); }} className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50" title="Edit admission"><Edit className="h-4 w-4" /></button><button onClick={() => { setSelectedAdmission(admission); setIsPaymentLogsModalOpen(true); }} className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50" title="Payments"><Eye className="h-4 w-4" /></button><button onClick={() => { setSelectedAdmission(admission); setIsAddPaymentLogModalOpen(true); }} className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50" title="Add payment"><IndianRupee className="h-4 w-4" /></button>{admission.phone ? <Link href={`/projects/${projectId}/live-chat-v2?phone=${encodeURIComponent(admission.phone)}`} className="rounded-md bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700">Message</Link> : null}<button onClick={() => updateStatus(admission, 'contacted')} className="rounded-md border border-amber-200 p-2 text-amber-700 hover:bg-amber-50" title="Move back to enquiries"><RotateCcw className="h-4 w-4" /></button></div></Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isAdmissionModalOpen && <EnquiryModal isOpen={isAdmissionModalOpen} onClose={() => setIsAdmissionModalOpen(false)} onEnquirySaved={fetchAdmissions} enquiry={selectedAdmission} projectId={projectId} defaultStatus="admitted" />}
      {isPaymentLogsModalOpen && <PaymentLogsModal isOpen={isPaymentLogsModalOpen} onClose={() => setIsPaymentLogsModalOpen(false)} paymentLogs={selectedAdmission?.paymentLogs || []} />}
      {isAddPaymentLogModalOpen && <AddPaymentLogModal isOpen={isAddPaymentLogModalOpen} onClose={() => setIsAddPaymentLogModalOpen(false)} onPaymentLogSaved={fetchAdmissions} enquiryId={selectedAdmission?._id || ''} projectId={projectId} />}
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
