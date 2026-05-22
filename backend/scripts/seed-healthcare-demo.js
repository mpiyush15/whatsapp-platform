/**
 * Seed rich healthcare demo data (1–2 years) for analytics overview.
 *
 * Usage:
 *   node scripts/seed-healthcare-demo.js
 *   node scripts/seed-healthcare-demo.js proj_hc_1777808469748
 *   node scripts/seed-healthcare-demo.js proj_hc_1777808469748 --clear
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import Project from '../src/models/Project.js';
import Clinic from '../src/models/Clinic.js';
import Patient from '../src/models/Patient.js';
import Doctor from '../src/models/Doctor.js';
import Appointment from '../src/models/Appointment.js';
import Prescription from '../src/models/Prescription.js';
import PatientInvoice from '../src/models/PatientInvoice.js';
import PatientPayment from '../src/models/PatientPayment.js';
import PharmacyProduct from '../src/models/PharmacyProduct.js';
import Counter from '../src/models/Counter.js';
import { generatePrefixedId } from '../src/utils/idGenerator.js';

dotenv.config();

const DEFAULT_PROJECT_ID = 'proj_hc_1777808469748';
const MONTHS_BACK = 22;
const PATIENT_TARGET = 58;
const DOCTOR_COUNT = 5;
const BATCH = 400;

const FIRST_NAMES = [
  'Aarav', 'Priya', 'Krishna', 'Ananya', 'Rohan', 'Sneha', 'Vikram', 'Kavya', 'Arjun', 'Meera',
  'Rahul', 'Pooja', 'Amit', 'Neha', 'Suresh', 'Divya', 'Karan', 'Isha', 'Manish', 'Ritu',
  'Deepak', 'Nisha', 'Sanjay', 'Anjali', 'Harish', 'Lakshmi', 'Gaurav', 'Shreya', 'Nitin', 'Tanvi',
];
const LAST_NAMES = [
  'Sharma', 'Patel', 'Singh', 'Kumar', 'Reddy', 'Nair', 'Gupta', 'Joshi', 'Mehta', 'Rathod',
  'Desai', 'Iyer', 'Kulkarni', 'Shah', 'Verma', 'Pillai', 'Bose', 'Chatterjee', 'Mishra', 'Rao',
];
const DIAGNOSES = [
  'Viral fever', 'Upper respiratory infection', 'Hypertension review', 'Type 2 diabetes follow-up',
  'Gastritis', 'Allergic rhinitis', 'Back pain', 'Migraine', 'Skin allergy', 'Vitamin deficiency',
  'Acid reflux', 'Anxiety review', 'Thyroid follow-up', 'Joint pain', 'Common cold',
];
const MEDICINES = [
  { name: 'Paracetamol', dosage: '500mg', frequency: 'Twice daily', durationDays: 5, unitPrice: 40 },
  { name: 'Azithromycin', dosage: '500mg', frequency: 'Once daily', durationDays: 3, unitPrice: 120 },
  { name: 'Cetirizine', dosage: '10mg', frequency: 'At night', durationDays: 7, unitPrice: 35 },
  { name: 'Pantoprazole', dosage: '40mg', frequency: 'Before breakfast', durationDays: 14, unitPrice: 85 },
  { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', durationDays: 30, unitPrice: 55 },
  { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', durationDays: 30, unitPrice: 65 },
  { name: 'ORS', dosage: 'Sachet', frequency: 'As needed', durationDays: 3, unitPrice: 25 },
  { name: 'Ibuprofen', dosage: '400mg', frequency: 'Twice daily', durationDays: 5, unitPrice: 45 },
];
const PAYMENT_METHODS = ['cash', 'upi', 'card', 'upi', 'cash', 'upi'];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}
function pickN(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(rand(0, copy.length - 1), 1)[0]);
  }
  return out;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function addMinutes(date, mins) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + mins);
  return d;
}
function monthStart(year, month) {
  return new Date(year, month, 1, 10, 0, 0, 0);
}
function invNum(seq) {
  return `INV-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`;
}
async function insertBatched(Model, docs) {
  let inserted = 0;
  for (let i = 0; i < docs.length; i += BATCH) {
    const chunk = docs.slice(i, i + BATCH);
    if (chunk.length) {
      await Model.insertMany(chunk, { ordered: false });
      inserted += chunk.length;
    }
  }
  return inserted;
}

async function clearProjectData(projectId) {
  const filter = { projectId };
  const ops = [
    PatientPayment.deleteMany(filter),
    PatientInvoice.deleteMany(filter),
    Prescription.deleteMany(filter),
    Appointment.deleteMany(filter),
    Patient.deleteMany(filter),
    Doctor.deleteMany(filter),
    PharmacyProduct.deleteMany(filter),
  ];
  try {
    const FollowUp = (await import('../src/models/FollowUp.js')).default;
    ops.push(FollowUp.deleteMany(filter));
  } catch {
    /* optional */
  }
  const results = await Promise.all(ops);
  return results.map((r) => r?.deletedCount ?? 0).reduce((a, b) => a + b, 0);
}

async function main() {
  const projectId = process.argv[2] || DEFAULT_PROJECT_ID;
  const shouldClear = process.argv.includes('--clear');

  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp';
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB\n');

  const project = await Project.findOne({ projectId }).lean();
  if (!project) {
    throw new Error(`Project not found: ${projectId}. Create the healthcare project first.`);
  }
  const accountId = project.accountId;
  console.log(`Project: ${project.name} (${projectId})`);
  console.log(`Account: ${accountId}\n`);

  if (shouldClear) {
    console.log('Clearing existing healthcare data for project…');
    const removed = await clearProjectData(projectId);
    console.log(`Removed ${removed} documents (approx).\n`);
  }

  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setMonth(rangeStart.getMonth() - MONTHS_BACK);
  rangeStart.setDate(1);
  rangeStart.setHours(8, 0, 0, 0);

  await Clinic.findOneAndUpdate(
    { projectId },
    {
      accountId,
      projectId,
      name: project.name || 'Shreeji Family Clinic',
      address: '12 MG Road, Pune, Maharashtra 411001',
      phone: '+91 98765 43210',
      email: 'care@shreejiclinic.demo',
      clinicType: 'consultation',
      enabledModules: [
        'patients', 'appointments', 'frontdesk', 'doctors', 'prescriptions',
        'pharmacy', 'inventory', 'billing', 'compliance', 'whatsapp', 'flow-builder',
      ],
      billingSettings: {
        enabled: true,
        pharmacyBillingEnabled: true,
        gstEnabled: true,
        gstPercentage: '5%',
        currency: 'INR ₹',
      },
      doctorName: 'Dr Priyanka Magar',
      doctorDegree: 'MBBS, MD (Medicine)',
      updatedBy: 'seed-healthcare-demo',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('Clinic profile upserted.');

  const doctorSpecs = [
    { fullName: 'Dr Priyanka Magar', specialization: 'General Physician', fee: 500 },
    { fullName: 'Dr Amit Desai', specialization: 'Internal Medicine', fee: 600 },
    { fullName: 'Dr Sneha Nair', specialization: 'Pediatrics', fee: 550 },
    { fullName: 'Dr Rohan Patel', specialization: 'Dermatology', fee: 700 },
    { fullName: 'Dr Kavita Rao', specialization: 'Gynecology', fee: 650 },
  ];

  const doctors = doctorSpecs.slice(0, DOCTOR_COUNT).map((d, i) => ({
    accountId,
    projectId,
    doctorId: `dr_demo_${projectId.slice(-6)}_${i + 1}`,
    fullName: d.fullName,
    specialization: d.specialization,
    consultationFee: d.fee,
    phoneNumber: `+9198${rand(10000000, 99999999)}`,
    status: 'active',
    createdAt: addDays(rangeStart, rand(0, 30)),
    updatedAt: now,
  }));

  await Doctor.deleteMany({ projectId, doctorId: { $in: doctors.map((d) => d.doctorId) } });
  await Doctor.insertMany(doctors);
  console.log(`Doctors: ${doctors.length}`);

  const products = MEDICINES.map((m, i) => ({
    accountId,
    projectId,
    productId: `med_demo_${i + 1}`,
    name: m.name,
    genericName: m.name,
    unitPrice: m.unitPrice,
    mrp: Math.round(m.unitPrice * 1.2),
    currentStock: rand(50, 400),
    status: 'active',
    createdAt: addDays(rangeStart, 5),
    updatedAt: now,
  }));
  await PharmacyProduct.deleteMany({ projectId, productId: { $in: products.map((p) => p.productId) } });
  await PharmacyProduct.insertMany(products);
  console.log(`Pharmacy products: ${products.length}`);

  const patients = [];
  for (let i = 0; i < PATIENT_TARGET; i += 1) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const registeredAt = addDays(rangeStart, rand(0, MONTHS_BACK * 28));
    const age = rand(8, 72);
    const dob = new Date(now);
    dob.setFullYear(dob.getFullYear() - age);
    patients.push({
      accountId,
      projectId,
      patientId: `HC${String(1000 + i)}`,
      medicalRecordNumber: `MRN-DEMO-${String(i + 1).padStart(4, '0')}`,
      fullName: `${first} ${last}`,
      firstName: first,
      lastName: last,
      gender: pick(['male', 'female', 'other']),
      dateOfBirth: dob,
      phoneNumber: `+919${rand(100000000, 999999999)}`,
      whatsappNumber: `+919${rand(100000000, 999999999)}`,
      bloodGroup: pick(['A+', 'B+', 'O+', 'AB+', 'A-', 'O-']),
      status: 'active',
      allergies: i % 7 === 0 ? ['Penicillin'] : [],
      chronicConditions: i % 5 === 0 ? ['Hypertension'] : i % 8 === 0 ? ['Diabetes'] : [],
      lastVisitAt: addDays(now, -rand(1, 120)),
      consentSummary: {
        privacyAccepted: true,
        treatmentAccepted: true,
        whatsappOptIn: true,
        consentUpdatedAt: registeredAt,
      },
      createdAt: registeredAt,
      updatedAt: now,
    });
  }

  await Patient.deleteMany({ projectId, patientId: { $in: patients.map((p) => p.patientId) } });
  await Patient.insertMany(patients);
  await Counter.findByIdAndUpdate('patient_id', { $max: { sequence: 90000 } }, { upsert: true });
  console.log(`Patients: ${patients.length}`);

  const appointments = [];
  const prescriptions = [];
  const invoices = [];
  const payments = [];

  let invSeq = rand(1000, 2000);
  let visitSeq = 0;

  const cursor = new Date(rangeStart);
  while (cursor <= now) {
    const monthIdx =
      (cursor.getFullYear() - rangeStart.getFullYear()) * 12 + (cursor.getMonth() - rangeStart.getMonth());
    const growth = 1 + monthIdx * 0.04;
    const baseVisits = rand(55, 85);
    const visitsThisMonth = Math.round(baseVisits * Math.min(growth, 1.8));
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

    for (let v = 0; v < visitsThisMonth; v += 1) {
      const day = rand(1, daysInMonth);
      const hour = rand(9, 19);
      const minute = pick([0, 15, 30, 45]);
      const scheduledAt = new Date(cursor.getFullYear(), cursor.getMonth(), day, hour, minute, 0, 0);
      if (scheduledAt > now) continue;
      if (scheduledAt < rangeStart) continue;

      visitSeq += 1;
      const patient = pick(patients);
      const doctor = pick(doctors);
      const isRecent = scheduledAt > addDays(now, -14);
      let status = 'completed';
      if (isRecent && Math.random() < 0.12) status = pick(['scheduled', 'confirmed']);
      else if (Math.random() < 0.04) status = 'cancelled';
      else if (Math.random() < 0.03) status = 'no-show';

      const appointmentId = `apt_demo_${visitSeq}`;
      const completedAt =
        status === 'completed' ? addMinutes(scheduledAt, rand(20, 55)) : null;

      appointments.push({
        accountId,
        projectId,
        appointmentId,
        patientId: patient.patientId,
        doctorId: doctor.doctorId,
        patientSnapshot: {
          entityId: patient.patientId,
          fullName: patient.fullName,
          phoneNumber: patient.phoneNumber,
        },
        doctorSnapshot: {
          entityId: doctor.doctorId,
          fullName: doctor.fullName,
          specialization: doctor.specialization,
        },
        scheduledAt,
        endAt: completedAt ? addMinutes(scheduledAt, 30) : null,
        status,
        visitType: Math.random() < 0.2 ? 'follow-up' : 'consultation',
        reason: pick(DIAGNOSES),
        frontdesk: {
          checkedInAt: status !== 'scheduled' ? addMinutes(scheduledAt, -rand(5, 15)) : null,
          completedAt,
          lastStatusChangedAt: completedAt || scheduledAt,
        },
        billingStatus: status === 'completed' ? 'paid' : 'pending',
        createdAt: scheduledAt,
        updatedAt: completedAt || scheduledAt,
      });

      if (status !== 'completed') continue;

      const diagnosis = pick(DIAGNOSES);
      const meds = pickN(MEDICINES, rand(1, 3)).map((m) => ({
        medicineName: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        durationDays: m.durationDays,
        quantity: m.durationDays,
        instructions: 'After food',
      }));

      const issuedAt = addMinutes(scheduledAt, rand(25, 50));
      const prescriptionId = `rx_demo_${visitSeq}`;
      const followUpAt = Math.random() < 0.35 ? addDays(issuedAt, rand(7, 45)) : null;

      prescriptions.push({
        accountId,
        projectId,
        prescriptionId,
        patientId: patient.patientId,
        doctorId: doctor.doctorId,
        appointmentId,
        patientSnapshot: {
          entityId: patient.patientId,
          fullName: patient.fullName,
        },
        doctorSnapshot: {
          entityId: doctor.doctorId,
          fullName: doctor.fullName,
          specialization: doctor.specialization,
        },
        diagnosis,
        medicines: meds,
        followUpAt,
        issuedAt,
        status: 'issued',
        createdAt: issuedAt,
        updatedAt: issuedAt,
      });

      const consultFee = doctor.consultationFee;
      const medTotal = meds.reduce((s, m) => {
        const catalog = MEDICINES.find((c) => c.name === m.medicineName);
        return s + (catalog?.unitPrice || 40) * rand(1, 2);
      }, 0);
      const subtotal = consultFee + medTotal;
      const invoiceId = `pinv_demo_${visitSeq}`;
      invSeq += 1;
      const invoiceNumber = invNum(invSeq);
      const issuedInvoiceAt = addMinutes(issuedAt, rand(5, 20));

      const payRoll = Math.random();
      let invStatus = 'paid';
      let amountPaid = subtotal;
      let balanceDue = 0;
      if (payRoll < 0.08) {
        invStatus = 'issued';
        amountPaid = 0;
        balanceDue = subtotal;
      } else if (payRoll < 0.12) {
        invStatus = 'partially-paid';
        amountPaid = Math.round(subtotal * 0.5);
        balanceDue = subtotal - amountPaid;
      }

      const items = [
        { description: 'Consultation', quantity: 1, unitPrice: consultFee, total: consultFee },
        ...meds.map((m) => {
          const catalog = MEDICINES.find((c) => c.name === m.medicineName);
          const unit = catalog?.unitPrice || 40;
          const qty = rand(1, 2);
          return {
            description: m.medicineName,
            quantity: qty,
            unitPrice: unit,
            total: unit * qty,
          };
        }),
      ];

      invoices.push({
        accountId,
        projectId,
        patientInvoiceId: invoiceId,
        invoiceNumber,
        patientId: patient.patientId,
        appointmentId,
        status: invStatus,
        subtotal,
        tax: 0,
        discount: 0,
        total: subtotal,
        amountPaid,
        balanceDue,
        items,
        notes: `Auto-created from prescription ${prescriptionId}`,
        issuedAt: issuedInvoiceAt,
        dueAt: addDays(issuedInvoiceAt, 7),
        paidAt: amountPaid >= subtotal ? addMinutes(issuedInvoiceAt, rand(10, 120)) : null,
        createdAt: issuedInvoiceAt,
        updatedAt: issuedInvoiceAt,
      });

      if (amountPaid > 0) {
        payments.push({
          accountId,
          projectId,
          patientPaymentId: `ppay_demo_${visitSeq}`,
          patientId: patient.patientId,
          patientInvoiceId: invoiceId,
          appointmentId,
          amount: amountPaid,
          status: 'completed',
          method: pick(PAYMENT_METHODS),
          paidAt: addMinutes(issuedInvoiceAt, rand(5, 90)),
          receivedChannel: 'front-desk',
          referenceNumber: `REF${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          createdAt: issuedInvoiceAt,
          updatedAt: issuedInvoiceAt,
        });
      }
    }

    cursor.setMonth(cursor.getMonth() + 1);
  }

  console.log('\nInserting visit history (may take a moment)…');
  const aptN = await insertBatched(Appointment, appointments);
  const rxN = await insertBatched(Prescription, prescriptions);
  const invN = await insertBatched(PatientInvoice, invoices);
  const payN = await insertBatched(PatientPayment, payments);

  const recentPatients = pickN(patients, 12);
  for (const p of recentPatients) {
    p.lastVisitAt = addDays(now, -rand(0, 5));
  }
  await Promise.all(
    recentPatients.map((p) =>
      Patient.updateOne(
        { projectId, patientId: p.patientId },
        { $set: { lastVisitAt: p.lastVisitAt } }
      )
    )
  );

  const upcomingAppts = [];
  const upcomingCount = rand(6, 14);
  for (let u = 0; u < upcomingCount; u += 1) {
    const patient = pick(patients);
    const doctor = pick(doctors);
    const scheduledAt = addDays(now, rand(1, 12));
    scheduledAt.setHours(rand(9, 18), pick([0, 30]), 0, 0);
    upcomingAppts.push({
      accountId,
      projectId,
      appointmentId: `apt_upcoming_${u}_${Date.now()}`,
      patientId: patient.patientId,
      doctorId: doctor.doctorId,
      patientSnapshot: { entityId: patient.patientId, fullName: patient.fullName },
      doctorSnapshot: { entityId: doctor.doctorId, fullName: doctor.fullName },
      scheduledAt,
      status: pick(['scheduled', 'confirmed']),
      visitType: 'consultation',
      reason: pick(DIAGNOSES),
      createdAt: now,
      updatedAt: now,
    });
  }
  const upcomingN = await insertBatched(Appointment, upcomingAppts);

  console.log('\n—— Seed complete ——');
  console.log(`  Appointments: ${aptN + upcomingN}`);
  console.log(`  Prescriptions: ${rxN}`);
  console.log(`  Invoices:     ${invN}`);
  console.log(`  Payments:     ${payN}`);
  console.log(`  Range:        ${rangeStart.toISOString().slice(0, 10)} → ${now.toISOString().slice(0, 10)}`);
  console.log(`\nOpen overview: /projects/${projectId}/healthcare`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => mongoose.connection.close());
