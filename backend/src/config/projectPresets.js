/**
 * Project creation presets — vertical + optional healthcare clinic seed.
 */

export const PROJECT_VERTICALS = ['whatsapp', 'healthcare', 'ecommerce'];

export const HEALTHCARE_CLINIC_TYPES = ['consultation', 'clinic_pharmacy'];

export const MODULE_PRESETS_BY_CLINIC_TYPE = {
  consultation: [
    'patients',
    'appointments',
    'doctors',
    'prescriptions',
    'pharmacy',
    'billing',
    'whatsapp',
  ],
  clinic_pharmacy: [
    'patients',
    'appointments',
    'doctors',
    'prescriptions',
    'pharmacy',
    'inventory',
    'billing',
    'whatsapp',
  ],
};

export const PROJECT_PRESETS = [
  {
    id: 'whatsapp-general',
    vertical: 'whatsapp',
    label: 'WhatsApp Business',
    description: 'Inbox, campaigns, templates, broadcasts, and chatbot flows.',
    defaultHomePath: 'root',
    features: ['Live Chat', 'Campaigns', 'Templates', 'Broadcasts', 'Flow Builder'],
  },
  {
    id: 'healthcare-consultation',
    vertical: 'healthcare',
    label: 'Healthcare — Consultation clinic',
    description: 'Patients, appointments, prescriptions, billing, and WhatsApp automations.',
    clinicType: 'consultation',
    defaultHomePath: 'healthcare',
    features: ['Patients', 'Appointments', 'Prescriptions', 'Billing', 'Healthcare templates'],
  },
  {
    id: 'healthcare-dispensary',
    vertical: 'healthcare',
    label: 'Healthcare — Clinic + dispensary',
    description: 'Full clinic plus inventory and pharmacy billing on WhatsApp.',
    clinicType: 'clinic_pharmacy',
    defaultHomePath: 'healthcare',
    features: ['Everything in consultation', 'Inventory', 'Stock-linked billing'],
  },
  {
    id: 'ecommerce-d2c',
    vertical: 'ecommerce',
    label: 'E-commerce / D2C',
    description: 'Catalog campaigns, order updates, and agent inbox for stores.',
    defaultHomePath: 'root',
    features: ['Live Chat', 'Campaigns', 'Segments', 'Order-style templates'],
  },
];

export function getPresetById(presetId) {
  return PROJECT_PRESETS.find((p) => p.id === presetId) || null;
}

export function normalizeVertical(input) {
  const v = String(input || 'whatsapp').toLowerCase();
  return PROJECT_VERTICALS.includes(v) ? v : 'whatsapp';
}
