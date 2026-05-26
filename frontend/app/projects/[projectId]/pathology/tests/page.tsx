"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2, Plus } from "lucide-react"
import { apiGet, apiPost } from "@/lib/api-client"
import { HealthcareTableShell } from "@/components/healthcare/HealthcareTableShell"
import { useHealthcareListLoader } from "@/lib/hooks/useHealthcareListLoader"

interface LabTest {
  testId: string
  name: string
  code?: string | null
  category?: string
  price?: number
  fastingRequired?: boolean
  status?: string
}

export default function PathologyTestsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [tests, setTests] = useState<LabTest[]>([])
  const { initialLoading, refreshing, run: runListLoad } = useHealthcareListLoader()
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const loadTests = useCallback(async () => {
    try {
      const result = await runListLoad(async () => {
        const payload = await apiGet<{ data?: { tests?: LabTest[] } }>(
          `/pathology/tests?projectId=${encodeURIComponent(projectId)}&limit=100`
        )
        return payload?.data?.tests || []
      })
      if (result) setTests(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tests")
    }
  }, [projectId, runListLoad])

  useEffect(() => {
    void loadTests()
  }, [projectId])

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault()
    try {
      setSubmitting(true)
      setError("")
      await apiPost("/pathology/tests", {
        projectId,
        name: name.trim(),
        price: Number(price) || 0,
      })
      setName("")
      setPrice("")
      await loadTests()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add test")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Test catalog</h1>
        <p className="text-sm text-slate-600">Tests and panels offered by your lab.</p>
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Test name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="e.g. CBC"
          />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-xs font-medium text-slate-600">Price (₹)</label>
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-70"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add test
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <HealthcareTableShell
          initialLoading={initialLoading}
          refreshing={refreshing}
          isEmpty={tests.length === 0}
          emptyMessage="No tests yet. Add your first test above."
        >
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tests.map((test) => (
                <tr key={test.testId}>
                  <td className="px-4 py-3 font-medium text-slate-900">{test.name}</td>
                  <td className="px-4 py-3 text-slate-600">{test.code || "—"}</td>
                  <td className="px-4 py-3">₹{test.price ?? 0}</td>
                  <td className="px-4 py-3 capitalize">{test.status || "active"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </HealthcareTableShell>
      </div>
    </div>
  )
}
