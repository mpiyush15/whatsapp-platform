import { sendHealthcareTrigger } from './healthcareWhatsAppService.js';
import frontdeskRepository from '../repositories/healthcareFrontdeskRepository.js';
import { ValidationError } from '../utils/errorHandler.js';

const ALLOWED_FRONTDESK_STATUSES = new Set([
  'scheduled',
  'confirmed',
  'checked-in',
  'completed',
  'cancelled',
  'no-show',
]);

const toDayWindow = (dateInput) => {
  const now = new Date();
  const source = dateInput ? new Date(`${dateInput}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (Number.isNaN(source.getTime())) {
    throw new ValidationError('Invalid date format. Use YYYY-MM-DD');
  }

  const startAt = new Date(source.getFullYear(), source.getMonth(), source.getDate(), 0, 0, 0, 0);
  const endAt = new Date(source.getFullYear(), source.getMonth(), source.getDate(), 23, 59, 59, 999);
  return { startAt, endAt };
};

const toDisplayDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN');
};

const toDisplayTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const computeMetrics = (appointments) => {
  const byStatus = {
    scheduled: 0,
    confirmed: 0,
    'checked-in': 0,
    completed: 0,
    cancelled: 0,
    'no-show': 0,
  };

  appointments.forEach((item) => {
    const status = String(item.status || 'scheduled');
    if (Object.prototype.hasOwnProperty.call(byStatus, status)) {
      byStatus[status] += 1;
    }
  });

  return {
    total: appointments.length,
    waiting: byStatus.scheduled + byStatus.confirmed,
    inClinic: byStatus['checked-in'],
    completed: byStatus.completed,
    noShow: byStatus['no-show'],
    cancelled: byStatus.cancelled,
    byStatus,
  };
};

const getQueueStage = (appointment) => {
  const status = String(appointment.status || 'scheduled');
  if (status === 'checked-in') return 'in-clinic';
  if (status === 'completed') return 'done';
  if (status === 'cancelled' || status === 'no-show') return 'closed';
  return 'waiting';
};

async function sendFrontdeskTrigger(scope, appointment, triggerType) {
  const base = {
    patientId: appointment.patientId,
    patientPhone: appointment?.patientSnapshot?.phoneNumber,
    patientName: appointment?.patientSnapshot?.fullName,
    doctorName: appointment?.doctorSnapshot?.fullName,
  };

  if (triggerType === 'appointment-reminder') {
    return sendHealthcareTrigger(scope.accountId, scope.projectId, 'appointment_reminder', {
      ...base,
      appointmentDate: toDisplayDate(appointment.scheduledAt),
      appointmentTime: toDisplayTime(appointment.scheduledAt),
    });
  }

  if (triggerType === 'follow-up') {
    return sendHealthcareTrigger(scope.accountId, scope.projectId, 'follow_up', {
      ...base,
      followUpDate: toDisplayDate(new Date()),
    });
  }

  return { attempted: false, sent: false, reason: 'unsupported_trigger_type', event: triggerType };
}

async function getQueueBoard(scope, { date, status, doctorId, limit }) {
  const { startAt, endAt } = toDayWindow(date);
  const normalizedLimit = Math.max(Math.min(Number(limit) || 100, 300), 20);

  const appointments = await frontdeskRepository.listQueueAppointments(scope, {
    startAt,
    endAt,
    status: status || null,
    doctorId: doctorId || null,
    limit: normalizedLimit,
  });

  const nowTs = Date.now();
  const queue = appointments.map((appointment, index) => {
    const scheduledAtTs = new Date(appointment.scheduledAt).getTime();
    const waitMinutes = Math.max(Math.round((nowTs - scheduledAtTs) / 60000), 0);

    return {
      ...appointment,
      tokenNumber: index + 1,
      waitMinutes,
      queueStage: getQueueStage(appointment),
    };
  });

  return {
    date: startAt.toISOString().slice(0, 10),
    queue,
    metrics: computeMetrics(queue),
  };
}

async function updateQueueStatus(scope, { appointmentId, status, actor, sendWhatsApp = true }) {
  if (!ALLOWED_FRONTDESK_STATUSES.has(status)) {
    throw new ValidationError('Invalid status for front desk operation');
  }

  const appointment = await frontdeskRepository.updateAppointmentStatus(scope, {
    appointmentId,
    status,
    actor,
  });

  let trigger = { attempted: false, sent: false, reason: 'not_requested' };
  if (sendWhatsApp) {
    if (status === 'checked-in' || status === 'confirmed') {
      trigger = await sendFrontdeskTrigger(scope, appointment, 'appointment-reminder');
    } else if (status === 'completed') {
      trigger = await sendFrontdeskTrigger(scope, appointment, 'follow-up');
    } else {
      trigger = { attempted: false, sent: false, reason: 'no_template_mapping_for_status' };
    }
  }

  return { appointment, trigger };
}

async function sendAppointmentReminder(scope, { appointmentId }) {
  const appointment = await frontdeskRepository.findAppointment(scope, appointmentId);
  const trigger = await sendFrontdeskTrigger(scope, appointment, 'appointment-reminder');
  return { appointment, trigger };
}

export default {
  getQueueBoard,
  updateQueueStatus,
  sendAppointmentReminder,
};
