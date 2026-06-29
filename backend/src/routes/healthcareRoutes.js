import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Project from '../models/Project.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Prescription from '../models/Prescription.js';
import FollowUp from '../models/FollowUp.js';
import PharmacyProduct from '../models/PharmacyProduct.js';
import StockEntry from '../models/StockEntry.js';
import HealthcareAuditEvent from '../models/HealthcareAuditEvent.js';
import PatientInvoice from '../models/PatientInvoice.js';
import PatientPayment from '../models/PatientPayment.js';
import ConsentRecord from '../models/ConsentRecord.js';
import whatsappService from '../services/whatsappService.js';
import { fireHealthcareWhatsAppTrigger } from '../services/healthcareWhatsAppService.js';
import { sendSuccess, sendNotFound, sendValidationError } from '../utils/responseHandler.js';
import { handleControllerError, NotFoundError, ValidationError } from '../utils/errorHandler.js';
import handleMulterError from '../middlewares/multerErrorHandler.js';
import frontdeskRoutes from './healthcare/frontdeskRoutes.js';
import staffRoutes from './healthcare/staffRoutes.js';
import patientHistoryRoutes from './healthcare/patientHistoryRoutes.js';
import * as clinicController from '../controllers/healthcareClinicController.js';
import { createInvoiceForPrescription } from '../services/healthcarePrescriptionInvoiceService.js';
import healthcareAnalyticsService from '../services/healthcareAnalyticsService.js';
import { checkPlanLimit } from '../middlewares/checkPlanLimit.js';
import { installHealthcareAppointmentBot } from '../services/healthcareAppointmentBotService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clinicLogoStorage = multer.memoryStorage();

const clinicLogoUpload = multer({
  storage: clinicLogoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  }
});

const prescriptionPdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for PDFs
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  }
});

const router = express.Router();

router.use('/frontdesk', frontdeskRoutes);
router.use('/staff', staffRoutes);
router.use('/clinical', patientHistoryRoutes);

// Clinic routes
router.get('/clinic/:projectId', clinicController.getClinic);
router.get('/clinic/:projectId/prescription-blank-pdf', clinicController.getPrescriptionBlankPdf);
router.post('/clinic/:projectId', clinicController.upsertClinic);
router.patch('/clinic/:projectId/logo', clinicLogoUpload.single('logoFile'), handleMulterError, clinicController.updateClinicLogo);
router.patch('/clinic/:projectId/prescription-design', prescriptionPdfUpload.single('pdfFile'), handleMulterError, clinicController.updatePrescriptionDesign);
router.post('/clinic/:projectId/categories', clinicController.addTaskCategory);
router.delete('/clinic/:projectId/categories/:category', clinicController.removeTaskCategory);

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const HEALTHCARE_TEMPLATE_PRESETS = [
  {
    key: 'patient-welcome',
    name: 'Patient welcome',
    category: 'utility',
    channel: 'whatsapp',
    recommendedTemplateName: 'healthcare_patient_welcome',
    purpose: 'patient-onboarding',
    triggerEvents: ['patient_created'],
    variables: ['patientName', 'clinicName'],
    sampleMessage: 'Hi {{1}}, welcome to {{2}}. Save this number for appointment updates and care messages.',
  },
  {
    key: 'appointment-reminder',
    name: 'Healthcare Appointment Reminder',
    category: 'utility',
    channel: 'whatsapp',
    recommendedTemplateName: 'healthcare_appointment_reminder',
    purpose: 'appointment-reminder',
    triggerEvents: ['appointment_booked', 'appointment_rescheduled', 'appointment_reminder'],
    variables: ['patientName', 'appointmentDateTime', 'clinicName'],
    sampleMessage: 'Hi {{1}}, reminder: your appointment is on {{2}}. - {{3}}',
  },
  {
    key: 'appointment-cancelled',
    name: 'Appointment cancelled',
    category: 'utility',
    channel: 'whatsapp',
    recommendedTemplateName: 'healthcare_appointment_cancelled',
    purpose: 'appointment-cancelled',
    triggerEvents: ['appointment_cancelled'],
    variables: ['patientName', 'appointmentDateTime', 'clinicName'],
    sampleMessage: 'Hi {{1}}, your appointment on {{2}} has been cancelled. Contact {{3}} to rebook.',
  },
  {
    key: 'refill-reminder',
    name: 'Prescription Refill Reminder',
    category: 'utility',
    channel: 'whatsapp',
    recommendedTemplateName: 'healthcare_refill_reminder',
    purpose: 'refill-reminder',
    triggerEvents: ['prescription_saved'],
    variables: ['patientName', 'medicineName', 'clinicName'],
    sampleMessage: 'Hi {{1}}, your medicine {{2}} needs a refill soon. Contact {{3}} for support.',
  },
  {
    key: 'follow-up-checkin',
    name: 'Follow-up Care Check-in',
    category: 'utility',
    channel: 'whatsapp',
    recommendedTemplateName: 'healthcare_followup_checkin',
    purpose: 'follow-up',
    triggerEvents: ['follow_up'],
    variables: ['patientName', 'followUpDate', 'clinicName'],
    sampleMessage: 'Hi {{1}}, this is your follow-up reminder for {{2}}. Reply if you need to reschedule. - {{3}}',
  },
  {
    key: 'invoice-created',
    name: 'Invoice created',
    category: 'utility',
    channel: 'whatsapp',
    recommendedTemplateName: 'healthcare_invoice_created',
    purpose: 'billing-invoice',
    triggerEvents: ['invoice_created'],
    variables: ['patientName', 'totalAmount', 'clinicName'],
    sampleMessage: 'Hi {{1}}, your clinic invoice total is INR {{2}}. - {{3}}',
  },
  {
    key: 'payment-received',
    name: 'Payment received',
    category: 'utility',
    channel: 'whatsapp',
    recommendedTemplateName: 'healthcare_payment_received',
    purpose: 'payment-received',
    triggerEvents: ['payment_received'],
    variables: ['patientName', 'amount', 'clinicName'],
    sampleMessage: 'Hi {{1}}, we received your payment of INR {{2}}. Thank you. - {{3}}',
  },
  {
    key: 'payment-pending',
    name: 'Payment pending reminder',
    category: 'utility',
    channel: 'whatsapp',
    recommendedTemplateName: 'healthcare_payment_pending_reminder',
    purpose: 'payment-pending',
    triggerEvents: ['payment_pending_reminder'],
    variables: ['patientName', 'amount', 'clinicName'],
    sampleMessage: 'Hi {{1}}, a payment of INR {{2}} is pending. - {{3}}',
  },
];

const HEALTHCARE_FLOW_PRESETS = [
  {
    key: 'appointment-reminder-flow',
    name: 'Appointment reminder flow',
    description: 'Trigger reminder + confirmation + escalation when no response.',
    modules: ['appointments', 'whatsapp', 'consent'],
    steps: [
      'Fetch upcoming appointments in 24h window',
      'Validate patient consent for WhatsApp reminders',
      'Send reminder template',
      'Branch on patient confirmation / reschedule response',
      'Escalate unresolved appointments to front desk queue',
    ],
  },
  {
    key: 'refill-followup-flow',
    name: 'Refill + follow-up flow',
    description: 'Send refill reminder, capture intent, and route pharmacy follow-up.',
    modules: ['prescriptions', 'pharmacy', 'whatsapp', 'consent'],
    steps: [
      'Identify near-expiry prescriptions/refill due list',
      'Validate WhatsApp consent',
      'Send refill reminder template',
      'Capture reply intent (yes/no/help)',
      'Create pharmacy action task and update patient timeline',
    ],
  },
];

const formatDateForTrigger = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN');
};

const formatTimeForTrigger = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const toNullableDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError('Invalid date value provided');
  }
  return parsed;
};
const toNullableTrimmedString = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
};
const normalizeAddressPayload = (address) => {
  if (address === null || address === undefined || address === '') return {};

  if (typeof address === 'string') {
    return {
      line1: toNullableTrimmedString(address),
    };
  }

  if (typeof address !== 'object' || Array.isArray(address)) {
    throw new ValidationError('address must be a string or address object');
  }

  return {
    line1: toNullableTrimmedString(address.line1),
    line2: toNullableTrimmedString(address.line2),
    city: toNullableTrimmedString(address.city),
    state: toNullableTrimmedString(address.state),
    postalCode: toNullableTrimmedString(address.postalCode),
    country: toNullableTrimmedString(address.country) || 'India',
  };
};
const getAccountId = (req) => req.user?.accountId || req.account?.accountId || null;
const getProjectId = (req) => req.query?.projectId || req.body?.projectId || req.projectId || null;
const getActor = (req) => req.user?.email || req.user?.name || req.user?.accountId || 'system';
const buildScopeFilter = ({ accountId, projectId }) => (
  projectId ? { accountId, projectId } : { accountId }
);
const maskPhone = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length <= 4) return `••${digits}`;
  return `${'•'.repeat(Math.max(digits.length - 4, 2))}${digits.slice(-4)}`;
};
const maskEmail = (value = '') => {
  const input = String(value || '').trim();
  if (!input.includes('@')) return input || null;
  const [name, domain] = input.split('@');
  if (!name) return `••@${domain}`;
  return `${name[0]}•••@${domain}`;
};
const redactText = (value = '') => {
  if (!value) return value;
  return '[REDACTED]';
};
const shouldExposeSensitive = (req) => {
  const includeSensitive = String(req.query?.includeSensitive || '').toLowerCase() === 'true';
  const role = String(req.user?.role || '').toLowerCase();
  const privileged = ['owner', 'admin', 'superadmin'].includes(role);
  return includeSensitive && privileged;
};
const redactPatientRecord = (patient = {}) => ({
  ...patient,
  phoneNumber: maskPhone(patient.phoneNumber),
  whatsappNumber: maskPhone(patient.whatsappNumber),
  email: maskEmail(patient.email),
  emergencyContact: patient.emergencyContact ? {
    ...patient.emergencyContact,
    phoneNumber: maskPhone(patient.emergencyContact.phoneNumber),
  } : patient.emergencyContact,
  address: patient.address ? {
    ...patient.address,
    line1: redactText(patient.address.line1),
    line2: redactText(patient.address.line2),
    postalCode: patient.address?.postalCode ? `••${String(patient.address.postalCode).slice(-2)}` : null,
  } : patient.address,
});
const redactAppointmentRecord = (appointment = {}) => ({
  ...appointment,
  patientSnapshot: appointment.patientSnapshot ? {
    ...appointment.patientSnapshot,
    phoneNumber: maskPhone(appointment.patientSnapshot.phoneNumber),
  } : appointment.patientSnapshot,
});

const redactMetadataForAudit = (metadata = {}) => {
  const clone = JSON.parse(JSON.stringify(metadata || {}));
  const sensitiveKeys = new Set([
    'phoneNumber',
    'whatsappNumber',
    'email',
    'line1',
    'line2',
    'postalCode',
    'notes',
    'address',
    'emergencyContact',
    'templateParams',
  ]);

  const walk = (node) => {
    if (!node || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map(walk);

    Object.keys(node).forEach((key) => {
      if (sensitiveKeys.has(key)) {
        node[key] = '[REDACTED]';
      } else {
        node[key] = walk(node[key]);
      }
    });
    return node;
  };

  return walk(clone);
};

const inferEntityTypeFromPath = (path = '') => {
  if (path.includes('/patients')) return 'patient';
  if (path.includes('/doctors')) return 'doctor';
  if (path.includes('/nurses')) return 'nurse';
  if (path.includes('/appointments')) return 'appointment';
  if (path.includes('/prescriptions')) return 'prescription';
  if (path.includes('/pharmacy-products')) return 'pharmacy-product';
  if (path.includes('/stock-entries')) return 'stock-entry';
  if (path.includes('/invoices')) return 'patient-invoice';
  if (path.includes('/payments')) return 'patient-payment';
  if (path.includes('/consents')) return 'consent';
  if (path.includes('/whatsapp')) return 'healthcare-whatsapp';
  if (path.includes('/retention')) return 'retention';
  return 'healthcare';
};

const parsePagination = (req) => {
  const page = Math.max(parseInt(req.query?.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

router.use((req, res, next) => {
  const method = String(req.method || '').toUpperCase();
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return next();
  }

  const startedAt = Date.now();
  res.on('finish', async () => {
    try {
      if (res.statusCode >= 400) return;
      const accountId = getAccountId(req);
      if (!accountId) return;

      await HealthcareAuditEvent.create({
        accountId,
        projectId: getProjectId(req),
        actor: {
          id: req.user?.userId || req.user?._id || null,
          email: req.user?.email || null,
          name: req.user?.name || null,
        },
        action: `${method} ${req.path}`,
        entityType: inferEntityTypeFromPath(req.path),
        entityId: req.params?.patientId
          || req.params?.doctorId
          || req.params?.appointmentId
          || req.params?.prescriptionId
          || req.params?.productId
          || req.params?.stockEntryId
          || req.params?.patientInvoiceId
          || req.params?.patientPaymentId
          || req.params?.consentId
          || null,
        metadata: redactMetadataForAudit({
          query: req.query,
          body: req.body,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
        }),
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
        eventAt: new Date(),
      });
    } catch (auditError) {
      // Non-blocking audit write
      // eslint-disable-next-line no-console
      console.warn('healthcare audit write warning:', auditError?.message || auditError);
    }
  });

  return next();
});

async function resolveScope(req, options = {}) {
  const { requireProject = false } = options;
  const accountId = getAccountId(req);
  const projectId = getProjectId(req);

  if (!accountId) {
    throw new ValidationError('Account context is missing');
  }

  if (requireProject && !projectId) {
    throw new ValidationError('projectId is required');
  }

  if (!projectId) {
    return { accountId, projectId: null, project: null };
  }

  const project = await Project.findOne({
    accountId,
    projectId,
    status: 'active',
  }).select('projectId name status');

  if (!project) {
    throw new NotFoundError('Project not found or inactive');
  }

  return { accountId, projectId, project };
}

async function findPatient(scope, patientId) {
  const patient = await Patient.findOne({
    ...buildScopeFilter(scope),
    patientId,
  });

  if (!patient) {
    throw new NotFoundError('Patient not found');
  }

  return patient;
}

async function findDoctor(scope, doctorId) {
  const doctor = await Doctor.findOne({
    ...buildScopeFilter(scope),
    doctorId,
  });

  if (!doctor) {
    throw new NotFoundError('Doctor not found');
  }

  return doctor;
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

async function findInvoice(scope, patientInvoiceId) {
  const invoice = await PatientInvoice.findOne({
    ...buildScopeFilter(scope),
    patientInvoiceId,
  });

  if (!invoice) {
    throw new NotFoundError('Patient invoice not found');
  }

  return invoice;
}

async function findPayment(scope, patientPaymentId) {
  const payment = await PatientPayment.findOne({
    ...buildScopeFilter(scope),
    patientPaymentId,
  });

  if (!payment) {
    throw new NotFoundError('Patient payment not found');
  }

  return payment;
}

async function findPrescription(scope, prescriptionId) {
  const prescription = await Prescription.findOne({
    ...buildScopeFilter(scope),
    prescriptionId,
  });

  if (!prescription) {
    throw new NotFoundError('Prescription not found');
  }

  return prescription;
}

async function findPharmacyProduct(scope, productId) {
  const product = await PharmacyProduct.findOne({
    ...buildScopeFilter(scope),
    productId,
  });

  if (!product) {
    throw new NotFoundError('Pharmacy product not found');
  }

  return product;
}

async function findStockEntry(scope, stockEntryId) {
  const stockEntry = await StockEntry.findOne({
    ...buildScopeFilter(scope),
    stockEntryId,
  });

  if (!stockEntry) {
    throw new NotFoundError('Stock entry not found');
  }

  return stockEntry;
}

const buildSearchFilter = (query, fields = []) => {
  if (!query) return {};

  const regex = { $regex: escapeRegex(String(query).trim()), $options: 'i' };
  return {
    $or: fields.map((field) => ({ [field]: regex })),
  };
};

function normalizePatientPayload(payload = {}) {
  const data = { ...payload };
  delete data.accountId;
  delete data.patientId;
  delete data.createdAt;
  delete data.updatedAt;

  if (Object.prototype.hasOwnProperty.call(data, 'countryCode')) {
    delete data.countryCode;
  }

  if (Object.prototype.hasOwnProperty.call(data, 'age')) {
    delete data.age;
  }

  if (!data.fullName && (data.firstName || data.lastName)) {
    data.fullName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
  }

  if (!data.fullName) {
    throw new ValidationError('fullName is required');
  }

  if (data.dateOfBirth !== undefined) {
    data.dateOfBirth = toNullableDate(data.dateOfBirth);
  }

  if (data.address !== undefined) {
    data.address = normalizeAddressPayload(data.address);
  }

  return data;
}

function normalizeDoctorPayload(payload = {}) {
  const data = { ...payload };
  delete data.accountId;
  delete data.doctorId;
  delete data.createdAt;
  delete data.updatedAt;

  if (!data.fullName) {
    throw new ValidationError('fullName is required');
  }

  if (data.availability !== undefined) {
    if (!Array.isArray(data.availability)) {
      throw new ValidationError('availability must be a list of schedule slots');
    }

    data.availability = data.availability
      .map((slot) => ({
        dayOfWeek: String(slot?.dayOfWeek || '').trim().toLowerCase(),
        startTime: String(slot?.startTime || '').trim(),
        endTime: String(slot?.endTime || '').trim(),
        location: toNullableTrimmedString(slot?.location),
      }))
      .filter((slot) => slot.dayOfWeek && slot.startTime && slot.endTime);
  }

  return data;
}

const dayNameForDate = (date) => (
  ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()]
);

const timeToMinutes = (value = '') => {
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

async function ensureDoctorCanTakeAppointment(scope, doctor, scheduledAt, durationMinutes, excludeAppointmentId = null, { allowQueue = false } = {}) {
  if (!doctor) return { queueStatus: 'none' };

  if (doctor.status !== 'active') {
    throw new ValidationError('Selected doctor is not active');
  }

  const appointmentStart = new Date(scheduledAt);
  const appointmentEnd = new Date(appointmentStart.getTime() + durationMinutes * 60 * 1000);
  const dayOfWeek = dayNameForDate(appointmentStart);
  const appointmentStartMinutes = appointmentStart.getHours() * 60 + appointmentStart.getMinutes();
  const appointmentEndMinutes = appointmentEnd.getHours() * 60 + appointmentEnd.getMinutes();

  const matchingSlot = (doctor.availability || []).find((slot) => {
    if (slot.dayOfWeek !== dayOfWeek) return false;
    const slotStart = timeToMinutes(slot.startTime);
    const slotEnd = timeToMinutes(slot.endTime);
    if (slotStart === null || slotEnd === null) return false;
    return appointmentStartMinutes >= slotStart && appointmentEndMinutes <= slotEnd;
  });

  if (!matchingSlot) {
    // throw new ValidationError('Selected doctor is not scheduled for this date and time');
  }

  const conflict = await Appointment.findOne({
    ...buildScopeFilter(scope),
    doctorId: doctor.doctorId,
    ...(excludeAppointmentId ? { appointmentId: { $ne: excludeAppointmentId } } : {}),
    status: { $nin: ['cancelled', 'no-show'] },
    scheduledAt: { $lt: appointmentEnd },
    endAt: { $gt: appointmentStart },
  }).select('appointmentId scheduledAt endAt');

  if (conflict) {
    if (allowQueue) {
      return { queueStatus: 'queued' };
    }
    throw new ValidationError('Selected doctor already has an appointment in this slot');
  }

  return { queueStatus: 'none' };
}

async function normalizeAppointmentPayload(scope, payload = {}, existingAppointment = null) {
  const data = { ...payload };
  delete data.accountId;
  delete data.appointmentId;
  delete data.createdAt;
  delete data.updatedAt;

  const patientId = data.patientId || existingAppointment?.patientId;
  if (!patientId) {
    throw new ValidationError('patientId is required');
  }

  const patient = await findPatient(scope, patientId);
  const hasDoctorField = Object.prototype.hasOwnProperty.call(data, 'doctorId');
  const requestedDoctorId = hasDoctorField ? data.doctorId : existingAppointment?.doctorId;
  const doctor = requestedDoctorId ? await findDoctor(scope, requestedDoctorId) : null;

  const scheduledAt = toNullableDate(data.scheduledAt ?? existingAppointment?.scheduledAt);
  if (!scheduledAt) {
    throw new ValidationError('scheduledAt is required');
  }

  const durationMinutes = toNumber(data.durationMinutes ?? existingAppointment?.durationMinutes, 30);
  const endAt = data.endAt !== undefined
    ? toNullableDate(data.endAt)
    : new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);

  const allowQueue = data.allowQueue !== false;
  delete data.allowQueue;

  const bookingSource = data.bookingSource || existingAppointment?.bookingSource || 'manual';
  delete data.bookingSource;

  const { queueStatus } = await ensureDoctorCanTakeAppointment(
    scope,
    doctor,
    scheduledAt,
    durationMinutes,
    existingAppointment?.appointmentId || null,
    { allowQueue }
  );

  return {
    ...data,
    patientId: patient.patientId,
    doctorId: doctor?.doctorId || null,
    scheduledAt,
    endAt,
    durationMinutes,
    bookingSource,
    queueStatus,
    tags: patient.tags || [],
    patientSnapshot: {
      entityId: patient.patientId,
      fullName: patient.fullName,
      phoneNumber: patient.phoneNumber || patient.whatsappNumber || null,
    },
    doctorSnapshot: doctor ? {
      entityId: doctor.doctorId,
      fullName: doctor.fullName,
      phoneNumber: doctor.phoneNumber || null,
      specialization: doctor.specialization || null,
    } : null,
  };
}

async function normalizeInvoicePayload(scope, payload = {}, existingInvoice = null) {
  const data = { ...payload };
  delete data.accountId;
  delete data.patientInvoiceId;
  delete data.createdAt;
  delete data.updatedAt;

  const patientId = data.patientId || existingInvoice?.patientId;
  if (!patientId) {
    throw new ValidationError('patientId is required');
  }

  await findPatient(scope, patientId);

  const hasAppointmentField = Object.prototype.hasOwnProperty.call(data, 'appointmentId');
  const appointmentId = hasAppointmentField ? data.appointmentId : existingInvoice?.appointmentId;
  if (appointmentId) {
    await findAppointment(scope, appointmentId);
  }

  const items = Array.isArray(data.items)
    ? data.items.map((item) => {
      const quantity = toNumber(item.quantity, 1);
      const unitPrice = toNumber(item.unitPrice, 0);
      const total = item.total !== undefined ? toNumber(item.total, 0) : quantity * unitPrice;

      return {
        description: item.description,
        quantity,
        unitPrice,
        total,
      };
    })
    : (existingInvoice?.items || []);

  const subtotal = data.subtotal !== undefined
    ? toNumber(data.subtotal, 0)
    : items.reduce((sum, item) => sum + toNumber(item.total, 0), 0);
  const discount = toNumber(data.discount ?? existingInvoice?.discount, 0);
  const tax = toNumber(data.tax ?? existingInvoice?.tax, 0);
  const total = data.total !== undefined
    ? toNumber(data.total, 0)
    : Math.max(subtotal - discount + tax, 0);
  const amountPaid = toNumber(data.amountPaid ?? existingInvoice?.amountPaid, 0);
  const balanceDue = Math.max(total - amountPaid, 0);
  const status = data.status || (balanceDue <= 0 && total > 0
    ? 'paid'
    : amountPaid > 0
      ? 'partially-paid'
      : (existingInvoice?.status || 'draft'));

  return {
    ...data,
    patientId,
    appointmentId: appointmentId || null,
    items,
    subtotal,
    discount,
    tax,
    total,
    amountPaid,
    balanceDue,
    status,
    issuedAt: toNullableDate(data.issuedAt ?? existingInvoice?.issuedAt) || new Date(),
    dueAt: toNullableDate(data.dueAt ?? existingInvoice?.dueAt),
    paidAt: status === 'paid'
      ? (toNullableDate(data.paidAt ?? existingInvoice?.paidAt) || new Date())
      : toNullableDate(data.paidAt ?? existingInvoice?.paidAt),
  };
}

async function normalizeConsentPayload(scope, payload = {}, existingConsent = null) {
  const data = { ...payload };
  delete data.accountId;
  delete data.consentId;
  delete data.createdAt;
  delete data.updatedAt;

  const patientId = data.patientId || existingConsent?.patientId;
  if (!patientId) {
    throw new ValidationError('patientId is required');
  }
  if (!data.consentType && !existingConsent?.consentType) {
    throw new ValidationError('consentType is required');
  }
  if (!data.status && !existingConsent?.status) {
    throw new ValidationError('status is required');
  }

  await findPatient(scope, patientId);

  return {
    ...data,
    patientId,
    collectedAt: toNullableDate(data.collectedAt ?? existingConsent?.collectedAt) || new Date(),
    expiresAt: toNullableDate(data.expiresAt ?? existingConsent?.expiresAt),
  };
}

async function normalizePrescriptionPayload(scope, payload = {}, existingPrescription = null) {
  const data = { ...payload };
  delete data.accountId;
  delete data.prescriptionId;
  delete data.createdAt;
  delete data.updatedAt;

  const patientId = data.patientId || existingPrescription?.patientId;
  const doctorId = data.doctorId || existingPrescription?.doctorId;

  if (!patientId) {
    throw new ValidationError('patientId is required');
  }
  if (!doctorId) {
    throw new ValidationError('doctorId is required');
  }

  const patient = await findPatient(scope, patientId);
  const doctor = await findDoctor(scope, doctorId);

  const hasAppointmentField = Object.prototype.hasOwnProperty.call(data, 'appointmentId');
  const appointmentId = hasAppointmentField ? data.appointmentId : existingPrescription?.appointmentId;
  if (appointmentId) {
    await findAppointment(scope, appointmentId);
  }

  const medicines = Array.isArray(data.medicines)
    ? data.medicines.map((medicine) => ({
      medicineName: medicine.medicineName,
      dosage: medicine.dosage || '',
      frequency: medicine.frequency || '',
      durationDays: toNumber(medicine.durationDays, 0),
      route: medicine.route || '',
      quantity: toNumber(medicine.quantity, 1),
      instructions: medicine.instructions || '',
    }))
    : (existingPrescription?.medicines || []);

  if (!medicines.length || !medicines[0]?.medicineName) {
    throw new ValidationError('At least one medicine entry is required');
  }

  const symptoms = Array.isArray(data.symptoms)
    ? data.symptoms.map((symptom) => String(symptom).trim()).filter(Boolean)
    : (existingPrescription?.symptoms || []);

  return {
    ...data,
    patientId,
    doctorId,
    appointmentId: appointmentId || null,
    medicines,
    symptoms,
    followUpAt: toNullableDate(data.followUpAt ?? existingPrescription?.followUpAt),
    issuedAt: toNullableDate(data.issuedAt ?? existingPrescription?.issuedAt) || new Date(),
    patientSnapshot: {
      entityId: patient.patientId,
      fullName: patient.fullName,
      phoneNumber: patient.phoneNumber || patient.whatsappNumber || null,
    },
    doctorSnapshot: {
      entityId: doctor.doctorId,
      fullName: doctor.fullName,
      phoneNumber: doctor.phoneNumber || null,
      specialization: doctor.specialization || null,
    },
  };
}

function normalizePharmacyProductPayload(payload = {}) {
  const data = { ...payload };
  delete data.accountId;
  delete data.productId;
  delete data.createdAt;
  delete data.updatedAt;

  if (!data.name) {
    throw new ValidationError('name is required');
  }

  return {
    ...data,
    unitPrice: toNumber(data.unitPrice, 0),
    mrp: toNumber(data.mrp, 0),
    taxPercent: toNumber(data.taxPercent, 0),
    reorderLevel: toNumber(data.reorderLevel, 0),
    currentStock: toNumber(data.currentStock, 0),
  };
}

async function normalizeStockEntryPayload(scope, payload = {}, existingStockEntry = null) {
  const data = { ...payload };
  delete data.accountId;
  delete data.stockEntryId;
  delete data.createdAt;
  delete data.updatedAt;

  const productId = data.productId || existingStockEntry?.productId;
  if (!productId) {
    throw new ValidationError('productId is required');
  }

  await findPharmacyProduct(scope, productId);

  const movementType = data.movementType || existingStockEntry?.movementType;
  if (!movementType) {
    throw new ValidationError('movementType is required');
  }

  const quantity = toNumber(data.quantity ?? existingStockEntry?.quantity, 0);
  if (quantity <= 0) {
    throw new ValidationError('quantity must be greater than 0');
  }

  const unitCost = toNumber(data.unitCost ?? existingStockEntry?.unitCost, 0);

  return {
    ...data,
    productId,
    movementType,
    quantity,
    unitCost,
    totalCost: toNumber(data.totalCost, quantity * unitCost),
    expiryDate: toNullableDate(data.expiryDate ?? existingStockEntry?.expiryDate),
    entryAt: toNullableDate(data.entryAt ?? existingStockEntry?.entryAt) || new Date(),
  };
}

async function recalculateProductStock(scope, productId) {
  const [summary] = await StockEntry.aggregate([
    {
      $match: {
        ...buildScopeFilter(scope),
        productId,
      },
    },
    {
      $group: {
        _id: null,
        currentStock: {
          $sum: {
            $switch: {
              branches: [
                { case: { $in: ['$movementType', ['in', 'return']] }, then: '$quantity' },
                { case: { $in: ['$movementType', ['out', 'dispense']] }, then: { $multiply: ['$quantity', -1] } },
              ],
              default: '$quantity',
            },
          },
        },
      },
    },
  ]);

  const currentStock = Math.max(toNumber(summary?.currentStock, 0), 0);
  return PharmacyProduct.findOneAndUpdate(
    { ...buildScopeFilter(scope), productId },
    { currentStock, updatedBy: 'stock-sync' },
    { new: true }
  );
}

async function normalizePaymentPayload(scope, payload = {}, existingPayment = null) {
  const data = { ...payload };
  delete data.accountId;
  delete data.patientPaymentId;
  delete data.createdAt;
  delete data.updatedAt;

  const patientInvoiceId = data.patientInvoiceId ?? existingPayment?.patientInvoiceId ?? null;
  const invoice = patientInvoiceId ? await findInvoice(scope, patientInvoiceId) : null;
  const patientId = data.patientId || invoice?.patientId || existingPayment?.patientId;

  if (!patientId) {
    throw new ValidationError('patientId is required');
  }

  await findPatient(scope, patientId);

  if (invoice && invoice.patientId !== patientId) {
    throw new ValidationError('Selected invoice does not belong to the provided patient');
  }

  const appointmentId = data.appointmentId ?? invoice?.appointmentId ?? existingPayment?.appointmentId ?? null;
  if (appointmentId) {
    await findAppointment(scope, appointmentId);
  }

  const amount = toNumber(data.amount ?? existingPayment?.amount, 0);
  if (amount <= 0) {
    throw new ValidationError('amount must be greater than 0');
  }

  return {
    ...data,
    patientId,
    patientInvoiceId,
    appointmentId,
    amount,
    paidAt: toNullableDate(data.paidAt ?? existingPayment?.paidAt) || new Date(),
  };
}

async function syncInvoicePaymentSummary(scope, patientInvoiceId) {
  if (!patientInvoiceId) return null;

  const invoice = await findInvoice(scope, patientInvoiceId);

  const [paymentSummary] = await PatientPayment.aggregate([
    {
      $match: {
        ...buildScopeFilter(scope),
        patientInvoiceId,
      },
    },
    {
      $group: {
        _id: null,
        completedAmount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0],
          },
        },
        refundedAmount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0],
          },
        },
        latestCompletedAt: {
          $max: {
            $cond: [{ $eq: ['$status', 'completed'] }, '$paidAt', null],
          },
        },
      },
    },
  ]);

  const completedAmount = Number(paymentSummary?.completedAmount || 0);
  const refundedAmount = Number(paymentSummary?.refundedAmount || 0);
  const amountPaid = Math.max(completedAmount - refundedAmount, 0);
  const total = Number(invoice.total || 0);
  const balanceDue = Math.max(total - amountPaid, 0);

  let status = invoice.status;
  if (!['cancelled', 'refunded'].includes(status)) {
    if (total > 0 && balanceDue <= 0) {
      status = 'paid';
    } else if (amountPaid > 0) {
      status = 'partially-paid';
    } else if (status !== 'draft') {
      status = 'issued';
    }
  }

  return PatientInvoice.findOneAndUpdate(
    { ...buildScopeFilter(scope), patientInvoiceId },
    {
      amountPaid,
      balanceDue,
      status,
      paidAt: amountPaid > 0 ? (paymentSummary?.latestCompletedAt || invoice.paidAt || new Date()) : null,
      updatedBy: 'payment-sync',
    },
    { new: true }
  );
}

router.get('/analytics', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const payload = await healthcareAnalyticsService.getHealthcareAnalytics(scope, req.query?.period);
    return sendSuccess(res, payload, 'Healthcare analytics retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'healthcareAnalytics');
  }
});

router.get('/overview', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const filter = buildScopeFilter(scope);
    const now = new Date();

    const [
      patientCount,
      activePatientCount,
      doctorCount,
      appointmentCount,
      upcomingAppointments,
      grantedConsents,
      invoiceStats,
      nextAppointments,
    ] = await Promise.all([
      Patient.countDocuments(filter),
      Patient.countDocuments({ ...filter, status: 'active' }),
      Doctor.countDocuments({ ...filter, status: 'active' }),
      Appointment.countDocuments(filter),
      Appointment.countDocuments({
        ...filter,
        status: { $in: ['scheduled', 'confirmed'] },
        scheduledAt: { $gte: now },
      }),
      ConsentRecord.countDocuments({ ...filter, status: 'granted' }),
      PatientInvoice.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalInvoices: { $sum: 1 },
            outstandingAmount: { $sum: '$balanceDue' },
            collectedAmount: { $sum: '$amountPaid' },
          },
        },
      ]),
      Appointment.find({
        ...filter,
        status: { $in: ['scheduled', 'confirmed'] },
        scheduledAt: { $gte: now },
      })
        .sort({ scheduledAt: 1 })
        .limit(5)
        .select('appointmentId scheduledAt status visitType patientSnapshot doctorSnapshot'),
    ]);

    const billing = invoiceStats[0] || {
      totalInvoices: 0,
      outstandingAmount: 0,
      collectedAmount: 0,
    };

    return sendSuccess(res, {
      accountId: scope.accountId,
      projectId: scope.projectId,
      phase: 'phase-2-core-data-live',
      counts: {
        patients: patientCount,
        activePatients: activePatientCount,
        doctors: doctorCount,
        appointments: appointmentCount,
        upcomingAppointments,
        grantedConsents,
      },
      billing,
      nextAppointments,
      modules: [
        { key: 'patients', status: 'live' },
        { key: 'appointments', status: 'live' },
        { key: 'doctors', status: 'live' },
        { key: 'patient-billing', status: 'live' },
        { key: 'consent-compliance', status: 'live-foundation' },
        { key: 'prescriptions', status: 'live' },
        { key: 'pharmacy', status: 'live' },
        { key: 'inventory', status: 'live' },
      ],
    }, 'Healthcare overview retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'healthcareOverview');
  }
});

router.get('/patients', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const { page, limit, skip } = parsePagination(req);
    const search = req.query?.q;
    const status = req.query?.status;
    const gender = req.query?.gender;
    const sortBy = req.query?.sortBy || 'updatedAt';
    const sortOrder = req.query?.sortOrder === 'asc' ? 1 : -1;

    const filter = {
      ...buildScopeFilter(scope),
      ...(status ? { status } : {}),
      ...(gender ? { gender } : {}),
      ...buildSearchFilter(search, ['patientId', 'medicalRecordNumber', 'fullName', 'phoneNumber', 'whatsappNumber', 'email']),
    };

    const sort = { [sortBy]: sortOrder, _id: -1 };

    const [patients, total] = await Promise.all([
      Patient.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Patient.countDocuments(filter),
    ]);

    const exposeSensitive = shouldExposeSensitive(req);
    const responsePatients = exposeSensitive
      ? patients
      : patients.map((patient) => redactPatientRecord(patient));

    return sendSuccess(res, {
      patients: responsePatients,
      redacted: !exposeSensitive,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    }, 'Patients retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listPatients');
  }
});

router.post('/patients', checkPlanLimit('patient'), async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const actor = getActor(req);
    const payload = normalizePatientPayload(req.body);

    const patient = await Patient.create({
      ...payload,
      accountId: scope.accountId,
      projectId: scope.projectId,
      createdBy: actor,
      updatedBy: actor,
    });

    fireHealthcareWhatsAppTrigger(scope.accountId, scope.projectId, 'patient_created', {
      patientId: patient.patientId,
      fullName: patient.fullName,
      phoneNumber: patient.phoneNumber,
      whatsappNumber: patient.whatsappNumber,
    });

    return sendSuccess(res, { patient }, 'Patient created', 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'createPatient');
  }
});

router.get('/patients/:patientId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const patient = await findPatient(scope, req.params.patientId);
    const exposeSensitive = shouldExposeSensitive(req);
    return sendSuccess(res, {
      patient: exposeSensitive ? patient : redactPatientRecord(patient.toObject()),
      redacted: !exposeSensitive,
    }, 'Patient retrieved');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Patient');
    }
    return handleControllerError(res, error, 'getPatient');
  }
});

router.put('/patients/:patientId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const existing = await findPatient(scope, req.params.patientId);
    const payload = normalizePatientPayload({ ...existing.toObject(), ...req.body });

    const patient = await Patient.findOneAndUpdate(
      { ...buildScopeFilter(scope), patientId: req.params.patientId },
      { ...payload, updatedBy: getActor(req) },
      { new: true, runValidators: true }
    );

    return sendSuccess(res, { patient }, 'Patient updated');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Patient');
    }
    return handleControllerError(res, error, 'updatePatient');
  }
});

router.delete('/patients/:patientId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const deleted = await Patient.findOneAndDelete({
      ...buildScopeFilter(scope),
      patientId: req.params.patientId,
    });

    if (!deleted) {
      return sendNotFound(res, 'Patient');
    }

    return sendSuccess(res, { patientId: req.params.patientId, deleted: true }, 'Patient deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deletePatient');
  }
});

router.get('/doctors', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const { page, limit, skip } = parsePagination(req);
    const search = req.query?.q;
    const status = req.query?.status;

    const filter = {
      ...buildScopeFilter(scope),
      ...(status ? { status } : {}),
      ...buildSearchFilter(search, ['doctorId', 'fullName', 'specialization', 'department', 'registrationNumber', 'email']),
    };

    const [doctors, total] = await Promise.all([
      Doctor.find(filter)
        .sort({ fullName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Doctor.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      doctors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    }, 'Doctors retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listDoctors');
  }
});

router.post('/doctors', checkPlanLimit('doctor'), async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const doctor = await Doctor.create({
      ...normalizeDoctorPayload(req.body),
      accountId: scope.accountId,
      projectId: scope.projectId,
      createdBy: getActor(req),
      updatedBy: getActor(req),
    });

    return sendSuccess(res, { doctor }, 'Doctor created', 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'createDoctor');
  }
});

router.get('/doctors/:doctorId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const doctor = await findDoctor(scope, req.params.doctorId);
    return sendSuccess(res, { doctor }, 'Doctor retrieved');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Doctor');
    }
    return handleControllerError(res, error, 'getDoctor');
  }
});

router.put('/doctors/:doctorId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const existing = await findDoctor(scope, req.params.doctorId);
    const payload = normalizeDoctorPayload({ ...existing.toObject(), ...req.body });

    const doctor = await Doctor.findOneAndUpdate(
      { ...buildScopeFilter(scope), doctorId: req.params.doctorId },
      { ...payload, updatedBy: getActor(req) },
      { new: true, runValidators: true }
    );

    return sendSuccess(res, { doctor }, 'Doctor updated');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Doctor');
    }
    return handleControllerError(res, error, 'updateDoctor');
  }
});

router.delete('/doctors/:doctorId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const deleted = await Doctor.findOneAndDelete({
      ...buildScopeFilter(scope),
      doctorId: req.params.doctorId,
    });

    if (!deleted) {
      return sendNotFound(res, 'Doctor');
    }

    return sendSuccess(res, { doctorId: req.params.doctorId, deleted: true }, 'Doctor deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteDoctor');
  }
});

router.get('/appointments', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const { page, limit, skip } = parsePagination(req);
    const search = req.query?.q;
    const status = req.query?.status;
    const patientId = req.query?.patientId;
    const doctorId = req.query?.doctorId;
    const visitType = req.query?.visitType;
    const channel = req.query?.channel;
    const billingStatus = req.query?.billingStatus;
    const from = toNullableDate(req.query?.from);
    const to = toNullableDate(req.query?.to);
    
    const sortBy = req.query?.sortBy || 'scheduledAt';
    const sortOrder = req.query?.sortOrder === 'asc' ? 1 : -1;

    const filter = {
      ...buildScopeFilter(scope),
      ...(status ? { status } : {}),
      ...(patientId ? { patientId } : {}),
      ...(doctorId ? { doctorId } : {}),
      ...(visitType ? { visitType } : {}),
      ...(channel ? { channel } : {}),
      ...(billingStatus ? { billingStatus } : {}),
      ...(from || to ? {
        scheduledAt: {
          ...(from ? { $gte: from } : {}),
          ...(to ? { $lte: to } : {}),
        },
      } : {}),
      ...buildSearchFilter(search, ['appointmentId', 'reason', 'patientSnapshot.fullName', 'doctorSnapshot.fullName']),
    };

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .sort({ [sortBy]: sortOrder, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Appointment.countDocuments(filter),
    ]);

    const exposeSensitive = shouldExposeSensitive(req);
    const responseAppointments = exposeSensitive
      ? appointments
      : appointments.map((appointment) => redactAppointmentRecord(appointment));

    return sendSuccess(res, {
      appointments: responseAppointments,
      redacted: !exposeSensitive,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    }, 'Appointments retrieved');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'listAppointments');
  }
});

router.post('/appointments', checkPlanLimit('appointment'), async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const appointment = await Appointment.create({
      ...(await normalizeAppointmentPayload(scope, req.body)),
      accountId: scope.accountId,
      projectId: scope.projectId,
      createdBy: getActor(req),
      updatedBy: getActor(req),
    });

    fireHealthcareWhatsAppTrigger(scope.accountId, scope.projectId, 'appointment_booked', {
      patientId: appointment.patientId,
      patientPhone: appointment.patientSnapshot?.phoneNumber,
      patientName: appointment.patientSnapshot?.fullName,
      doctorName: appointment.doctorSnapshot?.fullName,
      appointmentDate: formatDateForTrigger(appointment.scheduledAt),
      appointmentTime: formatTimeForTrigger(appointment.scheduledAt),
    });

    return sendSuccess(res, { appointment }, 'Appointment created', 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'createAppointment');
  }
});

router.get('/appointments/:appointmentId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const appointment = await findAppointment(scope, req.params.appointmentId);
    const exposeSensitive = shouldExposeSensitive(req);
    return sendSuccess(res, {
      appointment: exposeSensitive ? appointment : redactAppointmentRecord(appointment.toObject()),
      redacted: !exposeSensitive,
    }, 'Appointment retrieved');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Appointment');
    }
    return handleControllerError(res, error, 'getAppointment');
  }
});

router.put('/appointments/:appointmentId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const existing = await findAppointment(scope, req.params.appointmentId);
    const payload = await normalizeAppointmentPayload(scope, req.body, existing);

    let appointment = await Appointment.findOneAndUpdate(
      { ...buildScopeFilter(scope), appointmentId: req.params.appointmentId },
      { ...payload, updatedBy: getActor(req) },
      { new: true, runValidators: true }
    );

    const beforeScheduledAt = existing?.scheduledAt ? new Date(existing.scheduledAt).getTime() : null;
    const afterScheduledAt = appointment?.scheduledAt ? new Date(appointment.scheduledAt).getTime() : null;
    const wasRescheduled = beforeScheduledAt && afterScheduledAt && beforeScheduledAt !== afterScheduledAt;
    const becameCancelled = String(existing?.status || '') !== 'cancelled' && String(appointment?.status || '') === 'cancelled';
    const becameCompleted = String(existing?.status || '') !== 'completed' && String(appointment?.status || '') === 'completed';

    if (becameCompleted) {
      const finishedAt = new Date();
      appointment = await Appointment.findOneAndUpdate(
        { ...buildScopeFilter(scope), appointmentId: req.params.appointmentId },
        {
          $set: {
            'frontdesk.completedAt': finishedAt,
            'frontdesk.lastStatusChangedAt': finishedAt,
            'frontdesk.lastStatusChangedBy': getActor(req),
          },
          $push: {
            statusHistory: {
              status: 'completed',
              changedAt: finishedAt,
              changedBy: getActor(req),
              source: 'clinic',
            },
          },
        },
        { new: true, runValidators: true }
      );
    }

    if (wasRescheduled) {
      fireHealthcareWhatsAppTrigger(scope.accountId, scope.projectId, 'appointment_rescheduled', {
        patientId: appointment.patientId,
        patientPhone: appointment.patientSnapshot?.phoneNumber,
        patientName: appointment.patientSnapshot?.fullName,
        doctorName: appointment.doctorSnapshot?.fullName,
        appointmentDate: formatDateForTrigger(appointment.scheduledAt),
        appointmentTime: formatTimeForTrigger(appointment.scheduledAt),
      });
    }

    if (becameCancelled) {
      fireHealthcareWhatsAppTrigger(scope.accountId, scope.projectId, 'appointment_cancelled', {
        patientId: appointment.patientId,
        patientPhone: appointment.patientSnapshot?.phoneNumber,
        patientName: appointment.patientSnapshot?.fullName,
        appointmentDate: formatDateForTrigger(existing.scheduledAt || appointment.scheduledAt),
        appointmentTime: formatTimeForTrigger(existing.scheduledAt || appointment.scheduledAt),
      });
    }

    return sendSuccess(res, { appointment }, 'Appointment updated');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Appointment');
    }
    return handleControllerError(res, error, 'updateAppointment');
  }
});

router.delete('/appointments/:appointmentId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const deleted = await Appointment.findOneAndDelete({
      ...buildScopeFilter(scope),
      appointmentId: req.params.appointmentId,
    });

    if (!deleted) {
      return sendNotFound(res, 'Appointment');
    }

    return sendSuccess(res, { appointmentId: req.params.appointmentId, deleted: true }, 'Appointment deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteAppointment');
  }
});

router.get('/prescriptions', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const { page, limit, skip } = parsePagination(req);
    const search = req.query?.q;
    const status = req.query?.status;
    const patientId = req.query?.patientId;
    const doctorId = req.query?.doctorId;
    const from = toNullableDate(req.query?.from);
    const to = toNullableDate(req.query?.to);
    const sortOrder = req.query?.sortOrder === 'asc' ? 1 : -1;

    const filter = {
      ...buildScopeFilter(scope),
      ...(status ? { status } : {}),
      ...(patientId ? { patientId } : {}),
      ...(doctorId ? { doctorId } : {}),
      ...(from || to ? {
        issuedAt: {
          ...(from ? { $gte: from } : {}),
          ...(to ? { $lte: to } : {}),
        },
      } : {}),
      ...buildSearchFilter(search, ['prescriptionId', 'diagnosis', 'patientSnapshot.fullName', 'doctorSnapshot.fullName', 'medicines.medicineName']),
    };

    const [prescriptions, total] = await Promise.all([
      Prescription.find(filter)
        .sort({ issuedAt: sortOrder, createdAt: sortOrder })
        .skip(skip)
        .limit(limit),
      Prescription.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      prescriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    }, 'Prescriptions retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listPrescriptions');
  }
});

router.post('/prescriptions', checkPlanLimit('prescription'), async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const prescription = await Prescription.create({
      ...(await normalizePrescriptionPayload(scope, req.body)),
      accountId: scope.accountId,
      projectId: scope.projectId,
      createdBy: getActor(req),
      updatedBy: getActor(req),
    });

    fireHealthcareWhatsAppTrigger(scope.accountId, scope.projectId, 'prescription_saved', {
      patientId: prescription.patientId,
      patientPhone: prescription.patientSnapshot?.phoneNumber,
      patientName: prescription.patientSnapshot?.fullName,
      medicineSummary: prescription.medicines?.[0]?.medicineName,
    });

    let invoice = null;
    try {
      const invoiceResult = await createInvoiceForPrescription(scope, prescription.toObject?.() || prescription, {
        actor: getActor(req),
      });
      invoice = invoiceResult?.invoice || null;
    } catch (invoiceErr) {
      console.warn('Auto invoice from prescription failed:', invoiceErr?.message || invoiceErr);
    }

    return sendSuccess(res, { prescription, invoice }, invoice ? 'Prescription and bill created' : 'Prescription created', 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'createPrescription');
  }
});

router.get('/prescriptions/:prescriptionId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const prescription = await findPrescription(scope, req.params.prescriptionId);
    return sendSuccess(res, { prescription }, 'Prescription retrieved');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Prescription');
    }
    return handleControllerError(res, error, 'getPrescription');
  }
});

router.put('/prescriptions/:prescriptionId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const existing = await findPrescription(scope, req.params.prescriptionId);

    const prescription = await Prescription.findOneAndUpdate(
      { ...buildScopeFilter(scope), prescriptionId: req.params.prescriptionId },
      {
        ...(await normalizePrescriptionPayload(scope, req.body, existing)),
        updatedBy: getActor(req),
      },
      { new: true, runValidators: true }
    );

    return sendSuccess(res, { prescription }, 'Prescription updated');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Prescription');
    }
    return handleControllerError(res, error, 'updatePrescription');
  }
});

router.delete('/prescriptions/:prescriptionId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const deleted = await Prescription.findOneAndDelete({
      ...buildScopeFilter(scope),
      prescriptionId: req.params.prescriptionId,
    });

    if (!deleted) {
      return sendNotFound(res, 'Prescription');
    }

    return sendSuccess(res, { prescriptionId: req.params.prescriptionId, deleted: true }, 'Prescription deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deletePrescription');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Follow-up Routes
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/follow-ups', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const { page, limit, skip } = parsePagination(req);
    const patientId = req.query?.patientId;
    const doctorId = req.query?.doctorId;
    const status = req.query?.status;

    const filter = {
      ...buildScopeFilter(scope),
      ...(patientId ? { patientId } : {}),
      ...(doctorId ? { doctorId } : {}),
      ...(status ? { status } : {}),
    };

    const [followUps, total] = await Promise.all([
      FollowUp.find(filter)
        .sort({ followUpDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      FollowUp.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      followUps,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    }, 'Follow-ups retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listFollowUps');
  }
});

router.post('/follow-ups', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const {
      patientId,
      prescriptionId,
      diagnosis,
      followUpDate,
      followUpTime,
      treatmentType,
      notes,
      status,
    } = req.body;

    if (!patientId || !followUpDate) {
      throw new ValidationError('patientId and followUpDate are required');
    }

    // Verify patient exists
    const patient = await Patient.findOne({
      ...buildScopeFilter(scope),
      patientId,
    });

    if (!patient) {
      throw new NotFoundError('Patient');
    }

    // Capture patient snapshot
    const patientSnapshot = {
      entityId: patient.patientId,
      fullName: patient.fullName,
      phoneNumber: patient.whatsappNumber || patient.phoneNumber,
    };

    // If doctorId provided, capture doctor snapshot
    let doctorSnapshot = null;
    if (req.body.doctorId) {
      const doctor = await Doctor.findOne({
        ...buildScopeFilter(scope),
        doctorId: req.body.doctorId,
      });
      if (doctor) {
        doctorSnapshot = {
          entityId: doctor.doctorId,
          fullName: doctor.fullName,
          specialization: doctor.specialization,
        };
      }
    }

    const followUp = await FollowUp.create({
      accountId: scope.accountId,
      projectId: scope.projectId,
      patientId,
      prescriptionId: prescriptionId || null,
      doctorId: req.body.doctorId || null,
      patientSnapshot,
      doctorSnapshot: doctorSnapshot || {},
      diagnosis: diagnosis || '',
      followUpDate: new Date(followUpDate),
      followUpTime: followUpTime || '10:00',
      treatmentType: treatmentType || 'consultation',
      notes: notes || '',
      status: status || 'scheduled',
      createdBy: getActor(req),
      updatedBy: getActor(req),
    });

    // Trigger WhatsApp notification
    fireHealthcareWhatsAppTrigger(scope.accountId, scope.projectId, 'follow_up', {
      patientId,
      patientPhone: patient.whatsappNumber || patient.phoneNumber,
      patientName: patient.fullName,
      doctorName: doctorSnapshot?.fullName || 'Your doctor',
      followUpDate: formatDateForTrigger(followUpDate),
    });

    return sendSuccess(res, { followUp }, 'Follow-up scheduled', 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, error.message);
    }
    return handleControllerError(res, error, 'createFollowUp');
  }
});

router.get('/follow-ups/:followUpId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const followUp = await FollowUp.findOne({
      ...buildScopeFilter(scope),
      followUpId: req.params.followUpId,
    });

    if (!followUp) {
      return sendNotFound(res, 'Follow-up');
    }

    return sendSuccess(res, { followUp }, 'Follow-up retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getFollowUp');
  }
});

router.put('/follow-ups/:followUpId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const {
      diagnosis,
      followUpDate,
      followUpTime,
      treatmentType,
      notes,
      status,
      completedAt,
    } = req.body;

    const existingFollowUp = await FollowUp.findOne({
      ...buildScopeFilter(scope),
      followUpId: req.params.followUpId,
    });

    if (!existingFollowUp) {
      throw new NotFoundError('Follow-up');
    }

    const updates = {};
    if (diagnosis !== undefined) updates.diagnosis = diagnosis;
    if (followUpDate !== undefined) updates.followUpDate = new Date(followUpDate);
    if (followUpTime !== undefined) updates.followUpTime = followUpTime;
    if (treatmentType !== undefined) updates.treatmentType = treatmentType;
    if (notes !== undefined) updates.notes = notes;
    if (status !== undefined) updates.status = status;
    if (completedAt !== undefined) updates.completedAt = completedAt ? new Date(completedAt) : null;
    updates.updatedBy = getActor(req);

    const updatedFollowUp = await FollowUp.findOneAndUpdate(
      { ...buildScopeFilter(scope), followUpId: req.params.followUpId },
      updates,
      { new: true }
    );

    return sendSuccess(res, { followUp: updatedFollowUp }, 'Follow-up updated');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Follow-up');
    }
    return handleControllerError(res, error, 'updateFollowUp');
  }
});

router.delete('/follow-ups/:followUpId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const deleted = await FollowUp.findOneAndDelete({
      ...buildScopeFilter(scope),
      followUpId: req.params.followUpId,
    });

    if (!deleted) {
      return sendNotFound(res, 'Follow-up');
    }

    return sendSuccess(res, { followUpId: req.params.followUpId, deleted: true }, 'Follow-up deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteFollowUp');
  }
});

router.get('/pharmacy-products', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const { page, limit, skip } = parsePagination(req);
    const search = req.query?.q;
    const status = req.query?.status;

    const filter = {
      ...buildScopeFilter(scope),
      ...(status ? { status } : {}),
      ...buildSearchFilter(search, ['productId', 'sku', 'name', 'genericName', 'brand', 'category']),
    };

    const [products, total] = await Promise.all([
      PharmacyProduct.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      PharmacyProduct.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    }, 'Pharmacy products retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listPharmacyProducts');
  }
});

router.post('/pharmacy-products', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const product = await PharmacyProduct.create({
      ...normalizePharmacyProductPayload(req.body),
      accountId: scope.accountId,
      projectId: scope.projectId,
      createdBy: getActor(req),
      updatedBy: getActor(req),
    });

    return sendSuccess(res, { product }, 'Pharmacy product created', 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'createPharmacyProduct');
  }
});

router.get('/pharmacy-products/:productId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const product = await findPharmacyProduct(scope, req.params.productId);
    return sendSuccess(res, { product }, 'Pharmacy product retrieved');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Pharmacy product');
    }
    return handleControllerError(res, error, 'getPharmacyProduct');
  }
});

router.put('/pharmacy-products/:productId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const existing = await findPharmacyProduct(scope, req.params.productId);
    const payload = normalizePharmacyProductPayload({ ...existing.toObject(), ...req.body });

    const product = await PharmacyProduct.findOneAndUpdate(
      { ...buildScopeFilter(scope), productId: req.params.productId },
      { ...payload, updatedBy: getActor(req) },
      { new: true, runValidators: true }
    );

    return sendSuccess(res, { product }, 'Pharmacy product updated');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Pharmacy product');
    }
    return handleControllerError(res, error, 'updatePharmacyProduct');
  }
});

router.delete('/pharmacy-products/:productId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const deleted = await PharmacyProduct.findOneAndDelete({
      ...buildScopeFilter(scope),
      productId: req.params.productId,
    });

    if (!deleted) {
      return sendNotFound(res, 'Pharmacy product');
    }

    await StockEntry.deleteMany({
      ...buildScopeFilter(scope),
      productId: req.params.productId,
    });

    return sendSuccess(res, { productId: req.params.productId, deleted: true }, 'Pharmacy product deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deletePharmacyProduct');
  }
});

router.get('/stock-entries', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const { page, limit, skip } = parsePagination(req);
    const productId = req.query?.productId;
    const movementType = req.query?.movementType;
    const search = req.query?.q;

    const filter = {
      ...buildScopeFilter(scope),
      ...(productId ? { productId } : {}),
      ...(movementType ? { movementType } : {}),
      ...buildSearchFilter(search, ['stockEntryId', 'batchNumber', 'referenceId', 'supplierName', 'notes']),
    };

    const [entries, total] = await Promise.all([
      StockEntry.find(filter)
        .sort({ entryAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      StockEntry.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    }, 'Stock entries retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listStockEntries');
  }
});

router.post('/stock-entries', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const entry = await StockEntry.create({
      ...(await normalizeStockEntryPayload(scope, req.body)),
      accountId: scope.accountId,
      projectId: scope.projectId,
      createdBy: getActor(req),
      updatedBy: getActor(req),
    });

    await recalculateProductStock(scope, entry.productId);

    return sendSuccess(res, { entry }, 'Stock entry created', 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Pharmacy product');
    }
    return handleControllerError(res, error, 'createStockEntry');
  }
});

router.get('/stock-entries/:stockEntryId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const entry = await findStockEntry(scope, req.params.stockEntryId);
    return sendSuccess(res, { entry }, 'Stock entry retrieved');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Stock entry');
    }
    return handleControllerError(res, error, 'getStockEntry');
  }
});

router.put('/stock-entries/:stockEntryId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const existing = await findStockEntry(scope, req.params.stockEntryId);
    const previousProductId = existing.productId;

    const entry = await StockEntry.findOneAndUpdate(
      { ...buildScopeFilter(scope), stockEntryId: req.params.stockEntryId },
      {
        ...(await normalizeStockEntryPayload(scope, req.body, existing)),
        updatedBy: getActor(req),
      },
      { new: true, runValidators: true }
    );

    await recalculateProductStock(scope, previousProductId);
    if (entry?.productId && entry.productId !== previousProductId) {
      await recalculateProductStock(scope, entry.productId);
    }

    return sendSuccess(res, { entry }, 'Stock entry updated');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Stock entry');
    }
    return handleControllerError(res, error, 'updateStockEntry');
  }
});

router.delete('/stock-entries/:stockEntryId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const existing = await findStockEntry(scope, req.params.stockEntryId);

    await StockEntry.findOneAndDelete({
      ...buildScopeFilter(scope),
      stockEntryId: req.params.stockEntryId,
    });

    await recalculateProductStock(scope, existing.productId);

    return sendSuccess(res, { stockEntryId: req.params.stockEntryId, deleted: true }, 'Stock entry deleted');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Stock entry');
    }
    return handleControllerError(res, error, 'deleteStockEntry');
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const { page, limit, skip } = parsePagination(req);
    const status = req.query?.status;
    const patientId = req.query?.patientId;
    const search = req.query?.q;
    const startDate = req.query?.startDate;
    const endDate = req.query?.endDate;

    let searchFilter = buildSearchFilter(search, ['patientInvoiceId', 'invoiceNumber', 'patientId']);
    
    if (search) {
      const matchedPatients = await Patient.find({
        ...buildScopeFilter(scope),
        fullName: { $regex: escapeRegex(String(search).trim()), $options: 'i' }
      }).select('patientId').lean();
      
      if (matchedPatients.length > 0) {
        if (!searchFilter.$or) searchFilter.$or = [];
        searchFilter.$or.push({ patientId: { $in: matchedPatients.map(p => p.patientId) } });
      }
    }

    const filter = {
      ...buildScopeFilter(scope),
      ...(status ? { status } : {}),
      ...(patientId ? { patientId } : {}),
      ...searchFilter,
    };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [invoices, total] = await Promise.all([
      PatientInvoice.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PatientInvoice.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    }, 'Patient invoices retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listPatientInvoices');
  }
});

router.post('/invoices', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const invoice = await PatientInvoice.create({
      ...(await normalizeInvoicePayload(scope, req.body)),
      accountId: scope.accountId,
      projectId: scope.projectId,
      createdBy: getActor(req),
      updatedBy: getActor(req),
    });

    const patient = await findPatient(scope, invoice.patientId);
    fireHealthcareWhatsAppTrigger(scope.accountId, scope.projectId, 'invoice_created', {
      patientId: invoice.patientId,
      patientPhone: patient.phoneNumber || patient.whatsappNumber,
      patientName: patient.fullName,
      totalAmount: invoice.total,
    });

    return sendSuccess(res, { invoice }, 'Patient invoice created', 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'createPatientInvoice');
  }
});

router.get('/invoices/:patientInvoiceId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const invoice = await PatientInvoice.findOne({
      ...buildScopeFilter(scope),
      patientInvoiceId: req.params.patientInvoiceId,
    });

    if (!invoice) {
      return sendNotFound(res, 'Patient invoice');
    }

    return sendSuccess(res, { invoice }, 'Patient invoice retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getPatientInvoice');
  }
});

router.put('/invoices/:patientInvoiceId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const existing = await PatientInvoice.findOne({
      ...buildScopeFilter(scope),
      patientInvoiceId: req.params.patientInvoiceId,
    });

    if (!existing) {
      return sendNotFound(res, 'Patient invoice');
    }

    const invoice = await PatientInvoice.findOneAndUpdate(
      { ...buildScopeFilter(scope), patientInvoiceId: req.params.patientInvoiceId },
      { ...(await normalizeInvoicePayload(scope, req.body, existing)), updatedBy: getActor(req) },
      { new: true, runValidators: true }
    );

    return sendSuccess(res, { invoice }, 'Patient invoice updated');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'updatePatientInvoice');
  }
});

router.delete('/invoices/:patientInvoiceId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const deleted = await PatientInvoice.findOneAndDelete({
      ...buildScopeFilter(scope),
      patientInvoiceId: req.params.patientInvoiceId,
    });

    if (!deleted) {
      return sendNotFound(res, 'Patient invoice');
    }

    return sendSuccess(res, { patientInvoiceId: req.params.patientInvoiceId, deleted: true }, 'Patient invoice deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deletePatientInvoice');
  }
});

router.get('/payments', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const { page, limit, skip } = parsePagination(req);
    const patientId = req.query?.patientId;
    const patientInvoiceId = req.query?.patientInvoiceId;
    const status = req.query?.status;
    const search = req.query?.q;
    const startDate = req.query?.startDate;
    const endDate = req.query?.endDate;

    let searchFilter = buildSearchFilter(search, ['patientPaymentId', 'referenceNumber', 'notes']);

    if (search) {
      const matchedPatients = await Patient.find({
        ...buildScopeFilter(scope),
        fullName: { $regex: escapeRegex(String(search).trim()), $options: 'i' }
      }).select('patientId').lean();
      
      if (matchedPatients.length > 0) {
        if (!searchFilter.$or) searchFilter.$or = [];
        searchFilter.$or.push({ patientId: { $in: matchedPatients.map(p => p.patientId) } });
      }
    }

    const filter = {
      ...buildScopeFilter(scope),
      ...(patientId ? { patientId } : {}),
      ...(patientInvoiceId ? { patientInvoiceId } : {}),
      ...(status ? { status } : {}),
      ...searchFilter,
    };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [payments, total] = await Promise.all([
      PatientPayment.find(filter)
        .sort({ paidAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PatientPayment.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    }, 'Patient payments retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listPatientPayments');
  }
});

router.post('/payments', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const actor = getActor(req);
    const payment = await PatientPayment.create({
      ...(await normalizePaymentPayload(scope, req.body)),
      accountId: scope.accountId,
      projectId: scope.projectId,
      createdBy: actor,
      updatedBy: actor,
      collectedBy: req.body.collectedBy || actor,
    });

    if (payment.patientInvoiceId) {
      await syncInvoicePaymentSummary(scope, payment.patientInvoiceId);
    }

    const patient = await findPatient(scope, payment.patientId);
    if (payment.status === 'completed') {
      fireHealthcareWhatsAppTrigger(scope.accountId, scope.projectId, 'payment_received', {
        patientId: payment.patientId,
        patientPhone: patient.phoneNumber || patient.whatsappNumber,
        patientName: patient.fullName,
        amount: payment.amount,
      });
    }

    return sendSuccess(res, { payment }, 'Patient payment created', 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Related healthcare record');
    }
    return handleControllerError(res, error, 'createPatientPayment');
  }
});

router.get('/payments/:patientPaymentId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const payment = await findPayment(scope, req.params.patientPaymentId);
    return sendSuccess(res, { payment }, 'Patient payment retrieved');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Patient payment');
    }
    return handleControllerError(res, error, 'getPatientPayment');
  }
});

router.put('/payments/:patientPaymentId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const existing = await findPayment(scope, req.params.patientPaymentId);
    const previousInvoiceId = existing.patientInvoiceId || null;
    const actor = getActor(req);

    const payment = await PatientPayment.findOneAndUpdate(
      { ...buildScopeFilter(scope), patientPaymentId: req.params.patientPaymentId },
      {
        ...(await normalizePaymentPayload(scope, req.body, existing)),
        updatedBy: actor,
      },
      { new: true, runValidators: true }
    );

    if (previousInvoiceId) {
      await syncInvoicePaymentSummary(scope, previousInvoiceId);
    }
    if (payment?.patientInvoiceId && payment.patientInvoiceId !== previousInvoiceId) {
      await syncInvoicePaymentSummary(scope, payment.patientInvoiceId);
    }

    return sendSuccess(res, { payment }, 'Patient payment updated');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Patient payment');
    }
    return handleControllerError(res, error, 'updatePatientPayment');
  }
});

router.delete('/payments/:patientPaymentId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const existing = await findPayment(scope, req.params.patientPaymentId);

    await PatientPayment.findOneAndDelete({
      ...buildScopeFilter(scope),
      patientPaymentId: req.params.patientPaymentId,
    });

    if (existing.patientInvoiceId) {
      await syncInvoicePaymentSummary(scope, existing.patientInvoiceId);
    }

    return sendSuccess(res, { patientPaymentId: req.params.patientPaymentId, deleted: true }, 'Patient payment deleted');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Patient payment');
    }
    return handleControllerError(res, error, 'deletePatientPayment');
  }
});

router.get('/consents', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const { page, limit, skip } = parsePagination(req);
    const patientId = req.query?.patientId;
    const status = req.query?.status;
    const consentType = req.query?.consentType;

    const filter = {
      ...buildScopeFilter(scope),
      ...(patientId ? { patientId } : {}),
      ...(status ? { status } : {}),
      ...(consentType ? { consentType } : {}),
    };

    const [consents, total] = await Promise.all([
      ConsentRecord.find(filter)
        .sort({ collectedAt: -1 })
        .skip(skip)
        .limit(limit),
      ConsentRecord.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      consents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    }, 'Consent records retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listConsentRecords');
  }
});

router.post('/consents', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const consent = await ConsentRecord.create({
      ...(await normalizeConsentPayload(scope, req.body)),
      accountId: scope.accountId,
      projectId: scope.projectId,
      createdBy: getActor(req),
      updatedBy: getActor(req),
    });

    return sendSuccess(res, { consent }, 'Consent record created', 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'createConsentRecord');
  }
});

router.get('/consents/:consentId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const consent = await ConsentRecord.findOne({
      ...buildScopeFilter(scope),
      consentId: req.params.consentId,
    });

    if (!consent) {
      return sendNotFound(res, 'Consent record');
    }

    return sendSuccess(res, { consent }, 'Consent record retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getConsentRecord');
  }
});

router.put('/consents/:consentId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const existing = await ConsentRecord.findOne({
      ...buildScopeFilter(scope),
      consentId: req.params.consentId,
    });

    if (!existing) {
      return sendNotFound(res, 'Consent record');
    }

    const consent = await ConsentRecord.findOneAndUpdate(
      { ...buildScopeFilter(scope), consentId: req.params.consentId },
      { ...(await normalizeConsentPayload(scope, req.body, existing)), updatedBy: getActor(req) },
      { new: true, runValidators: true }
    );

    return sendSuccess(res, { consent }, 'Consent record updated');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'updateConsentRecord');
  }
});

router.delete('/consents/:consentId', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const deleted = await ConsentRecord.findOneAndDelete({
      ...buildScopeFilter(scope),
      consentId: req.params.consentId,
    });

    if (!deleted) {
      return sendNotFound(res, 'Consent record');
    }

    return sendSuccess(res, { consentId: req.params.consentId, deleted: true }, 'Consent record deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteConsentRecord');
  }
});

router.get('/audit-events', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const { page, limit, skip } = parsePagination(req);
    const action = req.query?.action;
    const entityType = req.query?.entityType;
    const severity = req.query?.severity;

    const filter = {
      ...buildScopeFilter(scope),
      ...(action ? { action: { $regex: escapeRegex(String(action)), $options: 'i' } } : {}),
      ...(entityType ? { entityType } : {}),
      ...(severity ? { severity } : {}),
    };

    const [events, total] = await Promise.all([
      HealthcareAuditEvent.find(filter)
        .sort({ eventAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      HealthcareAuditEvent.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    }, 'Healthcare audit events retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listHealthcareAuditEvents');
  }
});

router.post('/retention/patients/:patientId/anonymize', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const patient = await findPatient(scope, req.params.patientId);
    const dryRun = Boolean(req.body?.dryRun);

    const [
      appointmentCount,
      prescriptionCount,
      consentCount,
      invoiceCount,
      paymentCount,
    ] = await Promise.all([
      Appointment.countDocuments({ ...buildScopeFilter(scope), patientId: patient.patientId }),
      Prescription.countDocuments({ ...buildScopeFilter(scope), patientId: patient.patientId }),
      ConsentRecord.countDocuments({ ...buildScopeFilter(scope), patientId: patient.patientId }),
      PatientInvoice.countDocuments({ ...buildScopeFilter(scope), patientId: patient.patientId }),
      PatientPayment.countDocuments({ ...buildScopeFilter(scope), patientId: patient.patientId }),
    ]);

    const impact = {
      patientId: patient.patientId,
      appointments: appointmentCount,
      prescriptions: prescriptionCount,
      consents: consentCount,
      invoices: invoiceCount,
      payments: paymentCount,
    };

    if (dryRun) {
      return sendSuccess(res, {
        dryRun: true,
        impact,
      }, 'Healthcare retention dry-run completed');
    }

    const actor = getActor(req);
    const anonymizedName = `Redacted-${patient.patientId.slice(-6)}`;

    const [patientWrite, appointmentWrite, prescriptionWrite, consentWrite, invoiceWrite, paymentWrite] = await Promise.all([
      Patient.updateOne(
        { ...buildScopeFilter(scope), patientId: patient.patientId },
        {
          fullName: anonymizedName,
          firstName: 'Redacted',
          lastName: patient.patientId.slice(-6),
          phoneNumber: null,
          whatsappNumber: null,
          email: null,
          dateOfBirth: null,
          bloodGroup: null,
          allergies: [],
          chronicConditions: [],
          address: {
            line1: null,
            line2: null,
            city: null,
            state: null,
            postalCode: null,
            country: 'India',
          },
          emergencyContact: {
            name: null,
            relation: null,
            phoneNumber: null,
          },
          notes: '[REDACTED_BY_RETENTION_WORKFLOW]',
          communicationPreferences: {
            whatsapp: false,
            sms: false,
            email: false,
            calls: false,
          },
          consentSummary: {
            privacyAccepted: false,
            treatmentAccepted: false,
            whatsappOptIn: false,
            marketingOptIn: false,
            consentUpdatedAt: new Date(),
          },
          status: 'archived',
          updatedBy: actor,
        }
      ),
      Appointment.updateMany(
        { ...buildScopeFilter(scope), patientId: patient.patientId },
        {
          $set: {
            'patientSnapshot.fullName': anonymizedName,
            'patientSnapshot.phoneNumber': null,
            reason: '[REDACTED_BY_RETENTION_WORKFLOW]',
            notes: '[REDACTED_BY_RETENTION_WORKFLOW]',
            internalNotes: '[REDACTED_BY_RETENTION_WORKFLOW]',
            updatedBy: actor,
          },
        }
      ),
      Prescription.updateMany(
        { ...buildScopeFilter(scope), patientId: patient.patientId },
        {
          $set: {
            'patientSnapshot.fullName': anonymizedName,
            'patientSnapshot.phoneNumber': null,
            diagnosis: '[REDACTED_BY_RETENTION_WORKFLOW]',
            symptoms: [],
            notes: '[REDACTED_BY_RETENTION_WORKFLOW]',
            updatedBy: actor,
          },
        }
      ),
      ConsentRecord.updateMany(
        { ...buildScopeFilter(scope), patientId: patient.patientId },
        {
          $set: {
            notes: '[REDACTED_BY_RETENTION_WORKFLOW]',
            updatedBy: actor,
          },
        }
      ),
      PatientInvoice.updateMany(
        { ...buildScopeFilter(scope), patientId: patient.patientId },
        {
          $set: {
            notes: '[REDACTED_BY_RETENTION_WORKFLOW]',
            updatedBy: actor,
          },
        }
      ),
      PatientPayment.updateMany(
        { ...buildScopeFilter(scope), patientId: patient.patientId },
        {
          $set: {
            notes: '[REDACTED_BY_RETENTION_WORKFLOW]',
            referenceNumber: null,
            collectedBy: null,
            updatedBy: actor,
          },
        }
      ),
    ]);

    return sendSuccess(res, {
      dryRun: false,
      impact,
      writes: {
        patientUpdated: patientWrite.modifiedCount,
        appointmentsUpdated: appointmentWrite.modifiedCount,
        prescriptionsUpdated: prescriptionWrite.modifiedCount,
        consentsUpdated: consentWrite.modifiedCount,
        invoicesUpdated: invoiceWrite.modifiedCount,
        paymentsUpdated: paymentWrite.modifiedCount,
      },
    }, 'Healthcare retention anonymization completed');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Patient');
    }
    return handleControllerError(res, error, 'anonymizeHealthcarePatient');
  }
});

router.get('/whatsapp/template-presets', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    return sendSuccess(res, {
      accountId: scope.accountId,
      projectId: scope.projectId,
      templates: HEALTHCARE_TEMPLATE_PRESETS,
    }, 'Healthcare WhatsApp template presets retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listHealthcareWhatsAppTemplatePresets');
  }
});

router.get('/whatsapp/flow-presets', async (req, res) => {
  try {
    const scope = await resolveScope(req);
    return sendSuccess(res, {
      accountId: scope.accountId,
      projectId: scope.projectId,
      flowPresets: HEALTHCARE_FLOW_PRESETS,
    }, 'Healthcare flow presets retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listHealthcareFlowPresets');
  }
});

router.post('/whatsapp/consent-check', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const recipientPhone = req.body?.recipientPhone;

    if (!recipientPhone) {
      return sendValidationError(res, 'recipientPhone is required');
    }

    const result = await whatsappService.evaluateHealthcareConsent(scope.accountId, recipientPhone, {
      projectId: scope.projectId,
      patientId: req.body?.patientId || null,
      purpose: req.body?.purpose || 'healthcare-outbound',
      healthcareConsentCheck: true,
    });

    return sendSuccess(res, {
      accountId: scope.accountId,
      projectId: scope.projectId,
      consent: {
        allowed: result.allowed,
        reason: result.reason,
        patientId: result?.patient?.patientId || null,
        patientName: result?.patient?.fullName || null,
      },
    }, 'Healthcare WhatsApp consent check completed');
  } catch (error) {
    return handleControllerError(res, error, 'checkHealthcareWhatsAppConsent');
  }
});

router.post('/whatsapp/send-template', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const {
      phoneNumberId,
      recipientPhone,
      templateName,
      templatePresetKey,
      params = [],
      patientId = null,
      purpose = null,
    } = req.body || {};

    if (!phoneNumberId) {
      return sendValidationError(res, 'phoneNumberId is required');
    }
    if (!recipientPhone) {
      return sendValidationError(res, 'recipientPhone is required');
    }

    const preset = templatePresetKey
      ? HEALTHCARE_TEMPLATE_PRESETS.find((item) => item.key === templatePresetKey)
      : null;
    const resolvedTemplateName = templateName || preset?.recommendedTemplateName;

    if (!resolvedTemplateName) {
      return sendValidationError(res, 'templateName or valid templatePresetKey is required');
    }

    const sendResult = await whatsappService.sendTemplateMessage(
      scope.accountId,
      phoneNumberId,
      recipientPhone,
      resolvedTemplateName,
      Array.isArray(params) ? params : [],
      {
        campaign: 'healthcare',
        projectId: scope.projectId,
        patientId,
        purpose: purpose || preset?.purpose || 'healthcare-outbound',
        healthcareConsentCheck: true,
      }
    );

    return sendSuccess(res, {
      accountId: scope.accountId,
      projectId: scope.projectId,
      templateName: resolvedTemplateName,
      ...sendResult,
    }, 'Healthcare WhatsApp template sent');
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendValidationError(res, error.message);
    }
    return handleControllerError(res, error, 'sendHealthcareWhatsAppTemplate');
  }
});

router.post('/appointment-bot/install', async (req, res) => {
  try {
    const scope = await resolveScope(req, { requireProject: true });
    const phoneNumberId = req.body?.phoneNumberId || null;

    const { rule, created } = await installHealthcareAppointmentBot({
      accountId: scope.accountId,
      projectId: scope.projectId,
      phoneNumberId,
    });

    return sendSuccess(res, {
      chatbotId: String(rule._id),
      name: rule.name,
      keywords: rule.keywords,
      created,
    }, created ? 'Appointment booking chatbot installed' : 'Appointment booking chatbot updated', created ? 201 : 200);
  } catch (error) {
    return handleControllerError(res, error, 'installHealthcareAppointmentBot');
  }
});

export default router;
