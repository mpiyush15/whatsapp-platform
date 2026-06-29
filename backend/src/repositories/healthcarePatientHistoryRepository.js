import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import Prescription from '../models/Prescription.js';
import PatientInvoice from '../models/PatientInvoice.js';
import PatientPayment from '../models/PatientPayment.js';
import { NotFoundError } from '../utils/errorHandler.js';

const buildScopeFilter = ({ accountId, projectId }) => (
  projectId ? { accountId, projectId } : { accountId }
);

async function getPatient(scope, patientId) {
  const patient = await Patient.findOne({
    ...buildScopeFilter(scope),
    patientId,
  }).lean();

  if (!patient) {
    throw new NotFoundError('Patient not found');
  }

  return patient;
}

async function getAppointments(scope, patientId, limit = 120) {
  return Appointment.find({
    ...buildScopeFilter(scope),
    patientId,
  })
    .sort({ scheduledAt: -1 })
    .limit(limit)
    .lean();
}

async function getPrescriptions(scope, patientId, limit = 120) {
  return Prescription.find({
    ...buildScopeFilter(scope),
    patientId,
  })
    .sort({ issuedAt: -1, createdAt: -1 })
    .limit(limit)
    .lean();
}

async function getInvoices(scope, patientId, limit = 120) {
  return PatientInvoice.find({
    ...buildScopeFilter(scope),
    patientId,
  })
    .sort({ issuedAt: -1, createdAt: -1 })
    .limit(limit)
    .lean();
}

async function getPayments(scope, patientId, limit = 120) {
  return PatientPayment.find({
    ...buildScopeFilter(scope),
    patientId,
  })
    .sort({ paidAt: -1, createdAt: -1 })
    .limit(limit)
    .lean();
}

export default {
  getPatient,
  getAppointments,
  getPrescriptions,
  getInvoices,
  getPayments,
};
