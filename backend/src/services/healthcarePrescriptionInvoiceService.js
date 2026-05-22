import Clinic from '../models/Clinic.js';
import PatientInvoice from '../models/PatientInvoice.js';
import PharmacyProduct from '../models/PharmacyProduct.js';
import { fireHealthcareWhatsAppTrigger } from './healthcareWhatsAppService.js';

const DEFAULT_CONSULTATION_FEE = 500;
const PRESCRIPTION_NOTE_PREFIX = 'prescriptionId:';

function buildScopeFilter(scope) {
  const filter = { accountId: scope.accountId };
  if (scope.projectId) filter.projectId = scope.projectId;
  return filter;
}

function isBillingEnabled(clinic) {
  if (!clinic) return false;
  const modules = clinic.enabledModules || [];
  if (modules.length && !modules.includes('billing')) return false;
  return clinic.billingSettings?.enabled !== false;
}

function isPharmacyBillingEnabled(clinic) {
  if (!isBillingEnabled(clinic)) return false;
  const modules = clinic.enabledModules || [];
  if (!modules.includes('pharmacy')) return false;
  if (clinic.clinicType === 'consultation') {
    return clinic.billingSettings?.pharmacyBillingEnabled === true;
  }
  return clinic.billingSettings?.pharmacyBillingEnabled !== false;
}

async function findExistingPrescriptionInvoice(scope, prescriptionId) {
  const marker = `${PRESCRIPTION_NOTE_PREFIX}${prescriptionId}`;
  return PatientInvoice.findOne({
    ...buildScopeFilter(scope),
    notes: { $regex: marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') },
  });
}

async function hasVisitChargeInvoice(scope, appointmentId) {
  if (!appointmentId) return false;
  const existing = await PatientInvoice.findOne({
    ...buildScopeFilter(scope),
    appointmentId,
    'items.description': { $regex: /consultation|visit charge/i },
  });
  return Boolean(existing);
}

function buildMedicineLine(medicine, product) {
  const quantity = Math.max(Number(medicine.quantity) || 1, 1);
  const unitPrice = product ? Number(product.unitPrice || product.mrp || 0) : 0;
  const description = product
    ? `${medicine.medicineName}${medicine.dosage ? ` — ${medicine.dosage}` : ''}`
    : `${medicine.medicineName}${medicine.dosage ? ` (${medicine.dosage})` : ''}${medicine.frequency ? ` · ${medicine.frequency}` : ''}`;

  return {
    description,
    quantity,
    unitPrice,
    total: quantity * unitPrice,
  };
}

/**
 * Create patient invoice when doctor saves a prescription (for reception to collect payment).
 */
export async function createInvoiceForPrescription(scope, prescription, { actor = 'system' } = {}) {
  if (!scope?.projectId || !prescription?.prescriptionId) {
    return { invoice: null, skipped: true, reason: 'missing_context' };
  }

  const clinic = await Clinic.findOne({ projectId: scope.projectId });
  if (!isBillingEnabled(clinic)) {
    return { invoice: null, skipped: true, reason: 'billing_disabled' };
  }

  const existing = await findExistingPrescriptionInvoice(scope, prescription.prescriptionId);
  if (existing) {
    return { invoice: existing, skipped: true, reason: 'already_exists' };
  }

  const items = [];
  const doctorLabel = prescription.doctorSnapshot?.fullName || 'Doctor';

  const addConsultation =
    prescription.appointmentId && !(await hasVisitChargeInvoice(scope, prescription.appointmentId));

  if (addConsultation) {
    items.push({
      description: `Visit / consultation — ${doctorLabel}`,
      quantity: 1,
      unitPrice: DEFAULT_CONSULTATION_FEE,
      total: DEFAULT_CONSULTATION_FEE,
    });
  } else if (!prescription.appointmentId) {
    items.push({
      description: `Consultation — ${doctorLabel}`,
      quantity: 1,
      unitPrice: DEFAULT_CONSULTATION_FEE,
      total: DEFAULT_CONSULTATION_FEE,
    });
  }

  const pharmacyBilling = isPharmacyBillingEnabled(clinic);
  let catalogByName = new Map();

  if (pharmacyBilling) {
    const products = await PharmacyProduct.find({
      ...buildScopeFilter(scope),
      status: 'active',
    })
      .select('name unitPrice mrp')
      .limit(500)
      .lean();
    catalogByName = new Map(products.map((p) => [String(p.name || '').toLowerCase(), p]));
  }

  const medicines = prescription.medicines || [];
  for (const medicine of medicines) {
    const product = pharmacyBilling
      ? catalogByName.get(String(medicine.medicineName || '').toLowerCase())
      : null;
    if (pharmacyBilling && !product) continue;
    items.push(buildMedicineLine(medicine, product));
  }

  if (!pharmacyBilling && medicines.length > 0) {
    items.push({
      description: `Medicines (${medicines.length} items — see prescription)`,
      quantity: 1,
      unitPrice: 0,
      total: 0,
    });
  }

  if (!items.length) {
    return { invoice: null, skipped: true, reason: 'no_line_items' };
  }

  const subtotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const dueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invoice = await PatientInvoice.create({
    accountId: scope.accountId,
    projectId: scope.projectId,
    patientId: prescription.patientId,
    appointmentId: prescription.appointmentId || null,
    status: 'issued',
    subtotal,
    discount: 0,
    tax: 0,
    total: subtotal,
    amountPaid: 0,
    balanceDue: subtotal,
    items,
    notes: `${PRESCRIPTION_NOTE_PREFIX}${prescription.prescriptionId} — Bill after prescription by ${doctorLabel}`,
    issuedAt: new Date(),
    dueAt,
    createdBy: actor,
    updatedBy: actor,
  });

  fireHealthcareWhatsAppTrigger(scope.accountId, scope.projectId, 'invoice_created', {
    patientId: invoice.patientId,
    patientPhone: prescription.patientSnapshot?.phoneNumber,
    patientName: prescription.patientSnapshot?.fullName,
    totalAmount: invoice.total,
  }).catch(() => {});

  return { invoice, skipped: false, reason: null };
}

export default {
  createInvoiceForPrescription,
};
