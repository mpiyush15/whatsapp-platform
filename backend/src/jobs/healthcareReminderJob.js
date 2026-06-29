import Appointment from '../models/Appointment.js';
import FollowUp from '../models/FollowUp.js';
import { sendHealthcareTrigger } from '../services/healthcareWhatsAppService.js';
import logger from '../utils/logger.js';

const REMINDER_WINDOW_HOURS = 24;
const REMINDER_TOLERANCE_MINUTES = 30;
const ACTIVE_STATUSES = ['scheduled', 'confirmed'];

/**
 * Send 24h-before appointment reminders for healthcare projects.
 */
export async function processHealthcareAppointmentReminders() {
  const now = Date.now();
  const windowStart = new Date(now + (REMINDER_WINDOW_HOURS * 60 - REMINDER_TOLERANCE_MINUTES) * 60 * 1000);
  const windowEnd = new Date(now + (REMINDER_WINDOW_HOURS * 60 + REMINDER_TOLERANCE_MINUTES) * 60 * 1000);

  const due = await Appointment.find({
    projectId: { $ne: null },
    status: { $in: ACTIVE_STATUSES },
    scheduledAt: { $gte: windowStart, $lte: windowEnd },
    'reminder.status': 'pending',
  })
    .select('accountId projectId patientId scheduledAt patientSnapshot doctorSnapshot reminder')
    .limit(100)
    .lean();

  if (!due.length) return { processed: 0, sent: 0, skipped: 0 };

  let sent = 0;
  let skipped = 0;

  for (const appointment of due) {
    const scheduledAt = new Date(appointment.scheduledAt);
    const outcome = await sendHealthcareTrigger(
      appointment.accountId,
      appointment.projectId,
      'appointment_reminder',
      {
        patientId: appointment.patientId,
        patientPhone: appointment.patientSnapshot?.phoneNumber,
        patientName: appointment.patientSnapshot?.fullName,
        doctorName: appointment.doctorSnapshot?.fullName,
        appointmentDate: scheduledAt.toLocaleDateString('en-IN'),
        appointmentTime: scheduledAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      },
    );

    const nextStatus = outcome.sent ? 'sent' : outcome.attempted ? 'failed' : 'skipped';
    await Appointment.updateOne(
      { _id: appointment._id },
      {
        $set: {
          'reminder.status': nextStatus,
          'reminder.sentAt': outcome.sent ? new Date() : appointment.reminder?.sentAt || null,
          'reminder.templateName': outcome.templateName || 'healthcare_appointment_reminder',
        },
      },
    );

    if (outcome.sent) sent += 1;
    else skipped += 1;
  }

  if (sent > 0) {
    logger.info('Healthcare appointment reminders processed', { processed: due.length, sent, skipped });
  }

  return { processed: due.length, sent, skipped };
}

export async function processHealthcareFollowUpReminders() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const due = await FollowUp.find({
    projectId: { $ne: null },
    status: 'scheduled',
    followUpDate: { $gte: todayStart, $lt: todayEnd },
    'reminder.status': 'pending',
  })
    .select('accountId projectId patientId followUpDate patientSnapshot doctorSnapshot reminder')
    .limit(100)
    .lean();

  if (!due.length) return { processed: 0, sent: 0, skipped: 0 };

  let sent = 0;
  let skipped = 0;

  for (const followup of due) {
    const outcome = await sendHealthcareTrigger(
      followup.accountId,
      followup.projectId,
      'follow_up',
      {
        patientId: followup.patientId,
        patientPhone: followup.patientSnapshot?.phoneNumber || followup.patientSnapshot?.whatsappNumber,
        patientName: followup.patientSnapshot?.fullName,
        doctorName: followup.doctorSnapshot?.fullName || 'Doctor',
        bookingUrl: 'our clinic portal',
      },
    );

    const nextStatus = outcome.sent ? 'sent' : outcome.attempted ? 'failed' : 'skipped';
    await FollowUp.updateOne(
      { _id: followup._id },
      {
        $set: {
          'reminder.status': nextStatus,
          'reminder.sentAt': outcome.sent ? new Date() : followup.reminder?.sentAt || null,
          'reminder.templateName': outcome.templateName || 'healthcare_followup_reminder',
        },
      },
    );

    if (outcome.sent) sent += 1;
    else skipped += 1;
  }

  if (sent > 0) {
    logger.info('Healthcare follow-up reminders processed', { processed: due.length, sent, skipped });
  }

  return { processed: due.length, sent, skipped };
}

export default { processHealthcareAppointmentReminders, processHealthcareFollowUpReminders };
