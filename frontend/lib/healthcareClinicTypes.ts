/**
 * Clinic workflow types (persisted as Clinic.clinicType in Mongo).
 * - consultation: consult + medicine master + consultation billing; counter-style pharmacy (no stock-linked Rx invoicing by default).
 * - clinic_pharmacy: integrated dispensary (master + inventory + combined billing).
 * - hospital: legacy preset; UI maps to integrated for selection until user saves a new type.
 */
export type ClinicTypeId = "consultation" | "clinic_pharmacy" | "hospital"

export const MODULE_PRESETS: Record<ClinicTypeId, string[]> = {
  consultation: [
    "patients",
    "appointments",
    "doctors",
    "prescriptions",
    "pharmacy",
    "billing",
    "whatsapp",
  ],
  clinic_pharmacy: [
    "patients",
    "appointments",
    "doctors",
    "prescriptions",
    "pharmacy",
    "inventory",
    "billing",
    "whatsapp",
  ],
  hospital: [
    "patients",
    "appointments",
    "frontdesk",
    "doctors",
    "nurses",
    "prescriptions",
    "pharmacy",
    "inventory",
    "billing",
    "compliance",
    "whatsapp",
    "flow-builder",
  ],
}

/** Which card is highlighted in setup (two-card UI): hospital counts as integrated. */
export function clinicTypeForSelector(clinicType: ClinicTypeId): "consultation" | "clinic_pharmacy" {
  return clinicType === "hospital" ? "clinic_pharmacy" : clinicType
}

export function pharmacyBillingDefaultForType(clinicType: ClinicTypeId): boolean {
  return clinicType === "clinic_pharmacy" || clinicType === "hospital"
}
