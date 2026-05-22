/**
 * Canonical plan features & limits — drives superadmin UI, public comparison, and route gating.
 */

import { META_MESSAGE_RATES_INR } from './metaMessagePricing.js';

export const PRODUCT_LINES = ['whatsapp', 'healthcare'];

/** Meta conversation / message category rates (INR per billable message) */
export const MESSAGE_CHARGE_ROWS = [
  { key: 'marketing', label: 'Marketing messages', category: 'Message charges (INR per message)' },
  { key: 'utility', label: 'Utility messages', category: 'Message charges (INR per message)' },
  { key: 'authentication', label: 'Authentication (OTP)', category: 'Message charges (INR per message)' },
  { key: 'service', label: 'Service / session replies', category: 'Message charges (INR per message)' },
];

export function defaultMessageCharges() {
  return { ...META_MESSAGE_RATES_INR };
}

export function resolveMessageCharges(planCharges) {
  const defaults = defaultMessageCharges();
  const raw = planCharges && typeof planCharges === 'object' ? planCharges : {};
  return MESSAGE_CHARGE_ROWS.reduce((acc, row) => {
    const v = raw[row.key];
    acc[row.key] = v !== null && v !== undefined && v !== '' ? Number(v) : defaults[row.key] ?? 0;
    return acc;
  }, {});
}

export const LIMIT_KEYS = [
  { key: 'messages', label: 'WhatsApp messages / month', productLine: 'whatsapp', unit: 'count' },
  { key: 'contacts', label: 'Contacts', productLine: 'whatsapp', unit: 'count' },
  { key: 'campaigns', label: 'Campaigns / month', productLine: 'whatsapp', unit: 'count' },
  { key: 'templates', label: 'Message templates', productLine: 'whatsapp', unit: 'count' },
  { key: 'phoneNumbers', label: 'Business numbers', productLine: 'whatsapp', unit: 'count' },
  { key: 'users', label: 'Team members', productLine: 'whatsapp', unit: 'count' },
  { key: 'apiCalls', label: 'API calls / month', productLine: 'whatsapp', unit: 'count' },
  { key: 'storageGB', label: 'Storage (GB)', productLine: 'whatsapp', unit: 'gb' },
  { key: 'patients', label: 'Patients', productLine: 'healthcare', unit: 'count' },
  { key: 'appointments', label: 'Appointments / month', productLine: 'healthcare', unit: 'count' },
  { key: 'prescriptions', label: 'Prescriptions / month', productLine: 'healthcare', unit: 'count' },
  { key: 'doctors', label: 'Doctors', productLine: 'healthcare', unit: 'count' },
  { key: 'healthcareUsers', label: 'Clinic staff logins', productLine: 'healthcare', unit: 'count' },
];

export const FEATURE_DEFINITIONS = [
  // WhatsApp platform
  { key: 'live_chat', label: 'Live chat inbox', productLine: 'whatsapp', category: 'Messaging' },
  { key: 'broadcasts', label: 'Broadcasts', productLine: 'whatsapp', category: 'Messaging' },
  { key: 'campaigns', label: 'Campaigns', productLine: 'whatsapp', category: 'Messaging' },
  { key: 'chatbot', label: 'Chatbot / flows', productLine: 'whatsapp', category: 'Automation' },
  { key: 'flow_builder', label: 'Flow builder', productLine: 'whatsapp', category: 'Automation' },
  { key: 'templates', label: 'WhatsApp templates', productLine: 'whatsapp', category: 'Messaging' },
  { key: 'contacts_crm', label: 'Contacts & segments', productLine: 'whatsapp', category: 'CRM' },
  { key: 'api_access', label: 'API access', productLine: 'whatsapp', category: 'Developers' },
  { key: 'webhooks', label: 'Webhooks', productLine: 'whatsapp', category: 'Developers' },
  { key: 'analytics', label: 'Analytics dashboard', productLine: 'whatsapp', category: 'Insights' },
  { key: 'multi_agent', label: 'Multi-agent routing', productLine: 'whatsapp', category: 'Team' },
  { key: 'whatsapp_api', label: 'Official WhatsApp API', productLine: 'whatsapp', category: 'Core' },
  // Healthcare
  { key: 'hc_patients', label: 'Patient registry', productLine: 'healthcare', category: 'Clinical' },
  { key: 'hc_appointments', label: 'Appointments', productLine: 'healthcare', category: 'Clinical' },
  { key: 'hc_prescriptions', label: 'Prescriptions & PDF', productLine: 'healthcare', category: 'Clinical' },
  { key: 'hc_frontdesk', label: 'Front desk queue', productLine: 'healthcare', category: 'Operations' },
  { key: 'hc_billing', label: 'Patient billing', productLine: 'healthcare', category: 'Billing' },
  { key: 'hc_pharmacy', label: 'Medicine catalog', productLine: 'healthcare', category: 'Pharmacy' },
  { key: 'hc_inventory', label: 'Inventory', productLine: 'healthcare', category: 'Pharmacy' },
  { key: 'hc_doctors', label: 'Doctors & staff', productLine: 'healthcare', category: 'Team' },
  { key: 'hc_analytics', label: 'Clinic overview analytics', productLine: 'healthcare', category: 'Insights' },
  { key: 'hc_whatsapp', label: 'WhatsApp reminders', productLine: 'healthcare', category: 'Messaging' },
  { key: 'hc_compliance', label: 'Consent & compliance', productLine: 'healthcare', category: 'Governance' },
];

/** API path prefix → required entitlement key */
export const ROUTE_ENTITLEMENT_MAP = [
  { prefix: '/api/healthcare', key: 'hc_patients', productLine: 'healthcare' },
  { prefix: '/api/clinic', key: 'hc_patients', productLine: 'healthcare' },
  { prefix: '/api/campaigns', key: 'campaigns', productLine: 'whatsapp' },
  { prefix: '/api/broadcasts', key: 'broadcasts', productLine: 'whatsapp' },
  { prefix: '/api/chatbots', key: 'chatbot', productLine: 'whatsapp' },
  { prefix: '/api/live-chat', key: 'live_chat', productLine: 'whatsapp' },
];

const WHATSAPP_LIMITS = LIMIT_KEYS.filter((l) => l.productLine === 'whatsapp');
const WHATSAPP_FEATURES = FEATURE_DEFINITIONS.filter((f) => f.productLine === 'whatsapp');
const HEALTHCARE_LIMITS = LIMIT_KEYS.filter((l) => l.productLine === 'healthcare');
const HEALTHCARE_FEATURES = FEATURE_DEFINITIONS.filter((f) => f.productLine === 'healthcare');

/** Keys that collide between a limit row and a feature row (same entitlement name). */
const FEATURE_ROWS_SKIP_WHEN_LIMIT_EXISTS = new Set(['campaigns', 'templates']);

export function catalogForProductLine(productLine) {
  const line = PRODUCT_LINES.includes(productLine) ? productLine : 'whatsapp';

  if (line === 'healthcare') {
    return {
      productLine: line,
      limits: [...HEALTHCARE_LIMITS, ...WHATSAPP_LIMITS],
      features: [
        ...HEALTHCARE_FEATURES,
        ...WHATSAPP_FEATURES.filter((f) => !FEATURE_ROWS_SKIP_WHEN_LIMIT_EXISTS.has(f.key)),
      ],
    };
  }

  return {
    productLine: line,
    limits: WHATSAPP_LIMITS,
    features: WHATSAPP_FEATURES.filter((f) => !FEATURE_ROWS_SKIP_WHEN_LIMIT_EXISTS.has(f.key)),
  };
}

export function buildFeatureMatrix(plans, productLine) {
  const catalog = catalogForProductLine(productLine);
  const rows = [
    ...catalog.limits.map((l) => ({ kind: 'limit', key: l.key, label: l.label, category: 'Usage limits' })),
    ...catalog.features.map((f) => ({ kind: 'feature', key: f.key, label: f.label, category: f.category })),
    ...MESSAGE_CHARGE_ROWS.map((m) => ({
      kind: 'message_charge',
      key: m.key,
      label: m.label,
      category: m.category,
    })),
  ];

  const planCells = plans.map((plan) => {
    const ent = plan.entitlements && typeof plan.entitlements === 'object'
      ? (plan.entitlements instanceof Map ? Object.fromEntries(plan.entitlements) : plan.entitlements)
      : {};
    const limits = plan.limits || {};
    const included = new Set(plan.features?.included || []);
    const charges = resolveMessageCharges(plan.messageCharges);

    const cells = {};
    for (const row of rows) {
      const cellKey = `${row.kind}:${row.key}`;
      if (row.kind === 'limit') {
        const v = limits[row.key];
        cells[cellKey] = v === null || v === undefined ? 'unlimited' : v;
      } else if (row.kind === 'message_charge') {
        cells[cellKey] = charges[row.key] ?? 0;
      } else {
        cells[cellKey] = ent[row.key] === true || included.has(row.key) || included.has(row.label);
      }
    }
    return {
      planId: plan.planId || String(plan._id),
      _id: String(plan._id),
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      currency: plan.currency || 'INR',
      isPopular: plan.isPopular,
      setupFee: plan.setupFee,
      signupCredits: plan.signupCredits,
      monthlyCredits: plan.monthlyCredits,
      cells,
    };
  });

  return { productLine, rows, plans: planCells };
}

export default {
  PRODUCT_LINES,
  LIMIT_KEYS,
  FEATURE_DEFINITIONS,
  MESSAGE_CHARGE_ROWS,
  ROUTE_ENTITLEMENT_MAP,
  catalogForProductLine,
  defaultMessageCharges,
  resolveMessageCharges,
  buildFeatureMatrix,
};
