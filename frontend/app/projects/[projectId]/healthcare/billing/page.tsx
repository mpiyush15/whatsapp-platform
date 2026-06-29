"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Plus, RefreshCw, Wallet, X } from "lucide-react"
import { apiGet, apiPost } from "@/lib/api-client"
import DataTable from "@/components/DataTable"
import {
  formatInvoiceStatus,
  formatPaymentMethod,
  formatPaymentStatus,
} from "@/lib/healthcareBillingUi"

const StatCard = ({ label, value, tone }: { label: string; value: string | number; tone?: 'slate' | 'blue' | 'amber' | 'green' | 'red' }) => {
  const color = tone === 'blue' ? 'text-blue-600' : tone === 'amber' ? 'text-amber-600' : tone === 'green' ? 'text-emerald-600' : tone === 'red' ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${color}`}>{value}</p>
    </div>
  )
}

interface PatientRecord {
  patientId: string
  fullName: string
}

interface PatientInvoiceRecord {
  patientInvoiceId: string
  invoiceNumber: string
  patientId: string
  status?: string
  total?: number
  amountPaid?: number
  balanceDue?: number
  dueAt?: string | null
  issuedAt?: string | null
  items?: Array<{ description: string; quantity: number; unitPrice: number }>
}

interface PatientPaymentRecord {
  patientPaymentId: string
  patientId: string
  patientInvoiceId?: string | null
  amount: number
  method?: string
  status?: string
  paidAt?: string | null
  referenceNumber?: string | null
  notes?: string
}

interface PatientsResponse {
  success: boolean
  data?: { patients: PatientRecord[] }
}

interface InvoicesResponse {
  success: boolean
  data?: {
    invoices: PatientInvoiceRecord[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
  }
}

interface PaymentsResponse {
  success: boolean
  data?: {
    payments: PatientPaymentRecord[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
  }
}

const invoiceStatusClass: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  issued: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  "partially-paid": "bg-amber-100 text-amber-700",
}

const paymentStatusClass: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-rose-100 text-rose-700",
  refunded: "bg-violet-100 text-violet-700",
  cancelled: "bg-slate-100 text-slate-600",
}

const initialInvoiceForm = {
  patientId: "",
  description: "Consultation fee",
  quantity: "1",
  unitPrice: "",
  discount: "0",
  tax: "0",
  dueAt: "",
  status: "issued",
}

const initialPaymentForm = {
  patientId: "",
  patientInvoiceId: "",
  amount: "",
  method: "cash",
  status: "completed",
  paidAt: "",
  referenceNumber: "",
  notes: "",
}

export default function HealthcareBillingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params.projectId as string
  const prefillPatientId = searchParams.get("patientId")
  const openPaymentFromQuery = searchParams.get("openPayment") === "1"
  const openInvoiceFromQuery = searchParams.get("openInvoice") === "1"
  const prefillInvoiceId = searchParams.get("patientInvoiceId")

  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [invoices, setInvoices] = useState<PatientInvoiceRecord[]>([])
  const [payments, setPayments] = useState<PatientPaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false)
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [invoiceForm, setInvoiceForm] = useState(initialInvoiceForm)
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm)
  const [total, setTotal] = useState(0)
  const [invoicePage, setInvoicePage] = useState(1)
  const [invoiceLimit, setInvoiceLimit] = useState(50)
  const [invoiceSearch, setInvoiceSearch] = useState("")
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all")
  const [invoiceTotalPages, setInvoiceTotalPages] = useState(1)
  const [activeTab, setActiveTab] = useState<'bills' | 'payments'>('bills')
  const [invoiceStartDate, setInvoiceStartDate] = useState("")
  const [invoiceEndDate, setInvoiceEndDate] = useState("")
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      let url = `/healthcare/invoices?projectId=${encodeURIComponent(projectId)}&limit=${invoiceLimit}&page=${invoicePage}`
      if (invoiceSearch.trim()) url += `&q=${encodeURIComponent(invoiceSearch.trim())}`
      if (invoiceStatusFilter !== "all") url += `&status=${encodeURIComponent(invoiceStatusFilter)}`
      if (invoiceStartDate) url += `&startDate=${encodeURIComponent(invoiceStartDate)}`
      if (invoiceEndDate) url += `&endDate=${encodeURIComponent(invoiceEndDate)}`

      const payload = await apiGet<InvoicesResponse>(url)
      const list = payload?.data?.invoices || []

      setInvoices(list)
      setTotal(payload?.data?.pagination?.total || list.length)
      setInvoiceTotalPages(payload?.data?.pagination?.totalPages || 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patient invoices")
    } finally {
      setLoading(false)
    }
  }, [projectId, invoicePage, invoiceLimit, invoiceSearch, invoiceStatusFilter, invoiceStartDate, invoiceEndDate])

  const loadPatients = useCallback(async () => {
    try {
      const payload = await apiGet<PatientsResponse>(`/healthcare/patients?projectId=${encodeURIComponent(projectId)}&limit=200`)
      setPatients(payload?.data?.patients || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients")
    }
  }, [projectId])

  const loadPayments = useCallback(async () => {
    try {
      setPaymentsLoading(true)
      const payload = await apiGet<PaymentsResponse>(`/healthcare/payments?projectId=${encodeURIComponent(projectId)}&limit=25`)
      setPayments(payload?.data?.payments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patient payments")
    } finally {
      setPaymentsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadPatients()
    loadInvoices()
    loadPayments()
  }, [loadInvoices, loadPatients, loadPayments])

  useEffect(() => {
    if (!prefillPatientId) return
    setInvoiceForm((current) => ({ ...current, patientId: prefillPatientId }))
    setPaymentForm((current) => ({
      ...current,
      patientId: prefillPatientId,
      patientInvoiceId: prefillInvoiceId || current.patientInvoiceId || "",
    }))
    if (openInvoiceFromQuery) {
      setShowInvoiceModal(true)
    }
    if (openPaymentFromQuery) {
      setShowPaymentModal(true)
    }
  }, [prefillPatientId, openInvoiceFromQuery, openPaymentFromQuery, prefillInvoiceId])

  const patientNameMap = useMemo(() => {
    return new Map(patients.map((patient) => [patient.patientId, patient.fullName]))
  }, [patients])

  const invoiceNumberMap = useMemo(() => {
    return new Map(invoices.map((invoice) => [invoice.patientInvoiceId, invoice.invoiceNumber]))
  }, [invoices])

  const metrics = useMemo(() => {
    return {
      totalBilled: invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
      collected: invoices.reduce((sum, invoice) => sum + Number(invoice.amountPaid || 0), 0),
      outstanding: invoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0),
      paidCount: invoices.filter((invoice) => invoice.status === "paid").length,
      waitingCount: invoices.filter((inv) => Number(inv.balanceDue || 0) > 0).length,
    }
  }, [invoices])

  const openPaymentForInvoice = useCallback(
    (invoice: PatientInvoiceRecord) => {
      setPaymentForm({
        ...initialPaymentForm,
        patientId: invoice.patientId,
        patientInvoiceId: invoice.patientInvoiceId,
        amount: String(invoice.balanceDue || invoice.total || ""),
        paidAt: "",
      })
      setShowPaymentModal(true)
      setError("")
      setSuccessMessage("")
    },
    []
  )

  const invoiceColumns = useMemo(
    () => [
      { key: "invoiceNumber", label: "Bill no." },
      { key: "patientId", label: "Patient", render: (value: string) => patientNameMap.get(value) || value },
      { key: "total", label: "Total bill", render: (value: number) => `₹${Number(value || 0).toLocaleString("en-IN")}` },
      { key: "amountPaid", label: "Received", render: (value: number) => `₹${Number(value || 0).toLocaleString("en-IN")}` },
      {
        key: "balanceDue",
        label: "Still due",
        render: (value: number) => {
          const due = Number(value || 0)
          return (
            <span className={due > 0 ? "font-semibold text-rose-700" : "text-emerald-700"}>
              ₹{due.toLocaleString("en-IN")}
            </span>
          )
        },
      },
      {
        key: "status",
        label: "Status",
        render: (value: string) => (
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${invoiceStatusClass[value || ""] || "bg-slate-100 text-slate-600"}`}>
            {formatInvoiceStatus(value)}
          </span>
        ),
      },
      { key: "issuedAt", label: "Date", render: (value: string) => (value ? new Date(value).toLocaleDateString("en-IN") : "—") },
      {
        key: "collect",
        label: "Action",
        minWidth: "8rem",
        render: (_: unknown, row: PatientInvoiceRecord) => {
          const due = Number(row.balanceDue || 0)
          if (due <= 0) {
            return <span className="text-xs text-emerald-700">Paid</span>
          }
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                openPaymentForInvoice(row)
              }}
              className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Record payment
            </button>
          )
        },
      },
    ],
    [patientNameMap, openPaymentForInvoice]
  )

  const paymentColumns = useMemo(
    () => [
      { key: "amount", label: "Amount", render: (value: number) => <span className="font-semibold text-emerald-700">₹{Number(value || 0).toLocaleString("en-IN")}</span> },
      { key: "patientId", label: "Patient", render: (value: string) => patientNameMap.get(value) || value },
      { key: "patientInvoiceId", label: "Invoice", render: (value: string) => (value ? invoiceNumberMap.get(value) || value : "—") },
      { key: "method", label: "How paid", render: (value: string) => formatPaymentMethod(value) },
      {
        key: "status",
        label: "Status",
        render: (value: string) => (
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentStatusClass[value || ""] || "bg-slate-100 text-slate-600"}`}>
            {formatPaymentStatus(value)}
          </span>
        ),
      },
      { key: "paidAt", label: "Paid at", render: (value: string) => (value ? new Date(value).toLocaleString() : "—") },
      { key: "referenceNumber", label: "Reference", render: (value: string) => value || "—" },
    ],
    [invoiceNumberMap, patientNameMap]
  )

  const handleCreateInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setInvoiceSubmitting(true)
      setError("")
      setSuccessMessage("")

      const payload = await apiPost<{ data?: { invoice: PatientInvoiceRecord } }>("/healthcare/invoices", {
        projectId,
        patientId: invoiceForm.patientId,
        status: invoiceForm.status,
        discount: Number(invoiceForm.discount || 0),
        tax: Number(invoiceForm.tax || 0),
        dueAt: invoiceForm.dueAt ? new Date(invoiceForm.dueAt).toISOString() : null,
        items: [
          {
            description: invoiceForm.description,
            quantity: Number(invoiceForm.quantity || 1),
            unitPrice: Number(invoiceForm.unitPrice || 0),
          },
        ],
      })

      if (payload?.data?.invoice) {
        setInvoices((current) => [payload.data!.invoice, ...current])
        setTotal((current) => current + 1)
      }

      setInvoiceForm(initialInvoiceForm)
      setSuccessMessage("Patient invoice created successfully")
      loadInvoices()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create patient invoice")
    } finally {
      setInvoiceSubmitting(false)
    }
  }

  const handleCreatePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setPaymentSubmitting(true)
      setError("")
      setSuccessMessage("")

      const payload = await apiPost<{ data?: { payment: PatientPaymentRecord } }>("/healthcare/payments", {
        projectId,
        patientId: paymentForm.patientId,
        patientInvoiceId: paymentForm.patientInvoiceId || null,
        amount: Number(paymentForm.amount || 0),
        method: paymentForm.method,
        status: paymentForm.status,
        paidAt: paymentForm.paidAt ? new Date(paymentForm.paidAt).toISOString() : new Date().toISOString(),
        referenceNumber: paymentForm.referenceNumber || null,
        notes: paymentForm.notes,
      })

      if (payload?.data?.payment) {
        setPayments((current) => [payload.data!.payment, ...current])
      }

      setPaymentForm(initialPaymentForm)
      setSuccessMessage("Patient payment logged successfully")
      loadPayments()
      loadInvoices()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create patient payment")
    } finally {
      setPaymentSubmitting(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6 p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Payments desk</h1>
        </div>
        <div className="flex w-fit rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setActiveTab('bills')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === 'bills' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Patient Bills
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === 'payments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Payments Received
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Waiting" value={metrics.waitingCount} tone="amber" />
        <StatCard label="Total Bills" value={total} tone="slate" />
        <StatCard label="Collected" value={`₹${metrics.collected.toLocaleString("en-IN")}`} tone="green" />
        <StatCard label="Outstanding" value={`₹${metrics.outstanding.toLocaleString("en-IN")}`} tone="red" />
      </div>

      <AnimatePresence mode="wait">
      {activeTab === 'bills' && (
        <motion.div
          key="bills"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row flex-wrap">
          <input
            value={invoiceSearch}
            onChange={(e) => setInvoiceSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") loadInvoices() }}
            placeholder="Search patient name, invoice number..."
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="date"
            value={invoiceStartDate}
            onChange={(e) => { setInvoiceStartDate(e.target.value); setInvoicePage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm xl:w-36"
            title="Start Date"
          />
          <input
            type="date"
            value={invoiceEndDate}
            onChange={(e) => { setInvoiceEndDate(e.target.value); setInvoicePage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm xl:w-36"
            title="End Date"
          />
          <select
            value={invoiceStatusFilter}
            onChange={(e) => { setInvoiceStatusFilter(e.target.value); setInvoicePage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm xl:w-44"
          >
            <option value="all">All status</option>
            <option value="draft">Draft</option>
            <option value="issued">Issued</option>
            <option value="partially-paid">Partially paid</option>
            <option value="paid">Paid</option>
          </select>
          <select
            value={invoiceLimit}
            onChange={(e) => { setInvoiceLimit(Number(e.target.value)); setInvoicePage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm xl:w-32"
          >
            <option value="10">10 / page</option>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
          <button
            onClick={() => { setInvoicePage(1); loadInvoices(); }}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Search
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Patient bills</h2>
            <p className="text-sm text-slate-500">From prescriptions and visit charges — record payment on each row</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { loadPatients(); loadInvoices(); loadPayments() }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button type="button" onClick={() => { setShowPaymentModal(true); setError(""); setSuccessMessage("") }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
              <Wallet className="h-4 w-4" /> Record payment
            </button>
            <button type="button" onClick={() => { setShowInvoiceModal(true); setError(""); setSuccessMessage("") }} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50">
              <Plus className="h-4 w-4" /> Manual bill
            </button>
          </div>
        </div>

        {error ? <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {successMessage ? <div className="mx-5 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}

        <DataTable
          columns={invoiceColumns}
          data={invoices as any[]}
          loading={loading}
          error={null}
          emptyMessage="No bills yet. They appear here when a doctor saves a prescription."
          rowClassName="hover:bg-slate-50"
        />
        <div className="flex items-center justify-between border-t border-slate-200 p-4">
          <span className="text-sm text-slate-500">
            {total} total records {invoiceTotalPages > 1 && `• Page ${invoicePage} of ${invoiceTotalPages}`}
          </span>
          {invoiceTotalPages > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => setInvoicePage(p => Math.max(1, p - 1))}
                disabled={invoicePage === 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setInvoicePage(p => Math.min(invoiceTotalPages, p + 1))}
                disabled={invoicePage === invoiceTotalPages}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
      </motion.div>
      )}

      {/* Payments table */}
      {activeTab === 'payments' && (
      <motion.div
        key="payments"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Payments received</h2>
            <p className="text-sm text-slate-500">Cash, UPI, and card entries logged by reception</p>
          </div>
          <span className="rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">Paid: {metrics.paidCount}</span>
        </div>
        <DataTable
          columns={paymentColumns}
          data={payments as any[]}
          loading={paymentsLoading}
          error={null}
          emptyMessage="No payments logged yet."
          rowClassName="hover:bg-slate-50"
        />
      </div>
      </motion.div>
      )}
      </AnimatePresence>

      {/* New invoice modal */}
      <AnimatePresence>
        {showInvoiceModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Manual bill</h3>
                <p className="text-sm text-slate-500">Only if there is no bill from prescription — e.g. extra charge.</p>
              </div>
              <button type="button" onClick={() => setShowInvoiceModal(false)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X className="h-4 w-4" /></button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Patient</label>
                <select required value={invoiceForm.patientId} onChange={(e) => setInvoiceForm((c) => ({ ...c, patientId: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400">
                  <option value="">Select patient</option>
                  {patients.map((p) => <option key={p.patientId} value={p.patientId}>{p.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">What is this charge for?</label>
                <input required value={invoiceForm.description} onChange={(e) => setInvoiceForm((c) => ({ ...c, description: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400" placeholder="e.g. Visit fee, injection" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Qty</label>
                  <input required type="number" min={1} value={invoiceForm.quantity} onChange={(e) => setInvoiceForm((c) => ({ ...c, quantity: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Unit price (₹)</label>
                  <input required type="number" min={0} value={invoiceForm.unitPrice} onChange={(e) => setInvoiceForm((c) => ({ ...c, unitPrice: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Discount</label>
                  <input type="number" min={0} value={invoiceForm.discount} onChange={(e) => setInvoiceForm((c) => ({ ...c, discount: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Tax</label>
                  <input type="number" min={0} value={invoiceForm.tax} onChange={(e) => setInvoiceForm((c) => ({ ...c, tax: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                  <select value={invoiceForm.status} onChange={(e) => setInvoiceForm((c) => ({ ...c, status: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400">
                    <option value="draft">Draft</option>
                    <option value="issued">Issued</option>
                    <option value="paid">Paid</option>
                    <option value="partially-paid">Partially paid</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Due date</label>
                  <input type="datetime-local" value={invoiceForm.dueAt} onChange={(e) => setInvoiceForm((c) => ({ ...c, dueAt: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowInvoiceModal(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={invoiceSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-70">
                  {invoiceSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {invoiceSubmitting ? "Creating…" : "Create invoice"}
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log payment modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Record payment</h3>
                <p className="text-sm text-slate-500">Patient paid — link to their bill and enter amount (cash / UPI / card).</p>
              </div>
              <button type="button" onClick={() => setShowPaymentModal(false)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X className="h-4 w-4" /></button>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Patient</label>
                <select required value={paymentForm.patientId} onChange={(e) => setPaymentForm((c) => ({ ...c, patientId: e.target.value, patientInvoiceId: "" }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400">
                  <option value="">Select patient</option>
                  {patients.map((p) => <option key={p.patientId} value={p.patientId}>{p.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Which bill? (pick from list)</label>
                <select value={paymentForm.patientInvoiceId} onChange={(e) => setPaymentForm((c) => ({ ...c, patientInvoiceId: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400">
                  <option value="">— Select bill —</option>
                  {invoices.filter((inv) => !paymentForm.patientId || inv.patientId === paymentForm.patientId).map((inv) => (
                    <option key={inv.patientInvoiceId} value={inv.patientInvoiceId}>
                      {inv.invoiceNumber} · due ₹{Number(inv.balanceDue || inv.total || 0).toLocaleString("en-IN")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Amount (₹)</label>
                  <input required type="number" min={1} value={paymentForm.amount} onChange={(e) => setPaymentForm((c) => ({ ...c, amount: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400" placeholder="0" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Paid at</label>
                  <input type="datetime-local" value={paymentForm.paidAt} onChange={(e) => setPaymentForm((c) => ({ ...c, paidAt: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Method</label>
                  <select value={paymentForm.method} onChange={(e) => setPaymentForm((c) => ({ ...c, method: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400">
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="bank-transfer">Bank transfer</option>
                    <option value="wallet">Wallet</option>
                    <option value="insurance">Insurance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                  <select value={paymentForm.status} onChange={(e) => setPaymentForm((c) => ({ ...c, status: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400">
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Reference</label>
                <input value={paymentForm.referenceNumber} onChange={(e) => setPaymentForm((c) => ({ ...c, referenceNumber: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400" placeholder="UPI / bank / card reference" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                <textarea rows={2} value={paymentForm.notes} onChange={(e) => setPaymentForm((c) => ({ ...c, notes: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400" placeholder="Optional collection notes" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={paymentSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-70">
                  {paymentSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                  {paymentSubmitting ? "Logging…" : "Log payment"}
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
/*
              invoices.map((invoice) => (
                <div key={invoice.patientInvoiceId} className="rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/30">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">{invoice.invoiceNumber}</h3>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase text-slate-600">
                          {invoice.status || "draft"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">Patient: {patientNameMap.get(invoice.patientId) || invoice.patientId}</p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <p>Total: ₹{Number(invoice.total || 0).toLocaleString("en-IN")}</p>
                        <p>Paid: ₹{Number(invoice.amountPaid || 0).toLocaleString("en-IN")}</p>
                        <p>Balance: ₹{Number(invoice.balanceDue || 0).toLocaleString("en-IN")}</p>
                        <p>Issued: {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : "—"}</p>
                        <p>Due: {invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString() : "—"}</p>
                        <p>Line items: {invoice.items?.length || 0}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {invoice.balanceDue && invoice.balanceDue > 0 ? "Outstanding" : "Settled / no dues"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Create invoice</h2>
            <p className="mt-1 text-sm text-slate-600">Create invoices and log patient collections from the same billing desk.</p>
          </div>

          <form onSubmit={handleCreateInvoice} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Patient</label>
              <select
                required
                value={invoiceForm.patientId}
                onChange={(event) => setInvoiceForm((current) => ({ ...current, patientId: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
              >
                <option value="">Select patient</option>
                {patients.map((patient) => (
                  <option key={patient.patientId} value={patient.patientId}>{patient.fullName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <input
                required
                value={invoiceForm.description}
                onChange={(event) => setInvoiceForm((current) => ({ ...current, description: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                placeholder="Consultation fee"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Quantity</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={invoiceForm.quantity}
                  onChange={(event) => setInvoiceForm((current) => ({ ...current, quantity: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Unit price</label>
                <input
                  required
                  type="number"
                  min={0}
                  value={invoiceForm.unitPrice}
                  onChange={(event) => setInvoiceForm((current) => ({ ...current, unitPrice: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Discount</label>
                <input
                  type="number"
                  min={0}
                  value={invoiceForm.discount}
                  onChange={(event) => setInvoiceForm((current) => ({ ...current, discount: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tax</label>
                <input
                  type="number"
                  min={0}
                  value={invoiceForm.tax}
                  onChange={(event) => setInvoiceForm((current) => ({ ...current, tax: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={invoiceForm.status}
                  onChange={(event) => setInvoiceForm((current) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                >
                  <option value="draft">Draft</option>
                  <option value="issued">Issued</option>
                  <option value="paid">Paid</option>
                  <option value="partially-paid">Partially paid</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Due date</label>
                <input
                  type="datetime-local"
                  value={invoiceForm.dueAt}
                  onChange={(event) => setInvoiceForm((current) => ({ ...current, dueAt: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={invoiceSubmitting || patients.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {invoiceSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {invoiceSubmitting ? "Creating invoice..." : "Create invoice"}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Add payment</h2>
              <p className="mt-1 text-sm text-slate-600">Record received payments and automatically refresh invoice balances.</p>
            </div>

            <form onSubmit={handleCreatePayment} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Patient</label>
                <select
                  required
                  value={paymentForm.patientId}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, patientId: event.target.value, patientInvoiceId: "" }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                >
                  <option value="">Select patient</option>
                  {patients.map((patient) => (
                    <option key={patient.patientId} value={patient.patientId}>{patient.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Invoice</label>
                <select
                  value={paymentForm.patientInvoiceId}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, patientInvoiceId: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                >
                  <option value="">No linked invoice</option>
                  {invoices
                    .filter((invoice) => !paymentForm.patientId || invoice.patientId === paymentForm.patientId)
                    .map((invoice) => (
                      <option key={invoice.patientInvoiceId} value={invoice.patientInvoiceId}>
                        {invoice.invoiceNumber} • ₹{Number(invoice.balanceDue || invoice.total || 0).toLocaleString("en-IN")}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={paymentForm.amount}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Paid at</label>
                  <input
                    type="datetime-local"
                    value={paymentForm.paidAt}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, paidAt: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Method</label>
                  <select
                    value={paymentForm.method}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="bank-transfer">Bank transfer</option>
                    <option value="wallet">Wallet</option>
                    <option value="insurance">Insurance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={paymentForm.status}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, status: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                  >
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Reference</label>
                <input
                  value={paymentForm.referenceNumber}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, referenceNumber: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                  placeholder="UPI / bank / card reference"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, notes: event.target.value }))}
                  className="h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                  placeholder="Optional collection notes"
                />
              </div>

              <button
                type="submit"
                disabled={paymentSubmitting || patients.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {paymentSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                {paymentSubmitting ? "Logging payment..." : "Log payment"}
              </button>
            </form>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="flex items-center gap-2 font-medium text-slate-800">
                <FileText className="h-4 w-4" /> Billing note
              </div>
              <p className="mt-2">This foundation now supports invoice logging, balance tracking, and manual payment capture. Online gateway reconciliation can layer on top later.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Recent payments</h2>
            <p className="text-sm text-slate-600">Track the latest patient collections and linked invoice references.</p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            Paid invoices: {metrics.paidCount}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {paymentsLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading payments...
            </div>
          ) : payments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
              No patient payments logged yet.
            </div>
          ) : (
            payments.map((payment) => (
              <div key={payment.patientPaymentId} className="rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/30">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">₹{Number(payment.amount || 0).toLocaleString("en-IN")}</h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase text-slate-600">
                        {payment.status || "completed"}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium uppercase text-emerald-700">
                        {payment.method || "cash"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">Patient: {patientNameMap.get(payment.patientId) || payment.patientId}</p>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p>Payment ID: {payment.patientPaymentId}</p>
                      <p>Paid at: {payment.paidAt ? new Date(payment.paidAt).toLocaleString() : "—"}</p>
                      <p>Invoice: {payment.patientInvoiceId ? (invoiceNumberMap.get(payment.patientInvoiceId) || payment.patientInvoiceId) : "Unlinked"}</p>
                      <p>Reference: {payment.referenceNumber || "—"}</p>
                    </div>
                    {payment.notes ? <p className="mt-3 text-sm text-slate-700">Notes: {payment.notes}</p> : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
*/
