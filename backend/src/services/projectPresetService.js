import Clinic from '../models/Clinic.js';
import {
  getPresetById,
  MODULE_PRESETS_BY_CLINIC_TYPE,
  normalizeVertical,
  HEALTHCARE_CLINIC_TYPES,
  PROJECT_PRESETS,
} from '../config/projectPresets.js';

/**
 * Apply vertical + optional healthcare clinic seed after project create.
 */
export async function applyProjectPreset({
  accountId,
  projectId,
  projectName,
  vertical: verticalInput,
  presetId = null,
  clinicType = 'consultation',
}) {
  const preset = presetId ? getPresetById(presetId) : null;
  const vertical = preset?.vertical || normalizeVertical(verticalInput);
  const resolvedClinicType = preset?.clinicType || clinicType;

  const result = {
    vertical,
    presetId: preset?.id || null,
    clinicSeeded: false,
    defaultHomePath: preset?.defaultHomePath || (vertical === 'healthcare' ? 'healthcare' : 'root'),
    checklist: [],
  };

  if (vertical !== 'healthcare') {
    result.checklist = buildGenericChecklist(vertical);
    return result;
  }

  if (!HEALTHCARE_CLINIC_TYPES.includes(resolvedClinicType)) {
    throw new Error(`Invalid clinicType. Allowed: ${HEALTHCARE_CLINIC_TYPES.join(', ')}`);
  }

  const modules = MODULE_PRESETS_BY_CLINIC_TYPE[resolvedClinicType] || MODULE_PRESETS_BY_CLINIC_TYPE.consultation;
  const pharmacyBilling = resolvedClinicType === 'clinic_pharmacy';

  const existing = await Clinic.findOne({ projectId });
  if (!existing) {
    await Clinic.create({
      accountId,
      projectId,
      name: (projectName || 'My Clinic').trim(),
      clinicType: resolvedClinicType,
      enabledModules: modules,
      billingSettings: {
        enabled: true,
        pharmacyBillingEnabled: pharmacyBilling,
        gstEnabled: true,
        gstPercentage: '18%',
        currency: 'INR ₹',
      },
      whatsappAutomationSettings: {
        sendPrescription: true,
        medicineReminders: pharmacyBilling,
        followUpReminders: true,
      },
      createdBy: accountId,
      updatedBy: accountId,
    });
    result.clinicSeeded = true;
  }

  result.checklist = buildHealthcareChecklist(resolvedClinicType);
  return result;
}

function buildGenericChecklist(vertical) {
  if (vertical === 'ecommerce') {
    return [
      'Connect WhatsApp in Settings → WhatsApp setup',
      'Create product/order templates',
      'Set up Live Chat for customer queries',
    ];
  }
  return [
    'Connect WhatsApp in Settings → WhatsApp setup',
    'Create and approve message templates',
    'Open Live Chat or start a campaign',
  ];
}

function buildHealthcareChecklist(clinicType) {
  const items = [
    'Complete Clinic setup (branding & modules)',
    'Connect WhatsApp number in Settings',
    'Install healthcare template pack under Templates → Healthcare',
    'Submit templates to Meta and sync approval status',
    'Add patients and book first appointment',
  ];
  if (clinicType === 'clinic_pharmacy') {
    items.splice(4, 0, 'Configure inventory & pharmacy billing');
  }
  return items;
}

export function listProjectPresets() {
  return PROJECT_PRESETS;
}
