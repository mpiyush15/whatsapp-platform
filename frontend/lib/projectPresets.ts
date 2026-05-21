/**
 * Mirrors backend/src/config/projectPresets.js — used as wizard fallback if API fails.
 */
export type ProjectPreset = {
  id: string;
  vertical: string;
  label: string;
  description: string;
  clinicType?: string;
  defaultHomePath?: string;
  features?: string[];
};

export const PROJECT_PRESETS: readonly ProjectPreset[] = [
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
