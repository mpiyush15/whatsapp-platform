import Clinic from '../models/Clinic.js';
import { installHealthcareAppointmentBot } from './healthcareAppointmentBotService.js';
import { applyPathologyProjectPreset } from './pathologyPresetService.js';
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
  labType = 'standalone',
}) {
  const preset = presetId ? getPresetById(presetId) : null;
  const vertical = preset?.vertical || normalizeVertical(verticalInput);
  const resolvedClinicType = preset?.clinicType || clinicType;

  const defaultHomePath = preset?.defaultHomePath
    || (vertical === 'healthcare' ? 'healthcare' : vertical === 'pathology' ? 'pathology' : 'root');

  const result = {
    vertical,
    presetId: preset?.id || null,
    clinicSeeded: false,
    defaultHomePath,
    checklist: [],
  };

  if (vertical === 'pathology') {
    const labType = preset?.labType || 'standalone';
    const pathologyResult = await applyPathologyProjectPreset({
      accountId,
      projectId,
      projectName,
      presetId: preset?.id || null,
      labType,
    });
    return {
      ...result,
      ...pathologyResult,
      checklist: pathologyResult.checklist,
    };
  }

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

  try {
    const { created } = await installHealthcareAppointmentBot({
      accountId,
      projectId,
    });
    result.appointmentBotInstalled = true;
    result.appointmentBotCreated = created;
  } catch (err) {
    result.appointmentBotInstalled = false;
    result.appointmentBotError = err?.message || 'install failed';
  }

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
    'Add doctors and set weekly schedules on Doctors page',
    'Appointment booking WhatsApp bot is pre-installed (triggers: hi, hello, book)',
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
