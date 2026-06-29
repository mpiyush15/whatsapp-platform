/** Plain-language labels + tab colors for clinic patient workspace */

export type PatientTabId =
  | 'today'
  | 'visits'
  | 'prescription'
  | 'followup'
  | 'messages'
  | 'details'
  | 'billing'
  | 'notes'
  | 'history'

export type ClinicStaffRole =
  | 'doctor'
  | 'head_doctor'
  | 'nurse'
  | 'receptionist'
  | 'billing'
  | 'admin'
  | 'owner'

export type PatientTabConfig = {
  id: PatientTabId
  label: string
  accent: string
  border: string
  bg: string
  activeBg: string
}

export const PATIENT_TABS: PatientTabConfig[] = [
  {
    id: 'today',
    label: "Today's visit",
    accent: 'text-teal-800',
    border: 'border-teal-500',
    bg: 'bg-teal-50',
    activeBg: 'bg-teal-100',
  },
  {
    id: 'visits',
    label: 'All visits',
    accent: 'text-blue-800',
    border: 'border-blue-500',
    bg: 'bg-blue-50',
    activeBg: 'bg-blue-100',
  },
  {
    id: 'prescription',
    label: 'Prescriptions',
    accent: 'text-violet-800',
    border: 'border-violet-500',
    bg: 'bg-violet-50',
    activeBg: 'bg-violet-100',
  },
  {
    id: 'followup',
    label: 'Come back later',
    accent: 'text-amber-800',
    border: 'border-amber-500',
    bg: 'bg-amber-50',
    activeBg: 'bg-amber-100',
  },
  {
    id: 'messages',
    label: 'WhatsApp',
    accent: 'text-green-800',
    border: 'border-green-500',
    bg: 'bg-green-50',
    activeBg: 'bg-green-100',
  },
  {
    id: 'details',
    label: 'Patient info',
    accent: 'text-slate-800',
    border: 'border-slate-400',
    bg: 'bg-slate-50',
    activeBg: 'bg-slate-100',
  },
  {
    id: 'billing',
    label: 'Payment',
    accent: 'text-rose-800',
    border: 'border-rose-500',
    bg: 'bg-rose-50',
    activeBg: 'bg-rose-100',
  },
  {
    id: 'notes',
    label: 'Notes',
    accent: 'text-indigo-800',
    border: 'border-indigo-500',
    bg: 'bg-indigo-50',
    activeBg: 'bg-indigo-100',
  },
  {
    id: 'history',
    label: 'History',
    accent: 'text-slate-700',
    border: 'border-slate-300',
    bg: 'bg-slate-50',
    activeBg: 'bg-slate-100',
  },
]

export function resolveClinicStaffRole(
  user: {
    staffRole?: string | null
    healthcareStaffProfileByProject?: Record<string, { role?: string | null }>
  } | null,
  projectId: string
): ClinicStaffRole {
  if (!user) return 'owner'
  const profileRole = user.healthcareStaffProfileByProject?.[projectId]?.role
  const role = (profileRole || user.staffRole || '').toLowerCase()
  if (role === 'doctor') return 'doctor'
  if (role === 'head_doctor') return 'head_doctor'
  if (role === 'nurse') return 'nurse'
  if (role === 'receptionist') return 'receptionist'
  if (role === 'billing') return 'billing'
  if (role === 'admin') return 'admin'
  return 'owner'
}

export function tabsForStaffRole(role: ClinicStaffRole, billingEnabled: boolean): PatientTabId[] {
  switch (role) {
    case 'doctor':
      return ['today', 'visits', 'prescription', 'followup', 'messages', 'details', 'notes', 'history']
    case 'head_doctor':
      return [
        'today',
        'visits',
        'prescription',
        'followup',
        'messages',
        'details',
        ...(billingEnabled ? (['billing'] as PatientTabId[]) : []),
        'notes',
        'history',
      ]
    case 'nurse':
      return ['today', 'visits', 'prescription', 'messages', 'details', 'notes', 'history']
    case 'receptionist':
      return [
        'today',
        'visits',
        'followup',
        'messages',
        'details',
        ...(billingEnabled ? (['billing'] as PatientTabId[]) : []),
        'notes',
        'history',
      ]
    case 'billing':
      return ['visits', 'details', ...(billingEnabled ? (['billing'] as PatientTabId[]) : []), 'history']
    case 'admin':
      return PATIENT_TABS.map((t) => t.id).filter((id) => billingEnabled || id !== 'billing')
    default:
      return PATIENT_TABS.map((t) => t.id).filter((id) => billingEnabled || id !== 'billing')
  }
}

export function defaultTabForRole(role: ClinicStaffRole): PatientTabId {
  if (role === 'doctor' || role === 'head_doctor' || role === 'nurse') return 'today'
  if (role === 'billing') return 'billing'
  return 'visits'
}

export function canWritePrescription(role: ClinicStaffRole): boolean {
  return ['doctor', 'head_doctor', 'nurse', 'admin', 'owner'].includes(role)
}

export function canEditPatientNotes(role: ClinicStaffRole): boolean {
  return ['doctor', 'head_doctor', 'nurse', 'receptionist', 'admin', 'owner'].includes(role)
}

export function canBookVisit(role: ClinicStaffRole): boolean {
  return ['doctor', 'head_doctor', 'nurse', 'receptionist', 'admin', 'owner'].includes(role)
}

export function canFinishVisitWithFee(role: ClinicStaffRole): boolean {
  return ['receptionist', 'billing', 'head_doctor', 'admin', 'owner'].includes(role)
}

/** Doctors/nurses see finished today visits in Today's visit table to open Rx. */
export function canViewCompletedTodayVisits(role: ClinicStaffRole): boolean {
  return ['doctor', 'head_doctor', 'nurse', 'admin', 'owner'].includes(role)
}

/** How long a finished visit stays on Today's visit (if not opened — then still drops after this). */
export const COMPLETED_TODAY_VISIBLE_HOURS = 4

export function completedVisitStillVisibleToday(appointment: {
  status?: string | null
  frontdesk?: { completedAt?: string | null } | null
  updatedAt?: string | null
}): boolean {
  if (String(appointment.status || '') !== 'completed') return false
  const finishedAt = appointment.frontdesk?.completedAt || appointment.updatedAt
  if (!finishedAt) return true
  const elapsed = Date.now() - new Date(finishedAt).getTime()
  return elapsed < COMPLETED_TODAY_VISIBLE_HOURS * 60 * 60 * 1000
}

export function formatVisitStatus(status?: string | null): string {
  const map: Record<string, string> = {
    scheduled: 'Booked',
    confirmed: 'Confirmed',
    'checked-in': 'In clinic',
    completed: 'Finished',
    cancelled: 'Cancelled',
    'no-show': 'Did not come',
  }
  return map[String(status || 'scheduled')] || String(status || 'Booked')
}
