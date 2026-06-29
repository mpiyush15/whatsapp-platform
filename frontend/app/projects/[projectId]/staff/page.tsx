'use client'

import Link from 'next/link'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useProject } from '@/lib/context/ProjectContext'
import { authService, User } from '@/lib/auth'
import { Loader2 } from 'lucide-react'
import { apiGet } from '@/lib/api-client'

type StaffRole = 'doctor' | 'head_doctor' | 'nurse' | 'receptionist' | 'billing' | 'admin'

interface Appointment {
  appointmentId: string
  patientId: string
  scheduledAt: string
  status?: string
}

interface Patient {
  patientId: string
  fullName: string
}

interface Prescription {
  prescriptionId: string
  patientSnapshot?: { fullName?: string | null }
  medicines?: Array<{ medicineName?: string }>
}

interface QueueMetrics {
  total: number
  waiting: number
  inClinic: number
  completed: number
}

interface Invoice {
  balanceDue?: number
}

interface Payment {
  amount?: number
  paidAt?: string
  status?: string
}

function formatStaffRole(role: string | null | undefined): string {
  if (!role) return 'Staff'
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function startOfTodayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function endOfTodayIso() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export default function StaffHomePage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { project, loading, error } = useProject()
  const [user, setUser] = useState<User | null>(null)

  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [doctorPatients, setDoctorPatients] = useState<Patient[]>([])
  const [recentPrescriptions, setRecentPrescriptions] = useState<Prescription[]>([])
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [overviewCounts, setOverviewCounts] = useState<Record<string, number>>({})

  const staffProfile = user?.healthcareStaffProfileByProject?.[projectId]
  const role = (staffProfile?.role || user?.staffRole || 'doctor') as StaffRole
  const linkedDoctorId = staffProfile?.linkedDoctorId || null

  useEffect(() => {
    setUser(authService.getCurrentUser())
  }, [])

  useEffect(() => {
    if (!projectId) return
    if (!user) {
      setDashboardLoading(false)
      setDashboardError('Session not ready. Please refresh or log in again.')
      return
    }

    const run = async () => {
      try {
        setDashboardLoading(true)
        setDashboardError('')
        const pid = encodeURIComponent(projectId)

        if (role === 'doctor') {
          if (!linkedDoctorId) {
            setDashboardError('Doctor profile is not linked yet. Ask admin to link this login to a doctor.')
            setDashboardLoading(false)
            return
          }

          const did = encodeURIComponent(linkedDoctorId)
          const [today, all, rx] = await Promise.all([
            apiGet<{ data?: { appointments: Appointment[] } }>(
              `/healthcare/appointments?projectId=${pid}&doctorId=${did}&from=${encodeURIComponent(startOfTodayIso())}&to=${encodeURIComponent(endOfTodayIso())}&limit=100`
            ),
            apiGet<{ data?: { appointments: Appointment[] } }>(
              `/healthcare/appointments?projectId=${pid}&doctorId=${did}&limit=100`
            ),
            apiGet<{ data?: { prescriptions: Prescription[] } }>(
              `/healthcare/prescriptions?projectId=${pid}&doctorId=${did}&limit=5`
            ),
          ])

          const todayList = today?.data?.appointments || []
          const allList = all?.data?.appointments || []
          setTodayAppointments(todayList)
          setAppointments(allList)
          setRecentPrescriptions((rx?.data?.prescriptions || []).slice(0, 5))

          const recentPatientIds = [...new Set(
            [...allList]
              .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
              .map((a) => a.patientId)
              .filter(Boolean)
          )].slice(0, 5)

          const patientRows = await Promise.all(
            recentPatientIds.map(async (patientId) => {
              const data = await apiGet<{ data?: { patient: Patient } }>(`/healthcare/patients/${encodeURIComponent(patientId)}?projectId=${pid}`)
              return data?.data?.patient
            })
          )
          setDoctorPatients(patientRows.filter(Boolean) as Patient[])
        } else if (role === 'receptionist') {
          const queue = await apiGet<{ data?: { metrics: QueueMetrics } }>(`/healthcare/frontdesk/queue?projectId=${pid}`)
          setQueueMetrics(queue?.data?.metrics || null)
        } else if (role === 'billing') {
          const [invoiceData, paymentData] = await Promise.all([
            apiGet<{ data?: { invoices: Invoice[] } }>(`/healthcare/invoices?projectId=${pid}&limit=30`),
            apiGet<{ data?: { payments: Payment[] } }>(`/healthcare/payments?projectId=${pid}&limit=30`),
          ])
          setInvoices(invoiceData?.data?.invoices || [])
          setPayments(paymentData?.data?.payments || [])
        } else {
          const [overview, apt] = await Promise.all([
            apiGet<{ data?: { counts?: Record<string, number> } }>(`/healthcare/overview?projectId=${pid}`),
            apiGet<{ data?: { appointments: Appointment[] } }>(
              `/healthcare/appointments?projectId=${pid}&from=${encodeURIComponent(startOfTodayIso())}&to=${encodeURIComponent(endOfTodayIso())}&limit=100`
            ),
          ])
          setOverviewCounts(overview?.data?.counts || {})
          setTodayAppointments(apt?.data?.appointments || [])
        }
      } catch (e) {
        setDashboardError(e instanceof Error ? e.message : 'Failed to load staff dashboard')
      } finally {
        setDashboardLoading(false)
      }
    }

    void run()
  }, [projectId, user, role, linkedDoctorId])

  const doctorMetrics = useMemo(() => {
    const completedToday = todayAppointments.filter((a) => a.status === 'completed').length
    const pendingToday = todayAppointments.filter((a) => ['scheduled', 'confirmed', 'checked-in'].includes(String(a.status || ''))).length
    return {
      totalToday: todayAppointments.length,
      completedToday,
      pendingToday,
      myTotal: appointments.length,
    }
  }, [todayAppointments, appointments])

  const billingMetrics = useMemo(() => {
    const pendingInvoices = invoices.filter((inv) => Number(inv.balanceDue || 0) > 0).length
    const collectedToday = payments
      .filter((p) => p.status === 'completed' && p.paidAt && new Date(p.paidAt).toDateString() === new Date().toDateString())
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
    return { pendingInvoices, collectedToday }
  }, [invoices, payments])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome{user?.name ? `, ${user.name}` : ''}</h1>
        <p className="mt-2 text-sm text-gray-500">{formatStaffRole(role)} · {project?.name ?? 'Project'}</p>
      </div>

      {dashboardLoading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-gray-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      ) : dashboardError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{dashboardError}</div>
      ) : null}

      {!dashboardLoading && !dashboardError && role === 'doctor' ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="My total appointments" value={doctorMetrics.myTotal} />
            <MetricCard label="Today appointments" value={doctorMetrics.totalToday} />
            <MetricCard label="Pending today" value={doctorMetrics.pendingToday} />
            <MetricCard label="Completed today" value={doctorMetrics.completedToday} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="My recent patients">
              {doctorPatients.length === 0 ? (
                <EmptyLine text="No patients linked through your appointments yet." />
              ) : (
                doctorPatients.map((p) => (
                  <div key={p.patientId} className="flex items-center justify-between border-b border-gray-100 py-2 text-sm last:border-b-0">
                    <span className="font-medium text-gray-900">{p.fullName}</span>
                    <Link className="text-green-600 hover:text-green-700" href={`/projects/${projectId}/healthcare/patients/${p.patientId}`}>
                      View
                    </Link>
                  </div>
                ))
              )}
            </Panel>

            <Panel title="Recent prescriptions">
              {recentPrescriptions.length === 0 ? (
                <EmptyLine text="No recent prescriptions." />
              ) : (
                recentPrescriptions.map((rx) => (
                  <div key={rx.prescriptionId} className="border-b border-gray-100 py-2 text-sm last:border-b-0">
                    <p className="font-medium text-gray-900">{rx.patientSnapshot?.fullName || 'Patient'}</p>
                    <p className="text-gray-600">
                      {(rx.medicines || []).map((m) => m.medicineName).filter(Boolean).slice(0, 2).join(', ') || 'Medicine details'}
                    </p>
                  </div>
                ))
              )}
            </Panel>
          </div>
        </>
      ) : null}

      {!dashboardLoading && !dashboardError && role === 'receptionist' && queueMetrics ? (
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Queue total" value={queueMetrics.total} />
          <MetricCard label="Waiting" value={queueMetrics.waiting} />
          <MetricCard label="In clinic" value={queueMetrics.inClinic} />
          <MetricCard label="Completed" value={queueMetrics.completed} />
        </div>
      ) : null}

      {!dashboardLoading && !dashboardError && role === 'billing' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard label="Pending invoices" value={billingMetrics.pendingInvoices} />
          <MetricCard label="Collected today" value={`Rs ${billingMetrics.collectedToday.toFixed(0)}`} />
        </div>
      ) : null}

      {!dashboardLoading && !dashboardError && (role === 'nurse' || role === 'admin' || role === 'head_doctor') ? (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Patients" value={overviewCounts.patients || 0} />
          <MetricCard label="Active patients" value={overviewCounts.activePatients || 0} />
          <MetricCard label="Today's appointments" value={todayAppointments.length} />
        </div>
      ) : null}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm text-gray-500">{text}</p>
}
