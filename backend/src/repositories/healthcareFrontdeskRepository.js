import Appointment from '../models/Appointment.js';
import { NotFoundError } from '../utils/errorHandler.js';

const buildScopeFilter = ({ accountId, projectId }) => (
  projectId ? { accountId, projectId } : { accountId }
);

async function listQueueAppointments(scope, { startAt, endAt, status, doctorId, limit = 200 }) {
  const filter = {
    ...buildScopeFilter(scope),
    scheduledAt: { $gte: startAt, $lt: endAt },
    ...(status ? { status } : {}),
    ...(doctorId ? { doctorId } : {}),
  };

  return Appointment.find(filter)
    .sort({ scheduledAt: 1, createdAt: 1 })
    .limit(limit)
    .lean();
}

async function findAppointment(scope, appointmentId) {
  const appointment = await Appointment.findOne({
    ...buildScopeFilter(scope),
    appointmentId,
  });

  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }

  return appointment;
}

async function updateAppointmentStatus(scope, { appointmentId, status, actor }) {
  const changedAt = new Date();
  const frontdeskUpdates = {
    'frontdesk.lastStatusChangedAt': changedAt,
    'frontdesk.lastStatusChangedBy': actor || null,
  };

  if (status === 'checked-in') frontdeskUpdates['frontdesk.checkedInAt'] = changedAt;
  if (status === 'completed') frontdeskUpdates['frontdesk.completedAt'] = changedAt;
  if (status === 'cancelled') frontdeskUpdates['frontdesk.cancelledAt'] = changedAt;
  if (status === 'no-show') frontdeskUpdates['frontdesk.noShowAt'] = changedAt;

  const appointment = await Appointment.findOneAndUpdate(
    {
      ...buildScopeFilter(scope),
      appointmentId,
    },
    {
      $set: {
        status,
        updatedBy: actor,
        ...frontdeskUpdates,
      },
      $push: {
        statusHistory: {
          status,
          changedAt,
          changedBy: actor || null,
          source: 'frontdesk',
        },
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }

  return appointment;
}

export default {
  listQueueAppointments,
  findAppointment,
  updateAppointmentStatus,
};
