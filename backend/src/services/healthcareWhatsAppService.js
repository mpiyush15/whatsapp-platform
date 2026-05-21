import Clinic from '../models/Clinic.js';
import Project from '../models/Project.js';
import HealthcareAuditEvent from '../models/HealthcareAuditEvent.js';
import whatsappService from './whatsappService.js';
import logger from '../utils/logger.js';

const EVENT_TEMPLATE_MAP = {
  patient_created: {
    templateName: 'healthcare_patient_welcome',
    purpose: 'patient-onboarding',
    params: (data, clinicName) => [data.fullName || 'Patient', clinicName],
    phone: (data) => data.phoneNumber || data.whatsappNumber,
    toggle: null,
  },
  appointment_booked: {
    templateName: 'healthcare_appointment_reminder',
    purpose: 'appointment-confirmation',
    params: (data, clinicName) => [
      data.patientName || 'Patient',
      data.doctorName || 'Doctor',
      data.appointmentDate || '',
      data.appointmentTime || '',
      clinicName,
    ],
    phone: (data) => data.patientPhone,
    toggle: null,
  },
  appointment_reminder: {
    templateName: 'healthcare_appointment_reminder',
    purpose: 'appointment-reminder',
    params: (data, clinicName) => [
      data.patientName || 'Patient',
      data.doctorName || 'Doctor',
      data.appointmentDate || '',
      data.appointmentTime || '',
      clinicName,
    ],
    phone: (data) => data.patientPhone,
    toggle: null,
  },
  appointment_rescheduled: {
    templateName: 'healthcare_appointment_reminder',
    purpose: 'appointment-reminder',
    params: (data, clinicName) => [
      data.patientName || 'Patient',
      data.doctorName || 'Doctor',
      data.appointmentDate || '',
      data.appointmentTime || '',
      clinicName,
    ],
    phone: (data) => data.patientPhone,
    toggle: null,
  },
  appointment_cancelled: {
    templateName: 'healthcare_appointment_cancelled',
    purpose: 'appointment-cancelled',
    params: (data, clinicName) => [
      data.patientName || 'Patient',
      data.appointmentDate || '',
      data.appointmentTime || '',
      clinicName,
    ],
    phone: (data) => data.patientPhone,
    toggle: null,
  },
  prescription_saved: {
    templateName: 'healthcare_refill_reminder',
    purpose: 'refill-reminder',
    params: (data, clinicName) => [
      data.patientName || 'Patient',
      data.medicineSummary || 'your prescription',
      '30',
      clinicName,
    ],
    phone: (data) => data.patientPhone,
    toggle: 'prescription',
  },
  follow_up: {
    templateName: 'healthcare_followup_checkin',
    purpose: 'follow-up',
    params: (data, clinicName) => [
      data.patientName || 'Patient',
      data.doctorName || 'Doctor',
      data.followUpDate || '',
      clinicName,
    ],
    phone: (data) => data.patientPhone,
    toggle: 'followUp',
  },
  invoice_created: {
    templateName: 'healthcare_invoice_created',
    purpose: 'billing-invoice',
    params: (data, clinicName) => [data.patientName || 'Patient', String(data.totalAmount || ''), clinicName],
    phone: (data) => data.patientPhone,
    toggle: null,
  },
  payment_received: {
    templateName: 'healthcare_payment_received',
    purpose: 'payment-received',
    params: (data, clinicName) => [
      data.patientName || 'Patient',
      String(data.amount || ''),
      clinicName,
    ],
    phone: (data) => data.patientPhone,
    toggle: null,
  },
  payment_pending_reminder: {
    templateName: 'healthcare_payment_pending_reminder',
    purpose: 'payment-pending',
    params: (data, clinicName) => [
      data.patientName || 'Patient',
      String(data.amount || ''),
      clinicName,
    ],
    phone: (data) => data.patientPhone,
    toggle: null,
  },
};

async function getClinicAutomation(projectId) {
  if (!projectId) return null;
  const clinic = await Clinic.findOne({ projectId }).select('whatsappAutomationSettings name');
  return clinic;
}

function isToggleAllowed(clinic, toggleKey) {
  if (!toggleKey || !clinic?.whatsappAutomationSettings) return true;
  const s = clinic.whatsappAutomationSettings;
  if (toggleKey === 'prescription') {
    return Boolean(s.sendPrescription || s.medicineReminders);
  }
  if (toggleKey === 'followUp') {
    return Boolean(s.followUpReminders);
  }
  return true;
}

async function logTriggerEvent({
  accountId,
  projectId,
  event,
  status,
  reason,
  metadata = {},
}) {
  try {
    await HealthcareAuditEvent.create({
      accountId,
      projectId,
      action: 'whatsapp_trigger',
      entityType: 'healthcare_whatsapp',
      entityId: metadata.templateName || event,
      severity: status === 'sent' ? 'info' : 'warning',
      metadata: {
        event,
        status,
        reason,
        ...metadata,
      },
    });
  } catch (err) {
    logger.warn('Healthcare audit log failed', { event, err: err?.message });
  }
}

/**
 * Send healthcare WhatsApp template for a lifecycle event.
 * Never throws — returns outcome for callers / audit.
 */
export async function sendHealthcareTrigger(accountId, projectId, event, data = {}) {
  const outcome = {
    event,
    attempted: false,
    sent: false,
    reason: 'unknown',
    templateName: null,
  };

  try {
    const mapping = EVENT_TEMPLATE_MAP[event];
    if (!mapping) {
      outcome.reason = 'unknown_event';
      await logTriggerEvent({ accountId, projectId, event, status: 'skipped', reason: outcome.reason });
      return outcome;
    }

    const project = await Project.findOne({ accountId, projectId, status: 'active' })
      .select('whatsappPhoneNumberId name');

    if (!project?.whatsappPhoneNumberId) {
      outcome.reason = 'no_whatsapp_phone_configured';
      await logTriggerEvent({ accountId, projectId, event, status: 'skipped', reason: outcome.reason, metadata: {} });
      return outcome;
    }

    const clinic = await getClinicAutomation(projectId);
    const clinicName = project.name || clinic?.name || 'Clinic';

    if (!isToggleAllowed(clinic, mapping.toggle)) {
      outcome.reason = 'automation_toggle_off';
      await logTriggerEvent({
        accountId,
        projectId,
        event,
        status: 'skipped',
        reason: outcome.reason,
        metadata: { toggle: mapping.toggle },
      });
      return outcome;
    }

    const recipientPhone = mapping.phone(data);
    if (!recipientPhone) {
      outcome.reason = 'recipient_phone_missing';
      await logTriggerEvent({ accountId, projectId, event, status: 'skipped', reason: outcome.reason });
      return outcome;
    }

    outcome.attempted = true;
    outcome.templateName = mapping.templateName;

    await whatsappService.sendTemplateMessage(
      accountId,
      project.whatsappPhoneNumberId,
      recipientPhone,
      mapping.templateName,
      mapping.params(data, clinicName),
      {
        campaign: 'healthcare',
        projectId,
        patientId: data.patientId || null,
        purpose: mapping.purpose,
        healthcareConsentCheck: true,
      },
    );

    outcome.sent = true;
    outcome.reason = null;
    await logTriggerEvent({
      accountId,
      projectId,
      event,
      status: 'sent',
      reason: null,
      metadata: { templateName: mapping.templateName, purpose: mapping.purpose },
    });
  } catch (err) {
    outcome.reason = err?.message || 'send_failed';
    logger.warn('Healthcare WhatsApp trigger failed', {
      event,
      projectId,
      reason: outcome.reason,
    });
    await logTriggerEvent({
      accountId,
      projectId,
      event,
      status: 'failed',
      reason: outcome.reason,
      metadata: { templateName: outcome.templateName },
    });
  }

  return outcome;
}

/**
 * Fire-and-forget wrapper (legacy routes).
 */
export function fireHealthcareWhatsAppTrigger(accountId, projectId, event, data = {}) {
  sendHealthcareTrigger(accountId, projectId, event, data).catch(() => {});
}

export default {
  sendHealthcareTrigger,
  fireHealthcareWhatsAppTrigger,
};
