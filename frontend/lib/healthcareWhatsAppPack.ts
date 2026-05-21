/**
 * Healthcare WhatsApp template pack — names must match backend trigger map
 * in healthcareWhatsAppService.js (sendHealthcareTrigger).
 */

export type HealthcareTemplatePreset = {
  key: string
  name: string
  category: 'utility'
  recommendedTemplateName: string
  purpose: string
  triggerEvents: string[]
  variables: string[]
  sampleMessage: string
}

export const HEALTHCARE_WHATSAPP_PACK: readonly HealthcareTemplatePreset[] = [
  {
    key: 'patient-welcome',
    name: 'Patient welcome',
    category: 'utility',
    recommendedTemplateName: 'healthcare_patient_welcome',
    purpose: 'patient-onboarding',
    triggerEvents: ['patient_created'],
    variables: ['patientName', 'clinicName'],
    sampleMessage: 'Hi {{1}}, welcome to {{2}}. Save this number for appointment updates and care messages.',
  },
  {
    key: 'appointment-reminder',
    name: 'Appointment reminder',
    category: 'utility',
    recommendedTemplateName: 'healthcare_appointment_reminder',
    purpose: 'appointment-reminder',
    triggerEvents: ['appointment_booked', 'appointment_rescheduled', 'appointment_reminder'],
    variables: ['patientName', 'doctorName', 'appointmentDate', 'appointmentTime', 'clinicName'],
    sampleMessage:
      'Hi {{1}}, reminder: your appointment with Dr. {{2}} is on {{3}} at {{4}}. Reply to confirm or reschedule. — {{5}}',
  },
  {
    key: 'appointment-cancelled',
    name: 'Appointment cancelled',
    category: 'utility',
    recommendedTemplateName: 'healthcare_appointment_cancelled',
    purpose: 'appointment-cancelled',
    triggerEvents: ['appointment_cancelled'],
    variables: ['patientName', 'appointmentDate', 'appointmentTime', 'clinicName'],
    sampleMessage: 'Hi {{1}}, your appointment on {{2}} at {{3}} has been cancelled. Contact {{4}} to rebook.',
  },
  {
    key: 'refill-reminder',
    name: 'Prescription refill reminder',
    category: 'utility',
    recommendedTemplateName: 'healthcare_refill_reminder',
    purpose: 'refill-reminder',
    triggerEvents: ['prescription_saved'],
    variables: ['patientName', 'medicineName', 'daysLeft', 'clinicName'],
    sampleMessage: 'Hi {{1}}, your medicine {{2}} may run out in {{3}} day(s). Contact {{4}} for refill support.',
  },
  {
    key: 'follow-up-checkin',
    name: 'Follow-up check-in',
    category: 'utility',
    recommendedTemplateName: 'healthcare_followup_checkin',
    purpose: 'follow-up',
    triggerEvents: ['follow_up'],
    variables: ['patientName', 'doctorName', 'followUpDate', 'clinicName'],
    sampleMessage:
      'Hi {{1}}, this is your follow-up reminder from Dr. {{2}} for {{3}}. Reply if you need to reschedule. — {{4}}',
  },
  {
    key: 'invoice-created',
    name: 'Invoice created',
    category: 'utility',
    recommendedTemplateName: 'healthcare_invoice_created',
    purpose: 'billing-invoice',
    triggerEvents: ['invoice_created'],
    variables: ['patientName', 'totalAmount', 'clinicName'],
    sampleMessage: 'Hi {{1}}, your clinic invoice total is INR {{2}}. — {{3}}',
  },
  {
    key: 'payment-received',
    name: 'Payment received',
    category: 'utility',
    recommendedTemplateName: 'healthcare_payment_received',
    purpose: 'payment-received',
    triggerEvents: ['payment_received'],
    variables: ['patientName', 'amount', 'clinicName'],
    sampleMessage: 'Hi {{1}}, we received your payment of INR {{2}}. Thank you. — {{3}}',
  },
  {
    key: 'payment-pending',
    name: 'Payment pending reminder',
    category: 'utility',
    recommendedTemplateName: 'healthcare_payment_pending_reminder',
    purpose: 'payment-pending',
    triggerEvents: ['payment_pending_reminder'],
    variables: ['patientName', 'amount', 'clinicName'],
    sampleMessage: 'Hi {{1}}, a payment of INR {{2}} is pending. — {{3}}',
  },
] as const

export const HEALTHCARE_PACK_TEMPLATE_NAMES = HEALTHCARE_WHATSAPP_PACK.map((p) => p.recommendedTemplateName)

export const HEALTHCARE_TEMPLATES_CATEGORY = 'Healthcare'

export function isHealthcarePackTemplateName(name: string | undefined | null): boolean {
  return Boolean(name && name.startsWith('healthcare_'))
}

const PACK_BY_TEMPLATE_NAME = new Map(
  HEALTHCARE_WHATSAPP_PACK.map((p) => [p.recommendedTemplateName, p]),
)
const PACK_BY_KEY = new Map(HEALTHCARE_WHATSAPP_PACK.map((p) => [p.key, p]))

/** API presets omit triggerEvents — merge with local pack definition */
export function normalizeHealthcarePreset(
  partial: Partial<HealthcareTemplatePreset> & { recommendedTemplateName: string },
): HealthcareTemplatePreset {
  const local =
    PACK_BY_TEMPLATE_NAME.get(partial.recommendedTemplateName) ||
    (partial.key ? PACK_BY_KEY.get(partial.key) : undefined)

  return {
    key: partial.key || local?.key || partial.recommendedTemplateName,
    name: partial.name || local?.name || partial.recommendedTemplateName,
    category: 'utility',
    recommendedTemplateName: partial.recommendedTemplateName,
    purpose: partial.purpose || local?.purpose || 'healthcare-outbound',
    triggerEvents: partial.triggerEvents?.length
      ? partial.triggerEvents
      : local?.triggerEvents ?? [],
    variables: partial.variables?.length ? partial.variables : local?.variables ?? [],
    sampleMessage: partial.sampleMessage || local?.sampleMessage || '',
  }
}

export function normalizeHealthcarePresetList(
  presets: Array<Partial<HealthcareTemplatePreset> & { recommendedTemplateName: string }>,
): HealthcareTemplatePreset[] {
  return presets.map(normalizeHealthcarePreset)
}

export type TemplateStatus = 'approved' | 'pending' | 'rejected' | 'draft' | string

export type AccountTemplateRow = {
  _id?: string
  name: string
  status: TemplateStatus
  category?: string
  language?: string
  content?: string
  createdAt?: string
  rejectedReason?: string
}

export function mergePackWithTemplates(
  pack: readonly HealthcareTemplatePreset[],
  accountTemplates: AccountTemplateRow[],
) {
  const byName = new Map(accountTemplates.map((t) => [t.name, t]))
  return pack.map((preset) => {
    const existing = byName.get(preset.recommendedTemplateName)
    return {
      preset,
      existing,
      status: (existing?.status as TemplateStatus) || 'missing',
    }
  })
}

export function packReadiness(rows: ReturnType<typeof mergePackWithTemplates>) {
  const approved = rows.filter((r) => r.status === 'approved').length
  const total = rows.length
  const pending = rows.filter((r) => r.status === 'pending' || r.status === 'draft').length
  const missing = rows.filter((r) => r.status === 'missing').length
  return { approved, total, pending, missing, ready: approved === total && total > 0 }
}
