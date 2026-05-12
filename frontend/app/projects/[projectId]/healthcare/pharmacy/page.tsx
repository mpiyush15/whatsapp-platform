"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2, Plus, RefreshCw, Search, X } from "lucide-react"
import { apiGet, apiPost } from "@/lib/api-client"
import DataTable from "@/components/DataTable"

interface PharmacyProductRecord {
  productId: string
  sku?: string | null
  name: string
  genericName?: string | null
  brand?: string | null
  category?: string | null
  dosageForm?: string | null
  strength?: string | null
  currentStock?: number
  reorderLevel?: number
  unitPrice?: number
  mrp?: number
  status?: string
}

interface ProductsResponse {
  success: boolean
  data?: {
    products: PharmacyProductRecord[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

const initialForm = {
  name: "",
  genericName: "",
  brand: "",
  category: "",
  dosageForm: "",
  strength: "",
  status: "active",
}

export default function MedicineMasterPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [products, setProducts] = useState<PharmacyProductRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [form, setForm] = useState(initialForm)
  const [total, setTotal] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const loadProducts = useCallback(async (query = "") => {
    try {
      setLoading(true)
      setError("")

      const payload = await apiGet<ProductsResponse>(
        `/healthcare/pharmacy-products?projectId=${encodeURIComponent(projectId)}&limit=50${query ? `&q=${encodeURIComponent(query)}` : ""}`
      )
      const list = payload?.data?.products || []

      setProducts(list)
      setTotal(payload?.data?.pagination?.total || list.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load medicines")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadProducts("")
  }, [loadProducts])

  const productColumns = useMemo(
    () => [
      { key: "name", label: "Medicine name" },
      {
        key: "genericName",
        label: "Generic / brand",
        render: (_: string, row: PharmacyProductRecord) => `${row.genericName || "—"} / ${row.brand || "—"}`,
      },
      {
        key: "form",
        label: "Form / strength",
        render: (_: string, row: PharmacyProductRecord) => [row.dosageForm, row.strength].filter(Boolean).join(" · ") || "—",
      },
      { key: "category", label: "Category", render: (v: string) => v || "—" },
      {
        key: "status",
        label: "Status",
        render: (v: string) => (
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium uppercase ${
              v === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {v || "active"}
          </span>
        ),
      },
    ],
    []
  )

  const handleCreateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError("")
      setSuccessMessage("")

      const payload = await apiPost<{ data?: { product: PharmacyProductRecord } }>("/healthcare/pharmacy-products", {
        projectId,
        name: form.name.trim(),
        genericName: form.genericName.trim() || null,
        brand: form.brand.trim() || null,
        category: form.category.trim() || null,
        dosageForm: form.dosageForm.trim() || null,
        strength: form.strength.trim() || null,
        sku: null,
        unitPrice: 0,
        mrp: 0,
        reorderLevel: 0,
        currentStock: 0,
        status: form.status,
      })

      if (payload?.data?.product) {
        setProducts((current) => [payload.data!.product, ...current])
        setTotal((current) => current + 1)
      }

      setForm(initialForm)
      setSuccessMessage("Medicine added to master list")
      setShowCreateModal(false)
      loadProducts(search)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("healthcare-medicine-catalog-updated"))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add medicine")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Medicine master</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
              Add medicines for prescriptions. Pricing and stock are managed in billing / inventory when those modules are enabled.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {loading ? "Loading catalog…" : `${total.toLocaleString("en-IN")} medicine${total === 1 ? "" : "s"} in catalog`}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
            <div className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-100">
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void loadProducts(search)
                  }
                }}
                placeholder="Search by name or generic…"
                className="h-9 min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                aria-label="Search medicines"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
              <button
                type="button"
                onClick={() => void loadProducts(search)}
                className="inline-flex h-10 min-w-[5.5rem] flex-1 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 sm:flex-initial"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => void loadProducts(search)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Refresh list"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setError("")
                  setSuccessMessage("")
                  setShowCreateModal(true)
                }}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700 sm:flex-initial sm:min-w-[10rem]"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Add medicine
              </button>
            </div>
          </div>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {successMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>
        ) : null}

        <div className="mt-5">
          <DataTable
            columns={productColumns}
            data={products as any[]}
            loading={loading}
            error={null}
            emptyMessage="No medicines yet. Add your first entry above."
            rowClassName="hover:bg-emerald-50/40"
          />
        </div>
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Add medicine</h2>
                <p className="mt-1 text-sm text-slate-500">Medicine name is required. Everything else is optional.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false)
                  setError("")
                  setForm(initialForm)
                }}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form id="create-medicine-form" onSubmit={handleCreateProduct} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Medicine name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                    placeholder="e.g. Paracetamol 500mg tablet"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Generic name</label>
                    <input
                      value={form.genericName}
                      onChange={(event) => setForm((current) => ({ ...current, genericName: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                      placeholder="e.g. Acetaminophen"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Brand</label>
                    <input
                      value={form.brand}
                      onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                      placeholder="e.g. Calpol"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                  <input
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                    placeholder="e.g. Analgesic, Antibiotic"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Dosage form</label>
                    <select
                      value={form.dosageForm}
                      onChange={(event) => setForm((current) => ({ ...current, dosageForm: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                    >
                      <option value="">— Select —</option>
                      <option value="Tablet">Tablet</option>
                      <option value="Capsule">Capsule</option>
                      <option value="Syrup">Syrup</option>
                      <option value="Injection">Injection</option>
                      <option value="Drop">Drop</option>
                      <option value="Cream">Cream</option>
                      <option value="Ointment">Ointment</option>
                      <option value="Powder">Powder</option>
                      <option value="Inhaler">Inhaler</option>
                      <option value="Patch">Patch</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Strength</label>
                    <input
                      value={form.strength}
                      onChange={(event) => setForm((current) => ({ ...current, strength: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                      placeholder="e.g. 500mg, 10mg/5ml"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-100 p-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setError("")
                    setForm(initialForm)
                  }}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {submitting ? "Saving…" : "Save medicine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
