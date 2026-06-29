/**
 * Pathology lab vertical — module presets and lab types.
 */

export const PATHOLOGY_LAB_TYPES = ['standalone', 'hospital_attached', 'collection_center'];

export const MODULE_PRESETS_BY_LAB_TYPE = {
  standalone: [
    'patients',
    'tests',
    'orders',
    'collection',
    'reports',
    'billing',
    'compliance',
    'whatsapp',
    'flow-builder',
  ],
  hospital_attached: [
    'patients',
    'tests',
    'orders',
    'collection',
    'reports',
    'billing',
    'referrers',
    'compliance',
    'whatsapp',
    'flow-builder',
  ],
  collection_center: [
    'patients',
    'orders',
    'collection',
    'reports',
    'whatsapp',
    'flow-builder',
  ],
};

export function modulesForLabType(labType = 'standalone') {
  return MODULE_PRESETS_BY_LAB_TYPE[labType] || MODULE_PRESETS_BY_LAB_TYPE.standalone;
}
