import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Prescription from '../models/Prescription.js';
import PatientInvoice from '../models/PatientInvoice.js';
import PatientPayment from '../models/PatientPayment.js';

const CLINIC_TZ = 'Asia/Kolkata';

const PERIOD_CONFIG = {
  week: { type: 'days', count: 7 },
  month: { type: 'days', count: 30 },
  year: { type: 'months', count: 12 },
};

function normalizePeriod(period) {
  const key = String(period || 'week').toLowerCase();
  return PERIOD_CONFIG[key] ? key : 'week';
}

/** YYYY-MM-DD in clinic timezone */
function dateKeyIST(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** YYYY-MM in clinic timezone */
function monthKeyIST(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TZ,
    year: 'numeric',
    month: '2-digit',
  }).format(date);
}

function startOfDayIST(date = new Date()) {
  const key = dateKeyIST(date);
  return new Date(`${key}T00:00:00+05:30`);
}

function endOfDayIST(date = new Date()) {
  const key = dateKeyIST(date);
  return new Date(`${key}T23:59:59.999+05:30`);
}

function addDaysIST(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfMonthIST(date = new Date()) {
  const key = monthKeyIST(date);
  return new Date(`${key}-01T00:00:00+05:30`);
}

function addMonthsIST(date, months) {
  const anchor = startOfMonthIST(date);
  anchor.setMonth(anchor.getMonth() + months);
  return startOfMonthIST(anchor);
}

function periodWindows(periodKey) {
  const end = endOfDayIST(new Date());
  const cfg = PERIOD_CONFIG[periodKey];

  if (cfg.type === 'months') {
    const start = addMonthsIST(end, -(cfg.count - 1));
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = addMonthsIST(start, -cfg.count);

    return {
      start,
      end,
      prevStart,
      prevEnd,
      granularity: 'month',
      pointCount: cfg.count,
    };
  }

  const start = startOfDayIST(addDaysIST(end, -(cfg.count - 1)));
  const prevEnd = new Date(start);
  prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
  const prevStart = startOfDayIST(addDaysIST(prevEnd, -(cfg.count - 1)));

  return {
    start,
    end,
    prevStart,
    prevEnd,
    granularity: 'day',
    pointCount: cfg.count,
  };
}

function pctChange(current, previous) {
  const cur = Number(current || 0);
  const prev = Number(previous || 0);
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

function metric(current, previous) {
  return {
    value: Number(current || 0),
    previous: Number(previous || 0),
    changePct: pctChange(current, previous),
  };
}

function dateGroupStage(field) {
  return {
    $dateToString: { format: '%Y-%m-%d', date: `$${field}`, timezone: CLINIC_TZ },
  };
}

function monthGroupStage(field) {
  return {
    $dateToString: { format: '%Y-%m', date: `$${field}`, timezone: CLINIC_TZ },
  };
}

function buildDailySeries(pointCount, buckets, endDate) {
  const end = startOfDayIST(endDate);
  const series = [];
  for (let i = pointCount - 1; i >= 0; i -= 1) {
    const d = addDaysIST(end, -i);
    const key = dateKeyIST(d);
    series.push({ date: key, label: key.slice(5), value: Number(buckets.get(key) || 0) });
  }
  return series;
}

function buildMonthlySeries(pointCount, buckets, endDate) {
  const end = new Date(endDate);
  const series = [];
  for (let i = pointCount - 1; i >= 0; i -= 1) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const key = monthKeyIST(d);
    const label = new Intl.DateTimeFormat('en-IN', {
      timeZone: CLINIC_TZ,
      month: 'short',
      year: '2-digit',
    }).format(d);
    series.push({ date: key, label, value: Number(buckets.get(key) || 0) });
  }
  return series;
}

function paymentDateMatch(range) {
  return {
    status: 'completed',
    $or: [
      { paidAt: { $gte: range.start, $lte: range.end } },
      { paidAt: null, createdAt: { $gte: range.start, $lte: range.end } },
    ],
  };
}

async function sumPayments(filter, range) {
  const [row] = await PatientPayment.aggregate([
    { $match: { ...filter, ...paymentDateMatch(range) } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return Number(row?.total || 0);
}

async function sumInvoiced(filter, range) {
  const [row] = await PatientInvoice.aggregate([
    {
      $match: {
        ...filter,
        $or: [
          { issuedAt: { $gte: range.start, $lte: range.end } },
          { issuedAt: null, createdAt: { $gte: range.start, $lte: range.end } },
        ],
      },
    },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);
  return Number(row?.total || 0);
}

async function countInRange(Model, filter, dateField, range, extra = {}) {
  return Model.countDocuments({
    ...filter,
    ...extra,
    [dateField]: { $gte: range.start, $lte: range.end },
  });
}

async function paymentSeries(filter, range, granularity, pointCount) {
  const rows = await PatientPayment.aggregate([
    { $match: { ...filter, ...paymentDateMatch(range) } },
    {
      $addFields: {
        bucketDate: { $ifNull: ['$paidAt', '$createdAt'] },
      },
    },
    {
      $group: {
        _id:
          granularity === 'month'
            ? monthGroupStage('bucketDate')
            : dateGroupStage('bucketDate'),
        value: { $sum: '$amount' },
      },
    },
  ]);

  const buckets = new Map(rows.map((r) => [r._id, r.value]));
  return granularity === 'month'
    ? buildMonthlySeries(pointCount, buckets, range.end)
    : buildDailySeries(pointCount, buckets, range.end);
}

async function countSeries(Model, filter, dateField, range, granularity, pointCount, extra = {}) {
  const rows = await Model.aggregate([
    {
      $match: {
        ...filter,
        ...extra,
        [dateField]: { $gte: range.start, $lte: range.end },
      },
    },
    {
      $group: {
        _id:
          granularity === 'month'
            ? monthGroupStage(dateField)
            : dateGroupStage(dateField),
        value: { $sum: 1 },
      },
    },
  ]);

  const buckets = new Map(rows.map((r) => [r._id, r.value]));
  return granularity === 'month'
    ? buildMonthlySeries(pointCount, buckets, range.end)
    : buildDailySeries(pointCount, buckets, range.end);
}

async function doctorLeaderboard(filter, range) {
  const visitRows = await Appointment.aggregate([
    {
      $match: {
        ...filter,
        scheduledAt: { $gte: range.start, $lte: range.end },
        status: { $in: ['completed', 'checked-in', 'confirmed', 'scheduled'] },
      },
    },
    {
      $group: {
        _id: '$doctorId',
        visits: { $sum: 1 },
        name: { $first: '$doctorSnapshot.fullName' },
      },
    },
    { $sort: { visits: -1 } },
    { $limit: 10 },
  ]);

  const rxRows = await Prescription.aggregate([
    {
      $match: {
        ...filter,
        issuedAt: { $gte: range.start, $lte: range.end },
      },
    },
    {
      $group: {
        _id: '$doctorId',
        prescriptions: { $sum: 1 },
        name: { $first: '$doctorSnapshot.fullName' },
      },
    },
  ]);

  const rxByDoctor = new Map(rxRows.map((r) => [r._id, r]));
  return visitRows.map((row) => ({
    doctorId: row._id || 'unknown',
    name: row.name || 'Unassigned',
    visits: row.visits,
    prescriptions: rxByDoctor.get(row._id)?.prescriptions || 0,
  }));
}

function formatRangeLabel(start, end, period) {
  const fmt = (d) =>
    new Intl.DateTimeFormat('en-IN', {
      timeZone: CLINIC_TZ,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  if (period === 'year') {
    return `${fmt(start)} – ${fmt(end)} (12 months)`;
  }
  return `${fmt(start)} – ${fmt(end)}`;
}

async function getHealthcareAnalytics(scope, periodInput) {
  const period = normalizePeriod(periodInput);
  const { start, end, prevStart, prevEnd } = periodWindows(period);
  const filter = scope.projectId
    ? { accountId: scope.accountId, projectId: scope.projectId }
    : { accountId: scope.accountId };

  const current = { start, end };
  const previous = { start: prevStart, end: prevEnd };
  const now = new Date();

  const [
    revenueCollected,
    revenueCollectedPrev,
    revenueBilled,
    revenueBilledPrev,
    outstandingDue,
    visits,
    visitsPrev,
    prescriptions,
    prescriptionsPrev,
    newPatients,
    newPatientsPrev,
    patientCount,
    doctorCount,
    upcomingAppointments,
    doctors,
  ] = await Promise.all([
    sumPayments(filter, current),
    sumPayments(filter, previous),
    sumInvoiced(filter, current),
    sumInvoiced(filter, previous),
    PatientInvoice.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$balanceDue' } } },
    ]).then(([r]) => Number(r?.total || 0)),
    countInRange(Appointment, filter, 'scheduledAt', current),
    countInRange(Appointment, filter, 'scheduledAt', previous),
    countInRange(Prescription, filter, 'issuedAt', current),
    countInRange(Prescription, filter, 'issuedAt', previous),
    countInRange(Patient, filter, 'createdAt', current),
    countInRange(Patient, filter, 'createdAt', previous),
    Patient.countDocuments(filter),
    Doctor.countDocuments({ ...filter, status: 'active' }),
    Appointment.countDocuments({
      ...filter,
      status: { $in: ['scheduled', 'confirmed'] },
      scheduledAt: { $gte: now },
    }),
    doctorLeaderboard(filter, current),
  ]);

  const completedVisits = await countInRange(Appointment, filter, 'scheduledAt', current, {
    status: 'completed',
  });

  return {
    period,
    range: {
      start: start.toISOString(),
      end: end.toISOString(),
      label: formatRangeLabel(start, end, period),
    },
    kpis: {
      revenueCollected: metric(revenueCollected, revenueCollectedPrev),
      revenueBilled: metric(revenueBilled, revenueBilledPrev),
      outstandingDue: { value: outstandingDue },
      visits: metric(visits, visitsPrev),
      completedVisits: { value: completedVisits },
      prescriptions: metric(prescriptions, prescriptionsPrev),
      newPatients: metric(newPatients, newPatientsPrev),
      patients: { value: patientCount },
      doctors: { value: doctorCount },
      upcomingAppointments: { value: upcomingAppointments },
    },
    doctors,
  };
}

export default {
  getHealthcareAnalytics,
};
