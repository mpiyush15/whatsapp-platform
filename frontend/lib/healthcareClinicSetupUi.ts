/** Plain-language tabs + module labels for clinic setup */

export type ClinicSetupTabId = 'basics' | 'features' | 'prescription' | 'billing' | 'whatsapp'

export type ClinicSetupTabConfig = {
  id: ClinicSetupTabId
  label: string
  hint: string
  accent: string
  border: string
  bg: string
  activeBg: string
}

export const CLINIC_SETUP_TABS: ClinicSetupTabConfig[] = [
  {
    id: 'basics',
    label: 'Clinic details',
    hint: 'Name, phone, type',
    accent: 'text-teal-800',
    border: 'border-teal-500',
    bg: 'bg-teal-50',
    activeBg: 'bg-teal-100',
  },
  {
    id: 'features',
    label: 'Menu options',
    hint: 'What staff see',
    accent: 'text-blue-800',
    border: 'border-blue-500',
    bg: 'bg-blue-50',
    activeBg: 'bg-blue-100',
  },
  {
    id: 'prescription',
    label: 'Prescription paper',
    hint: 'Print layout',
    accent: 'text-violet-800',
    border: 'border-violet-500',
    bg: 'bg-violet-50',
    activeBg: 'bg-violet-100',
  },
  {
    id: 'billing',
    label: 'Payments',
    hint: 'Bills & tax',
    accent: 'text-rose-800',
    border: 'border-rose-500',
    bg: 'bg-rose-50',
    activeBg: 'bg-rose-100',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    hint: 'Patient messages',
    accent: 'text-green-800',
    border: 'border-green-500',
    bg: 'bg-green-50',
    activeBg: 'bg-green-100',
  },
]

export type ClinicModuleOption = {
  id: string
  title: string
  description: string
  group: 'main' | 'extra'
}

export const CLINIC_MODULE_OPTIONS: ClinicModuleOption[] = [
  { id: 'patients', title: 'Patients', description: 'Patient list and visit history', group: 'main' },
  { id: 'appointments', title: 'Visits & appointments', description: 'Book and track visits', group: 'main' },
  { id: 'doctors', title: 'Doctors', description: 'Doctor profiles', group: 'main' },
  { id: 'prescriptions', title: 'Prescriptions', description: 'Write and print medicines', group: 'main' },
  { id: 'billing', title: 'Payments', description: 'Visit charges and invoices', group: 'main' },
  { id: 'whatsapp', title: 'WhatsApp', description: 'Send updates to patients', group: 'main' },
  { id: 'frontdesk', title: 'Waiting queue', description: 'Token / check-in desk', group: 'extra' },
  { id: 'nurses', title: 'Nurses', description: 'Nurse tasks', group: 'extra' },
  { id: 'pharmacy', title: 'Medicine list', description: 'Pick medicines when prescribing', group: 'extra' },
  { id: 'inventory', title: 'Medicine stock', description: 'Stock and expiry tracking', group: 'extra' },
  { id: 'compliance', title: 'Consent & rules', description: 'Privacy and audit', group: 'extra' },
  { id: 'flow-builder', title: 'Auto-replies', description: 'WhatsApp menus and bots', group: 'extra' },
]

export const CLINIC_TYPE_PLAIN = {
  consultation: {
    title: 'Doctor clinic only',
    description: 'Consultation, prescriptions, and bills. No medicine counter stock.',
  },
  clinic_pharmacy: {
    title: 'Clinic + medicine counter',
    description: 'Everything above plus medicine stock and counter sales.',
  },
} as const
