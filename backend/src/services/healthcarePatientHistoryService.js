import historyRepository from '../repositories/healthcarePatientHistoryRepository.js';

const eventRankMap = {
  appointment: 10,
  prescription: 20,
  invoice: 30,
  payment: 40,
};

function toSafeIso(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function timelineFromAppointments(items = []) {
  return items.map((item) => ({
    eventType: 'appointment',
    eventId: item.appointmentId,
    eventAt: toSafeIso(item.scheduledAt) || toSafeIso(item.createdAt),
    rank: eventRankMap.appointment,
    title: `Appointment ${String(item.status || 'scheduled')}`,
    subtitle: item.reason || item.visitType || 'Clinic visit',
    meta: {
      appointmentId: item.appointmentId,
      status: item.status,
      doctorName: item.doctorSnapshot?.fullName || null,
      channel: item.channel || null,
    },
  }));
}

function timelineFromPrescriptions(items = []) {
  return items.map((item) => ({
    eventType: 'prescription',
    eventId: item.prescriptionId,
    eventAt: toSafeIso(item.issuedAt) || toSafeIso(item.createdAt),
    rank: eventRankMap.prescription,
    title: 'Prescription issued',
    subtitle: item.diagnosis || item.medicines?.[0]?.medicineName || 'Medication record',
    meta: {
      prescriptionId: item.prescriptionId,
      doctorName: item.doctorSnapshot?.fullName || null,
      followUpAt: toSafeIso(item.followUpAt),
      medicinesCount: Array.isArray(item.medicines) ? item.medicines.length : 0,
    },
  }));
}

function timelineFromInvoices(items = []) {
  return items.map((item) => ({
    eventType: 'invoice',
    eventId: item.patientInvoiceId,
    eventAt: toSafeIso(item.issuedAt) || toSafeIso(item.createdAt),
    rank: eventRankMap.invoice,
    title: `Invoice ${item.invoiceNumber || item.patientInvoiceId}`,
    subtitle: `Status: ${item.status || 'draft'}`,
    meta: {
      patientInvoiceId: item.patientInvoiceId,
      invoiceNumber: item.invoiceNumber || null,
      status: item.status || null,
      total: Number(item.total || 0),
      balanceDue: Number(item.balanceDue || 0),
    },
  }));
}

function timelineFromPayments(items = []) {
  return items.map((item) => ({
    eventType: 'payment',
    eventId: item.patientPaymentId,
    eventAt: toSafeIso(item.paidAt) || toSafeIso(item.createdAt),
    rank: eventRankMap.payment,
    title: 'Payment logged',
    subtitle: `Status: ${item.status || 'completed'}`,
    meta: {
      patientPaymentId: item.patientPaymentId,
      amount: Number(item.amount || 0),
      method: item.method || null,
      status: item.status || null,
      patientInvoiceId: item.patientInvoiceId || null,
    },
  }));
}

function buildFollowUps(prescriptions = []) {
  const now = Date.now();
  const followUps = prescriptions
    .filter((item) => item.followUpAt)
    .map((item) => {
      const followUpDate = new Date(item.followUpAt);
      return {
        prescriptionId: item.prescriptionId,
        followUpAt: followUpDate.toISOString(),
        doctorName: item.doctorSnapshot?.fullName || null,
        diagnosis: item.diagnosis || null,
        status: followUpDate.getTime() < now ? 'overdue' : 'upcoming',
      };
    })
    .sort((a, b) => new Date(a.followUpAt).getTime() - new Date(b.followUpAt).getTime());

  return {
    total: followUps.length,
    overdue: followUps.filter((item) => item.status === 'overdue').length,
    upcoming: followUps.filter((item) => item.status === 'upcoming').length,
    items: followUps,
  };
}

async function getPatientHistory(scope, patientId) {
  const [patient, appointments, prescriptions, invoices, payments] = await Promise.all([
    historyRepository.getPatient(scope, patientId),
    historyRepository.getAppointments(scope, patientId),
    historyRepository.getPrescriptions(scope, patientId),
    historyRepository.getInvoices(scope, patientId),
    historyRepository.getPayments(scope, patientId),
  ]);

  const timeline = [
    ...timelineFromAppointments(appointments),
    ...timelineFromPrescriptions(prescriptions),
    ...timelineFromInvoices(invoices),
    ...timelineFromPayments(payments),
  ]
    .filter((item) => item.eventAt)
    .sort((a, b) => {
      const delta = new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime();
      if (delta !== 0) return delta;
      return (b.rank || 0) - (a.rank || 0);
    });

  const summary = {
    appointments: appointments.length,
    prescriptions: prescriptions.length,
    invoices: invoices.length,
    payments: payments.length,
    totalBilled: invoices.reduce((sum, item) => sum + Number(item.total || 0), 0),
    totalCollected: payments
      .filter((item) => item.status === 'completed')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0),
  };

  return {
    patient,
    summary,
    followUps: buildFollowUps(prescriptions),
    timeline,
  };
}

export default {
  getPatientHistory,
};
