"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Plus, RefreshCw, X, Database } from "lucide-react"
import { apiGet, apiPost } from "@/lib/api-client"
import DataTable from "@/components/DataTable"

interface PharmacyProductRecord {
  productId: string
  name: string
  genericName?: string | null
  dosageForm?: string | null
  strength?: string | null
  currentStock?: number
  status?: string
}

interface StockEntryRecord {
  stockEntryId: string
  productId: string
  movementType: string
  quantity: number
  unitCost?: number
  totalCost?: number
  batchNumber?: string | null
  expiryDate?: string | null
  supplierName?: string | null
  referenceType?: string
  referenceId?: string | null
  entryAt?: string | null
  notes?: string
}

interface ProductsResponse {
  success: boolean
  data?: {
    products: PharmacyProductRecord[]
    pagination?: { total?: number }
  }
}

interface StockEntriesResponse {
  success: boolean
  data?: {
    entries: StockEntryRecord[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

const initialForm = {
  productId: "",
  movementType: "in",
  quantity: "",
  unitCost: "",
  batchNumber: "",
  expiryDate: "",
  supplierName: "",
  referenceType: "manual",
  referenceId: "",
  notes: "",
}

export default function HealthcareInventoryPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [products, setProducts] = useState<PharmacyProductRecord[]>([])
  const [entries, setEntries] = useState<StockEntryRecord[]>([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(true)
  const [reconciling, setReconciling] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [form, setForm] = useState(initialForm)
  const [entryTotal, setEntryTotal] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const loadStockEntries = useCallback(async () => {
    try {
      setEntriesLoading(true)
      setError("")

      const payload = await apiGet<StockEntriesResponse>(
        `/healthcare/stock-entries?projectId=${encodeURIComponent(projectId)}&limit=50`
      )
      const list = payload?.data?.entries || []
      setEntries(list)
      setEntryTotal(payload?.data?.pagination?.total || list.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stock entries")
    } finally {
      setEntriesLoading(false)
    }
  }, [projectId])

  const loadProducts = useCallback(async () => {
    try {
      setProductsLoading(true)
      const payload = await apiGet<ProductsResponse>(
        `/healthcare/pharmacy-products?projectId=${encodeURIComponent(projectId)}&limit=500`
      )
      setProducts(payload?.data?.products || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load medicine catalog")
    } finally {
      setProductsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadProducts()
    void loadStockEntries()
  }, [loadProducts, loadStockEntries])

  useEffect(() => {
    const onCatalogUpdated = () => {
      void loadProducts()
    }
    window.addEventListener("healthcare-medicine-catalog-updated", onCatalogUpdated)
    return () => window.removeEventListener("healthcare-medicine-catalog-updated", onCatalogUpdated)
  }, [loadProducts])

  const reconcileFromLedger = useCallback(async () => {
    try {
      setReconciling(true)
      setError("")
      setSuccessMessage("")
      await apiPost<{ data?: { reconciled?: number } }>("/healthcare/inventory/reconcile-stock", { projectId })
      setSuccessMessage("On-hand quantities updated from the movement ledger.")
      await loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reconcile stock")
    } finally {
      setReconciling(false)
    }
  }, [projectId, loadProducts])

  const openMovementModal = useCallback((productId = "") => {
    setError("")
    setSuccessMessage("")
    setForm({ ...initialForm, productId })
    setShowCreateModal(true)
  }, [])

  const productNameMap = useMemo(() => {
    return new Map(products.map((product) => [product.productId, product.name]))
  }, [products])

  const sortedCatalog = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  const metrics = useMemo(() => {
    return {
      inward: entries.filter((entry) => ["in", "return"].includes(entry.movementType)).length,
      outward: entries.filter((entry) => ["out", "dispense"].includes(entry.movementType)).length,
      adjustments: entries.filter((entry) => entry.movementType === "adjustment").length,
    }
  }, [entries])

  const catalogColumns = useMemo(
    () => [
      { key: "name", label: "Medicine" },
      {
        key: "details",
        label: "Form / strength",
        render: (_: unknown, row: PharmacyProductRecord) =>
          [row.dosageForm, row.strength].filter(Boolean).join(" · ") || "—",
      },
      {
        key: "currentStock",
        label: "On hand",
        render: (_: unknown, row: PharmacyProductRecord) => (
          <span className={Number(row.currentStock || 0) <= 0 ? "font-medium text-amber-700" : "font-medium text-slate-900"}>
            {Number(row.currentStock || 0)}
          </span>
        ),
      },
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
      {
        key: "productId",
        label: "",
        render: (value: string) => (
          <button
            type="button"
            onClick={() => openMovementModal(value)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            Movement
          </button>
        ),
      },
    ],
    [openMovementModal]
  )

  const entryColumns = useMemo(
    () => [
      {
        key: "productId",
        label: "Product",
        render: (value: string) => productNameMap.get(value) || value,
      },
      {
        key: "movementType",
        label: "Movement",
        render: (value: string) => (
          <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium uppercase text-slate-600">
            {value}
          </span>
        ),
      },
      {
        key: "quantity",
        label: "Qty",
        render: (value: number) => <span className="font-medium text-indigo-700">{Number(value || 0)}</span>,
      },
      {
        key: "referenceType",
        label: "Reference",
        render: (_: string, row: StockEntryRecord) =>
          `${row.referenceType || "manual"}${row.referenceId ? ` • ${row.referenceId}` : ""}`,
      },
      {
        key: "entryAt",
        label: "Entry date",
        render: (value: string) => (value ? new Date(value).toLocaleString() : "—"),
      },
      {
        key: "totalCost",
        label: "Total ₹",
        render: (value: number) => `₹${Number(value || 0).toLocaleString("en-IN")}`,
      },
    ],
    [productNameMap]
  )

  const handleCreateEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError("")
      setSuccessMessage("")

      const payload = await apiPost<{ data?: { entry: StockEntryRecord } }>("/healthcare/stock-entries", {
        projectId,
        productId: form.productId,
        movementType: form.movementType,
        quantity: Number(form.quantity || 0),
        unitCost: Number(form.unitCost || 0),
        batchNumber: form.batchNumber || null,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
        supplierName: form.supplierName || null,
        referenceType: form.referenceType,
        referenceId: form.referenceId || null,
        notes: form.notes,
      })

      if (payload?.data?.entry) {
        setEntries((current) => [payload.data!.entry, ...current])
        setEntryTotal((current) => current + 1)
      }

      setForm(initialForm)
      setSuccessMessage("Stock entry saved. On-hand qty synced for this medicine.")
      setShowCreateModal(false)
      await loadStockEntries()
      await loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create stock entry")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6 p-6"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Inventory</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Stock levels follow the{" "}
              <Link href={`/projects/${projectId}/healthcare/pharmacy`} className="font-medium text-indigo-600 underline hover:text-indigo-800">
                Medicine master
              </Link>
              . Add medicines there first, then record movements here. Use <strong>Reconcile</strong> to refresh on-hand counts from the ledger.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void reconcileFromLedger()}
              disabled={reconciling}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {reconciling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Reconcile from ledger
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Medicines in master</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{products.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Stock entries</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{entryTotal}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Inward / return rows</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{metrics.inward}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Out / dispense rows</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{metrics.outward}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Medicine catalog (synced)</h2>
            <p className="text-sm text-slate-600">Same list as Medicine master — on-hand qty updates when you save movements.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadProducts()}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${productsLoading ? "animate-spin" : ""}`} />
            Refresh catalog
          </button>
        </div>
        <div className="mt-5">
          <DataTable
            columns={catalogColumns}
            data={sortedCatalog as any[]}
            loading={productsLoading}
            error={null}
            emptyMessage="No medicines yet. Add them in Medicine master, then return here for stock movements."
            rowClassName="hover:bg-indigo-50/20"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Movement log</h2>
            <p className="text-sm text-slate-600">Recent inventory transactions for this project.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void loadProducts()
                void loadStockEntries()
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${entriesLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => openMovementModal()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add movement
            </button>
          </div>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {successMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>
        ) : null}

        <div className="mt-5">
          <DataTable
            columns={entryColumns}
            data={entries as any[]}
            loading={entriesLoading}
            error={null}
            emptyMessage="No stock entries recorded yet."
            rowClassName="hover:bg-indigo-50/30"
          />
        </div>
      </div>

      <AnimatePresence>
        {showCreateModal && (
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
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Add stock movement</h2>
                <p className="mt-1 text-sm text-slate-600">Choose a medicine from your master catalog and record inward, outward, dispense, return, or adjustment.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false)
                  setForm(initialForm)
                }}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Medicine (from master)</label>
                <select
                  required
                  value={form.productId}
                  onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                >
                  <option value="">Select medicine</option>
                  {sortedCatalog.map((product) => (
                    <option key={product.productId} value={product.productId}>
                      {product.name} — on hand {Number(product.currentStock || 0)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Movement type</label>
                  <select
                    value={form.movementType}
                    onChange={(event) => setForm((current) => ({ ...current, movementType: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                  >
                    <option value="in">Inward</option>
                    <option value="out">Outward</option>
                    <option value="dispense">Dispense</option>
                    <option value="return">Return</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Quantity</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Unit cost</label>
                  <input
                    type="number"
                    min={0}
                    value={form.unitCost}
                    onChange={(event) => setForm((current) => ({ ...current, unitCost: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Batch number</label>
                  <input
                    value={form.batchNumber}
                    onChange={(event) => setForm((current) => ({ ...current, batchNumber: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Supplier</label>
                  <input
                    value={form.supplierName}
                    onChange={(event) => setForm((current) => ({ ...current, supplierName: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Expiry date</label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(event) => setForm((current) => ({ ...current, expiryDate: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Reference type</label>
                  <select
                    value={form.referenceType}
                    onChange={(event) => setForm((current) => ({ ...current, referenceType: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                  >
                    <option value="manual">Manual</option>
                    <option value="purchase">Purchase</option>
                    <option value="prescription">Prescription</option>
                    <option value="return">Return</option>
                    <option value="correction">Correction</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Reference ID</label>
                  <input
                    value={form.referenceId}
                    onChange={(event) => setForm((current) => ({ ...current, referenceId: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || products.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {submitting ? "Saving…" : "Save stock entry"}
              </button>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
