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

function prescriptionIdFromInvoiceNotes(notes) {
  const match = String(notes || '').match(/prescription\s+([a-zA-Z0-9-]+)/i);
  return match?.[1] || null;
}

const VISIT_MERGE_WINDOW_MS = 48 * 60 * 60 * 1000;

function eventTimestamp(value) {
  const t = new Date(value || 0).getTime();
  return Number.isNaN(t) ? null : t;
}

function findNearestAppointment(appointments, eventAt) {
  const eventTs = eventTimestamp(eventAt);
  if (eventTs == null) return null;

  let best = null;
  let bestDelta = Infinity;
  for (const apt of appointments) {
    const aptTs = eventTimestamp(apt.scheduledAt || apt.createdAt);
    if (aptTs == null) continue;
    const delta = Math.abs(eventTs - aptTs);
    if (delta <= VISIT_MERGE_WINDOW_MS && delta < bestDelta) {
      bestDelta = delta;
      best = apt;
    }
  }
  return best;
}

function uniqueInvoices(list) {
  const seen = new Set();
  return list.filter((inv) => {
    if (seen.has(inv.patientInvoiceId)) return false;
    seen.add(inv.patientInvoiceId);
    return true;
  });
}

function mapInvoiceSummary(inv) {
  return {
    patientInvoiceId: inv.patientInvoiceId,
    status: inv.status,
    total: Number(inv.total || 0),
    balanceDue: Number(inv.balanceDue || 0),
  };
}

function computePaymentStatus(invList = []) {
  if (!invList.length) return 'none';
  const due = invList.reduce((sum, inv) => sum + Number(inv.balanceDue || 0), 0);
  if (due > 0.01) return 'due';
  return 'paid';
}

function buildVisitBucket(apt, rxList, invList) {
  const sortedRx = [...rxList].sort(
    (a, b) => eventTimestamp(b.issuedAt || b.createdAt) - eventTimestamp(a.issuedAt || a.createdAt)
  );
  const primaryRx = sortedRx[0] || null;
  const invoices = uniqueInvoices(invList);

  return {
    visitId: apt.appointmentId,
    kind: 'visit',
    visitDate: toSafeIso(apt.scheduledAt) || toSafeIso(apt.createdAt),
    visitStatus: apt.status || null,
    visitReason: apt.reason || apt.visitType || null,
    doctorName: apt.doctorSnapshot?.fullName || null,
    appointmentId: apt.appointmentId,
    prescription: primaryRx,
    prescriptions: sortedRx,
    diagnosis: primaryRx?.diagnosis || apt.reason || null,
    medicines: Array.isArray(primaryRx?.medicines) ? primaryRx.medicines : [],
    followUpAt: toSafeIso(primaryRx?.followUpAt),
    notes: primaryRx?.notes || null,
    invoices: invoices.map(mapInvoiceSummary),
    paymentStatus: computePaymentStatus(invoices),
  };
}

function buildVisitHistory(appointments = [], prescriptions = [], invoices = [], _payments = []) {
  const visitMap = new Map();
  for (const apt of appointments) {
    visitMap.set(apt.appointmentId, { apt, rxList: [], invList: [] });
  }

  const unmatchedRx = [];
  for (const rx of prescriptions) {
    let apptId = rx.appointmentId && visitMap.has(rx.appointmentId) ? rx.appointmentId : null;
    if (!apptId) {
      apptId = findNearestAppointment(appointments, rx.issuedAt || rx.createdAt)?.appointmentId || null;
    }
    if (apptId && visitMap.has(apptId)) {
      visitMap.get(apptId).rxList.push(rx);
    } else {
      unmatchedRx.push(rx);
    }
  }

  for (const rx of unmatchedRx) {
    const apptId = findNearestAppointment(appointments, rx.issuedAt || rx.createdAt)?.appointmentId || null;
    if (apptId && visitMap.has(apptId)) {
      visitMap.get(apptId).rxList.push(rx);
    }
  }

  const unmatchedInv = [];
  for (const inv of invoices) {
    let bucket = null;

    if (inv.appointmentId && visitMap.has(inv.appointmentId)) {
      bucket = visitMap.get(inv.appointmentId);
    }

    if (!bucket) {
      const rxId = prescriptionIdFromInvoiceNotes(inv.notes);
      if (rxId) {
        for (const entry of visitMap.values()) {
          if (entry.rxList.some((rx) => rx.prescriptionId === rxId)) {
            bucket = entry;
            break;
          }
        }
      }
    }

    if (!bucket) {
      const near = findNearestAppointment(appointments, inv.issuedAt || inv.createdAt);
      if (near) bucket = visitMap.get(near.appointmentId);
    }

    if (bucket) {
      bucket.invList.push(inv);
    } else {
      unmatchedInv.push(inv);
    }
  }

  for (const inv of unmatchedInv) {
    const near = findNearestAppointment(appointments, inv.issuedAt || inv.createdAt);
    if (near) visitMap.get(near.appointmentId).invList.push(inv);
  }

  const rows = [];
  for (const { apt, rxList, invList } of visitMap.values()) {
    rows.push(buildVisitBucket(apt, rxList, invList));
  }

  const assignedRx = new Set(rows.flatMap((row) => row.prescriptions.map((rx) => rx.prescriptionId)));
  const assignedInv = new Set(rows.flatMap((row) => row.invoices.map((inv) => inv.patientInvoiceId)));

  for (const rx of prescriptions) {
    if (assignedRx.has(rx.prescriptionId)) continue;
    const invList = invoices.filter(
      (inv) =>
        !assignedInv.has(inv.patientInvoiceId) &&
        prescriptionIdFromInvoiceNotes(inv.notes) === rx.prescriptionId
    );
    invList.forEach((inv) => assignedInv.add(inv.patientInvoiceId));
    rows.push({
      visitId: rx.prescriptionId,
      kind: 'prescription',
      visitDate: toSafeIso(rx.issuedAt) || toSafeIso(rx.createdAt),
      visitStatus: rx.status || 'issued',
      visitReason: rx.diagnosis || 'Prescription',
      doctorName: rx.doctorSnapshot?.fullName || null,
      appointmentId: null,
      prescription: rx,
      prescriptions: [rx],
      diagnosis: rx.diagnosis || null,
      medicines: Array.isArray(rx.medicines) ? rx.medicines : [],
      followUpAt: toSafeIso(rx.followUpAt),
      notes: rx.notes || null,
      invoices: uniqueInvoices(invList).map(mapInvoiceSummary),
      paymentStatus: computePaymentStatus(invList),
    });
  }

  return rows
    .filter((row) => row.visitDate)
    .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
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
    visits: buildVisitHistory(appointments, prescriptions, invoices, payments),
  };
}

export default {
  getPatientHistory,
};
