import Lab from '../models/Lab.js';
import { getPresetById } from '../config/projectPresets.js';
import { modulesForLabType, PATHOLOGY_LAB_TYPES } from '../config/pathologyPresets.js';

export function buildPathologyChecklist(labType = 'standalone') {
  const items = [
    'Complete lab setup (branding & modules)',
    'Connect WhatsApp in Settings',
    'Add test catalog (panels & pricing)',
    'Configure collection schedule',
    'Install lab booking WhatsApp bot (coming soon)',
    'Install report-ready WhatsApp templates (coming soon)',
  ];
  if (labType === 'hospital_attached') {
    items.splice(3, 0, 'Add referring hospitals / doctors');
  }
  return items;
}

export async function applyPathologyProjectPreset({
  accountId,
  projectId,
  projectName,
  presetId = null,
  labType = 'standalone',
}) {
  const preset = presetId ? getPresetById(presetId) : null;
  const resolvedLabType = preset?.labType || labType;

  if (!PATHOLOGY_LAB_TYPES.includes(resolvedLabType)) {
    throw new Error(`Invalid labType. Allowed: ${PATHOLOGY_LAB_TYPES.join(', ')}`);
  }

  const modules = modulesForLabType(resolvedLabType);
  const existing = await Lab.findOne({ projectId });

  if (!existing) {
    await Lab.create({
      accountId,
      projectId,
      name: (projectName || 'My Diagnostic Lab').trim(),
      labType: resolvedLabType,
      enabledModules: modules,
      billingSettings: {
        enabled: true,
        gstEnabled: true,
        gstPercentage: '18%',
        currency: 'INR ₹',
      },
      whatsappAutomationSettings: {
        sendBookingConfirmation: true,
        sendReportReady: true,
        sendCollectionReminder: true,
      },
      createdBy: accountId,
      updatedBy: accountId,
    });
  }

  return {
    vertical: 'pathology',
    presetId: preset?.id || null,
    labSeeded: !existing,
    defaultHomePath: 'pathology',
    labType: resolvedLabType,
    checklist: buildPathologyChecklist(resolvedLabType),
  };
}

export default {
  applyPathologyProjectPreset,
  buildPathologyChecklist,
};
