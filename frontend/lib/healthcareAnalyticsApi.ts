import { apiGet } from '@/lib/api-client'

export type HealthcareAnalyticsPeriod = 'week' | 'month' | 'year'

export type HealthcareMetric = {
  value: number
  previous?: number
  changePct?: number
}

export type HealthcareDoctorStat = {
  doctorId: string
  name: string
  visits: number
  prescriptions: number
}

export type HealthcareAnalytics = {
  period: HealthcareAnalyticsPeriod
  range: { start: string; end: string; label?: string }
  kpis: {
    revenueCollected: HealthcareMetric
    revenueBilled: HealthcareMetric
    outstandingDue: { value: number }
    visits: HealthcareMetric
    completedVisits: { value: number }
    prescriptions: HealthcareMetric
    newPatients: HealthcareMetric
    patients: { value: number }
    doctors: { value: number }
    upcomingAppointments: { value: number }
  }
  doctors: HealthcareDoctorStat[]
}

export async function fetchHealthcareAnalytics(
  projectId: string,
  period: HealthcareAnalyticsPeriod
): Promise<HealthcareAnalytics | null> {
  const res = await apiGet<{ success?: boolean; data?: HealthcareAnalytics } & Partial<HealthcareAnalytics>>(
    `/healthcare/analytics?projectId=${encodeURIComponent(projectId)}&period=${period}`
  )
  if (res?.data && typeof res.data === 'object' && 'kpis' in res.data) {
    return res.data
  }
  if (res && 'kpis' in res && 'period' in res) {
    return res as HealthcareAnalytics
  }
  return null
}

export function formatInr(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(Math.round(n || 0))
}
