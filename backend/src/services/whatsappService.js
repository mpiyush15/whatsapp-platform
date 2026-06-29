import axios from 'axios';
import mongoose from 'mongoose';
import PhoneNumber from '../models/PhoneNumber.js';
import Message from '../models/Message.js';
import Template from '../models/Template.js';
import Contact from '../models/Contact.js';
import Conversation from '../models/Conversation.js';
import KeywordRule from '../models/KeywordRule.js';
import WorkflowSession from '../models/WorkflowSession.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import ConsentRecord from '../models/ConsentRecord.js';
import Course from '../models/Course.js';
import Batch from '../models/Batch.js';
import { broadcastMessageStatus } from './socketService.js';
import { getSignedUrlForS3Object } from './s3Service.js';
import {
  resolveProjectIdForPhone,
  buildKeywordRuleQuery,
  buildActiveSessionQuery,
} from './chatbotContextService.js';
import { resolveProjectIdForAccountPhone } from './projectScopeResolver.js';
import { debitCreditsForOutboundMessage } from './messageBillingService.js';
import logger from '../utils/logger.js';
import { fireHealthcareWhatsAppTrigger } from './healthcareWhatsAppService.js';
import { upsertEducationEnquiry } from './educationEnquirySyncService.js';
import DemoRequest from '../models/DemoRequest.js';
import { emailService } from './emailService.js';

function resolveMessageCampaign(metadata = {}) {
  if (metadata.campaign) return metadata.campaign;
  if (metadata.broadcastId) return String(metadata.broadcastId);
  return 'manual';
}

function recordOutboundBilling(accountId, message) {
  debitCreditsForOutboundMessage({ accountId, message }).catch((err) => {
    logger.error('Credit debit failed:', err.message);
  });
}

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';

/**
 * WhatsApp Service - Core business logic
 * Handles Meta Cloud API communication
 * Fully multi-tenant with accountId + phoneNumberId isolation
 */
class WhatsAppService {

  normalizePhoneDigits(phone = '') {
    return String(phone || '').replace(/\D/g, '');
  }

  async resolveHealthcarePatient(accountId, recipientPhone, projectId = null, patientId = null) {
    if (patientId) {
      return Patient.findOne({
        accountId,
        ...(projectId ? { projectId } : {}),
        patientId,
      });
    }

    const normalized = this.normalizePhoneDigits(recipientPhone);
    if (!normalized) return null;

    const phoneSuffix = normalized.slice(-10);
    const suffixRegex = new RegExp(`${phoneSuffix}$`);

    return Patient.findOne({
      accountId,
      ...(projectId ? { projectId } : {}),
      $or: [
        { whatsappNumber: normalized },
        { phoneNumber: normalized },
        { whatsappNumber: suffixRegex },
        { phoneNumber: suffixRegex },
      ],
    }).sort({ updatedAt: -1 });
  }

  async evaluateHealthcareConsent(accountId, recipientPhone, metadata = {}) {
    const projectId = metadata.projectId || null;
    const patient = await this.resolveHealthcarePatient(accountId, recipientPhone, projectId, metadata.patientId || null);

    if (!patient) {
      return { allowed: true, reason: 'no-patient-match', patient: null };
    }

    if (patient?.consentSummary?.whatsappOptIn) {
      return { allowed: true, reason: 'patient-opt-in', patient };
    }

    const latestConsent = await ConsentRecord.findOne({
      accountId,
      ...(projectId ? { projectId } : {}),
      patientId: patient.patientId,
      consentType: { $in: ['whatsapp', 'reminder', 'privacy'] },
    }).sort({ collectedAt: -1, createdAt: -1 });

    if (!latestConsent) {
      return { allowed: false, reason: 'missing-consent', patient };
    }

    if (latestConsent.status !== 'granted') {
      return { allowed: false, reason: `consent-${latestConsent.status}`, patient };
    }

    if (latestConsent.expiresAt && new Date(latestConsent.expiresAt).getTime() < Date.now()) {
      return { allowed: false, reason: 'consent-expired', patient };
    }

    return { allowed: true, reason: 'granted-consent', patient };
  }

  async enforceHealthcareConsent(accountId, recipientPhone, metadata = {}) {
    if (!metadata?.healthcareConsentCheck) return;

    const result = await this.evaluateHealthcareConsent(accountId, recipientPhone, metadata);
    if (!result.allowed) {
      const patientId = result?.patient?.patientId || metadata?.patientId || 'unknown-patient';
      throw new ForbiddenError(
        `Healthcare WhatsApp send blocked due to consent policy (${result.reason}) for patient ${patientId}.`
      );
    }
  }

  getSessionResponsesObject(session) {
    if (!session?.responses) return {};
    if (typeof session.responses.toObject === 'function') {
      return session.responses.toObject();
    }
    if (session.responses instanceof Map) {
      return Object.fromEntries(session.responses);
    }
    if (typeof session.responses === 'object') {
      return session.responses;
    }
    return Object.fromEntries(session.responses);
  }

  resolveWorkflowValue(rawValue, session, fallback = '', options = {}) {
    const value = String(rawValue || '').trim();
    if (!value) return fallback;

    const responses = this.getSessionResponsesObject(session);
    const getResponseValue = (key) => {
      const internalKey = `${key}__id`;
      if (options.preferInternalIds && Object.prototype.hasOwnProperty.call(responses, internalKey)) {
        return String(responses[internalKey] ?? '');
      }
      return String(responses[key] ?? '');
    };

    // If raw value is directly a variable key
    if (Object.prototype.hasOwnProperty.call(responses, value)) {
      return getResponseValue(value).trim() || fallback;
    }

    // Replace handlebars-style placeholders: {{variable_name}}
    const resolved = value.replace(/\{\{\s*([a-zA-Z0-9_\-.]+)\s*\}\}/g, (_match, key) => {
      if (!Object.prototype.hasOwnProperty.call(responses, key)) return '';
      return getResponseValue(key);
    }).trim();

    return resolved || fallback;
  }

  resolveWorkflowActionValue(rawValue, session, fallback = '') {
    return this.resolveWorkflowValue(rawValue, session, fallback, { preferInternalIds: true });
  }

  getWorkflowLogicValue(session, variable) {
    const key = String(variable || '').trim();
    if (!key) return '';
    const responses = this.getSessionResponsesObject(session);
    return String(responses[`${key}__id`] ?? responses[key] ?? '');
  }

  getWorkflowConditionValues(session, variable) {
    const key = String(variable || '').trim();
    if (!key) return [];
    const responses = this.getSessionResponsesObject(session);
    return [
      responses[key],
      responses[`${key}__id`],
    ]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean);
  }

  getLeadSafeResponses(session) {
    return Object.fromEntries(
      Object.entries(this.getSessionResponsesObject(session))
        .filter(([key]) => !String(key).endsWith('__id'))
    );
  }

  inferEducationResponseField(step) {
    const source = String(step?.dynamicList || '').trim().toLowerCase();
    if (source === 'education_courses') return 'course';
    if (source === 'education_batches') return 'batch';

    const saveAs = String(step?.saveAs || '').trim().toLowerCase();
    const text = String(step?.text || '').trim().toLowerCase();
    const haystack = `${saveAs} ${text}`;
    const patterns = [
      ['name', /\b(name|student|full\s*name)\b/],
      ['email', /\b(email|mail)\b/],
      ['phone', /\b(phone|mobile|whatsapp|contact)\b/],
      ['course', /\b(course|program|class|exam|neet|jee|mhtcet|cbse)\b/],
      ['batch', /\b(batch|timing|slot|schedule)\b/],
      ['fees', /\b(fee|fees|amount|price|cost)\b/],
      ['notes', /\b(note|notes|question|requirement|remark|message)\b/],
    ];
    const matched = patterns.find(([, pattern]) => pattern.test(haystack));
    return matched?.[0] || '';
  }

  getEducationSafeResponses(session) {
    const responses = this.getSessionResponsesObject(session);
    const normalized = { ...responses };

    for (const step of session?.workflowSteps || []) {
      const saveAs = String(step?.saveAs || '').trim();
      if (!saveAs || !Object.prototype.hasOwnProperty.call(responses, saveAs)) continue;

      const field = this.inferEducationResponseField(step);
      if (!field || Object.prototype.hasOwnProperty.call(normalized, field)) continue;

      normalized[field] = responses[saveAs];
      const internalId = responses[`${saveAs}__id`];
      if (internalId && !Object.prototype.hasOwnProperty.call(normalized, `${field}__id`)) {
        normalized[`${field}__id`] = internalId;
      }
    }

    return normalized;
  }

  inferInteractiveResponseKey(step) {
    const explicitKey = String(step?.saveAs || '').trim();
    if (explicitKey) return explicitKey;
    if (!['buttons', 'list'].includes(String(step?.type || '').toLowerCase())) return '';

    const text = String(step?.text || '').toLowerCase();
    const knownFields = [
      ['course', /\bcourse\b|\bexam\b|\bneet\b|\bjee\b|\bmhtcet\b/],
      ['branch', /\bbranch\b|\blocation\b|\bcenter\b|\bcentre\b/],
      ['batch', /\bbatch\b|\bprogram\b|\bplan\b/],
      ['service', /\bservice\b|\bhelp\b|\boption\b/],
    ];

    const matched = knownFields.find(([, pattern]) => pattern.test(text));
    if (matched) return matched[0];

    return String(step?.id || 'selection')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase() || 'selection';
  }

  parseDateValue(rawValue, fallbackDate = null) {
    const str = String(rawValue || '').trim();
    if (!str) return fallbackDate;

    const lower = str.toLowerCase();
    if (lower === 'today') {
      return new Date();
    }
    if (lower === 'tomorrow') {
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    const dateTimeMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?:\s*(am|pm))?)?$/i);
    if (dateTimeMatch) {
      const day = Number(dateTimeMatch[1]);
      const month = Number(dateTimeMatch[2]) - 1;
      const yearRaw = Number(dateTimeMatch[3]);
      const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
      let hours = Number(dateTimeMatch[4] || 0);
      const minutes = Number(dateTimeMatch[5] || 0);
      const meridiem = String(dateTimeMatch[6] || '').toLowerCase();
      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
      const parsed = new Date(year, month, day, hours, minutes, 0, 0);
      return Number.isNaN(parsed.getTime()) ? fallbackDate : parsed;
    }

    const timeOnlyMatch = str.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
    if (timeOnlyMatch && fallbackDate) {
      const parsed = new Date(fallbackDate);
      let hours = Number(timeOnlyMatch[1]);
      const minutes = Number(timeOnlyMatch[2]);
      const meridiem = String(timeOnlyMatch[3] || '').toLowerCase();
      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
      parsed.setHours(hours, minutes, 0, 0);
      return Number.isNaN(parsed.getTime()) ? fallbackDate : parsed;
    }

    const date = new Date(str);
    return Number.isNaN(date.getTime()) ? fallbackDate : date;
  }

  getDayName(date) {
    return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
  }

  timeToMinutes(value = '') {
    const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  buildDateAtMinutes(dayDate, minutes) {
    const date = new Date(dayDate);
    date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return date;
  }

  isDoctorScheduledFor(doctor, scheduledAt, durationMinutes = 30) {
    if (!doctor || doctor.status !== 'active') return false;
    const dayOfWeek = this.getDayName(scheduledAt);
    const startMinutes = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
    const endMinutes = startMinutes + durationMinutes;

    return (doctor.availability || []).some((slot) => {
      if (slot.dayOfWeek !== dayOfWeek) return false;
      const slotStart = this.timeToMinutes(slot.startTime);
      const slotEnd = this.timeToMinutes(slot.endTime);
      if (slotStart === null || slotEnd === null) return false;
      return startMinutes >= slotStart && endMinutes <= slotEnd;
    });
  }

  async hasDoctorAppointmentConflict(accountId, projectId, doctorId, scheduledAt, durationMinutes = 30) {
    const endAt = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);
    const conflict = await Appointment.findOne({
      accountId,
      ...(projectId ? { projectId } : {}),
      doctorId,
      status: { $nin: ['cancelled', 'no-show'] },
      scheduledAt: { $lt: endAt },
      endAt: { $gt: scheduledAt },
    }).select('appointmentId');

    return Boolean(conflict);
  }

  async findAvailableDoctorsForSlot(accountId, projectId, scheduledAt, durationMinutes = 30, doctorId = '', { allowQueue = false } = {}) {
    const doctors = await Doctor.find({
      accountId,
      ...(projectId ? { projectId } : {}),
      status: 'active',
      ...(doctorId ? { doctorId } : {}),
    }).sort({ fullName: 1 });

    const available = [];
    for (const doctor of doctors) {
      if (!this.isDoctorScheduledFor(doctor, scheduledAt, durationMinutes)) continue;
      const hasConflict = await this.hasDoctorAppointmentConflict(
        accountId,
        projectId,
        doctor.doctorId,
        scheduledAt,
        durationMinutes
      );
      if (!hasConflict || allowQueue) available.push(doctor);
    }

    return available;
  }

  async getHealthcareDoctorListItems(accountId, projectId) {
    const doctors = await Doctor.find({
      accountId,
      ...(projectId ? { projectId } : {}),
      status: 'active',
    })
      .sort({ fullName: 1 })
      .limit(10);

    return doctors.map((doctor) => ({
      id: doctor.doctorId,
      title: doctor.fullName,
      description: doctor.specialization
        ? String(doctor.specialization).substring(0, 72)
        : 'General consultation',
    }));
  }

  async getHealthcareSlotsForPicker(accountId, projectId, doctorId, durationMinutes = 30, daysAhead = 10) {
    if (!doctorId) return [];

    const doctor = await Doctor.findOne({
      accountId,
      ...(projectId ? { projectId } : {}),
      doctorId,
      status: 'active',
    });

    if (!doctor) return [];

    const slots = [];
    const now = Date.now();

    for (let dayOffset = 0; dayOffset < daysAhead && slots.length < 10; dayOffset += 1) {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() + dayOffset);
      const dayOfWeek = this.getDayName(dayStart);
      const daySlots = (doctor.availability || []).filter((slot) => slot.dayOfWeek === dayOfWeek);

      for (const schedule of daySlots) {
        const slotStart = this.timeToMinutes(schedule.startTime);
        const slotEnd = this.timeToMinutes(schedule.endTime);
        if (slotStart === null || slotEnd === null) continue;

        for (let minute = slotStart; minute + durationMinutes <= slotEnd && slots.length < 10; minute += durationMinutes) {
          const startsAt = this.buildDateAtMinutes(dayStart, minute);
          if (startsAt.getTime() < now) continue;

          const hasConflict = await this.hasDoctorAppointmentConflict(
            accountId,
            projectId,
            doctor.doctorId,
            startsAt,
            durationMinutes
          );

          const timeLabel = startsAt.toLocaleString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });

          slots.push({
            pickerId: `hcslot_${startsAt.getTime()}`,
            doctorId: doctor.doctorId,
            doctorName: doctor.fullName,
            startsAt: startsAt.toISOString(),
            timeLabel,
            description: hasConflict ? 'Queue (slot busy)' : 'Available',
            queued: hasConflict,
          });
        }
      }
    }

    return slots;
  }

  async resolveDynamicListItems(session, step) {
    const source = String(step?.dynamicList || '').trim();
    if (!source) return step?.listItems || [];

    if (source === 'healthcare_doctors') {
      return this.getHealthcareDoctorListItems(session.accountId, session.projectId || null);
    }

    if (source === 'healthcare_slots') {
      const responses = this.getSessionResponsesObject(session);
      const doctorId = responses.doctor_id || responses.doctorId || '';
      const durationMinutes = 30;
      const slots = await this.getHealthcareSlotsForPicker(
        session.accountId,
        session.projectId || null,
        doctorId,
        durationMinutes
      );

      session.saveResponse('_slot_picker_json', JSON.stringify(slots));

      if (slots.length === 0) {
        return [{
          id: 'no_slots',
          title: 'No slots found',
          description: 'Ask clinic to add doctor schedule',
        }];
      }

      return slots.map((slot) => ({
        id: slot.pickerId,
        title: slot.timeLabel.substring(0, 24),
        description: slot.description,
      }));
    }

    if (source === 'education_courses') {
      const courses = await Course.find({
        accountId: session.accountId,
        ...(session.projectId ? { projectId: session.projectId } : {}),
        isActive: { $ne: false },
      }).sort({ name: 1 }).limit(10).lean();

      const formatInr = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

      return courses.map((course) => ({
        id: String(course._id),
        title: String(course.name || 'Course').substring(0, 24),
        description: [course.duration, course.fees ? `Fees: ${formatInr(course.fees)}` : ''].filter(Boolean).join(' | ').substring(0, 72),
      }));
    }

    if (source === 'education_batches') {
      const responses = this.getSessionResponsesObject(session);
      const courseId = responses.course__id || responses.courseId__id || responses.course_id || responses.courseId || '';
      const courseObjectId = /^[0-9a-fA-F]{24}$/.test(String(courseId)) ? String(courseId) : '';
      const query = {
        accountId: session.accountId,
        ...(session.projectId ? { projectId: session.projectId } : {}),
        isActive: { $ne: false },
        ...(courseObjectId ? { courseId: courseObjectId } : {}),
      };
      const batches = await Batch.find(query).populate('courseId').sort({ startDate: 1, createdAt: -1 }).limit(10).lean();

      return batches.map((batch) => ({
        id: String(batch._id),
        title: String(batch.name || 'Batch').substring(0, 24),
        description: [
          batch.courseId?.name,
          batch.startDate ? new Date(batch.startDate).toLocaleDateString('en-IN') : '',
          batch.timing,
        ].filter(Boolean).join(' | ').substring(0, 72),
      }));
    }

    return step?.listItems || [];
  }

  async getAvailableHealthcareSlots(accountId, projectId, doctorId, dayDate, durationMinutes = 30) {
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayOfWeek = this.getDayName(dayStart);
    const doctors = await Doctor.find({
      accountId,
      ...(projectId ? { projectId } : {}),
      status: 'active',
      ...(doctorId ? { doctorId } : {}),
      'availability.dayOfWeek': dayOfWeek,
    }).sort({ fullName: 1 });

    const slots = [];
    for (const doctor of doctors) {
      const daySlots = (doctor.availability || []).filter((slot) => slot.dayOfWeek === dayOfWeek);
      for (const schedule of daySlots) {
        const slotStart = this.timeToMinutes(schedule.startTime);
        const slotEnd = this.timeToMinutes(schedule.endTime);
        if (slotStart === null || slotEnd === null) continue;

        for (let minute = slotStart; minute + durationMinutes <= slotEnd; minute += durationMinutes) {
          const startsAt = this.buildDateAtMinutes(dayStart, minute);
          if (startsAt.getTime() < Date.now()) continue;
          const hasConflict = await this.hasDoctorAppointmentConflict(
            accountId,
            projectId,
            doctor.doctorId,
            startsAt,
            durationMinutes
          );
          slots.push({
            doctorId: doctor.doctorId,
            doctorName: doctor.fullName,
            startsAt: startsAt.toISOString(),
            queued: hasConflict,
            label: `${doctor.fullName} - ${startsAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}${hasConflict ? ' (Queue)' : ''}`,
          });
        }
      }
    }

    return slots.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  }

  async executeHealthcareVerticalAction(session, step) {
    const action = String(step?.action || '').trim().toLowerCase();
    const cfg = step?.actionConfig instanceof Map
      ? Object.fromEntries(step.actionConfig)
      : (step?.actionConfig || {});

    if (!action) {
      logger.warn('⚠️ vertical_action skipped: missing action id', { sessionId: String(session?._id || '') });
      return;
    }

    if (action === 'lookup_patient') {
      const normalizedPhone = this.normalizePhoneDigits(session.contactPhone);
      const patient = await this.resolveHealthcarePatient(
        session.accountId,
        normalizedPhone,
        session.projectId || null,
        null
      );

      if (patient) {
        session.saveResponse('patient_exists', 'yes');
        session.saveResponse('patientId', patient.patientId);
        session.saveResponse('patientName', patient.fullName || 'Patient');
      } else {
        session.saveResponse('patient_exists', 'no');
        session.saveResponse('patientName', '');
      }

      logger.info('✅ vertical_action:lookup_patient', {
        sessionId: String(session._id),
        exists: Boolean(patient),
      });
      return;
    }

    if (action === 'create_patient') {
      const resolvedName = this.resolveWorkflowActionValue(cfg.nameVar, session, 'Patient');
      const resolvedPhone = this.normalizePhoneDigits(this.resolveWorkflowActionValue(cfg.phoneVar, session, session.contactPhone));

      let patient = await this.resolveHealthcarePatient(
        session.accountId,
        resolvedPhone || session.contactPhone,
        session.projectId || null,
        null
      );

      if (!patient) {
        patient = await Patient.create({
          accountId: session.accountId,
          projectId: session.projectId || null,
          fullName: resolvedName,
          phoneNumber: resolvedPhone || null,
          whatsappNumber: resolvedPhone || this.normalizePhoneDigits(session.contactPhone) || null,
          communicationPreferences: { whatsapp: true, sms: false, email: false, calls: true },
          consentSummary: {
            privacyAccepted: false,
            treatmentAccepted: false,
            whatsappOptIn: true,
            marketingOptIn: false,
            consentUpdatedAt: new Date(),
          },
          createdBy: 'workflow-bot',
          updatedBy: 'workflow-bot',
        });
      }

      session.saveResponse('patientId', patient.patientId);
      session.saveResponse('patientName', patient.fullName || resolvedName);
      logger.info('✅ vertical_action:create_patient', { sessionId: String(session._id), patientId: patient.patientId });
      return;
    }

    if (action === 'check_slot') {
      const doctorIdValue = this.resolveWorkflowActionValue(cfg.doctorId, session, '');
      const dateValue = this.resolveWorkflowActionValue(cfg.date, session, '');
      const durationValue = Number(this.resolveWorkflowActionValue(cfg.durationMinutes, session, '30')) || 30;
      const saveAs = String(cfg.saveAs || 'available_slots').trim() || 'available_slots';

      const dayDate = this.parseDateValue(dateValue, new Date());
      const slots = await this.getAvailableHealthcareSlots(
        session.accountId,
        session.projectId || null,
        doctorIdValue,
        dayDate,
        durationValue
      );
      const limitedSlots = slots.slice(0, 8);

      session.saveResponse(saveAs, JSON.stringify(limitedSlots));
      session.saveResponse(`${saveAs}_text`, limitedSlots.map((slot, index) => `${index + 1}. ${slot.label}`).join('\n'));
      logger.info('✅ vertical_action:check_slot', { sessionId: String(session._id), slots: slots.length });
      return;
    }

    if (action === 'book_appointment') {
      const patientName = this.resolveWorkflowActionValue(cfg.patientNameVar, session, 'Patient');
      const dateRaw = this.resolveWorkflowActionValue(cfg.dateVar || cfg.date, session, '');
      const timeRaw = this.resolveWorkflowActionValue(cfg.timeVar || cfg.time, session, '');
      const slotRaw = this.resolveWorkflowActionValue(cfg.slotVar, session, '');
      const doctorIdValue = this.resolveWorkflowActionValue(cfg.doctorId, session, '');
      const visitTypeValue = this.resolveWorkflowActionValue(cfg.visitType, session, 'consultation');
      const durationMinutes = Number(this.resolveWorkflowActionValue(cfg.durationMinutes, session, '30')) || 30;

      const normalizedPhone = this.normalizePhoneDigits(session.contactPhone);
      let patient = await this.resolveHealthcarePatient(session.accountId, normalizedPhone, session.projectId || null, null);

      if (!patient) {
        patient = await Patient.create({
          accountId: session.accountId,
          projectId: session.projectId || null,
          fullName: patientName,
          phoneNumber: normalizedPhone || null,
          whatsappNumber: normalizedPhone || null,
          communicationPreferences: { whatsapp: true, sms: false, email: false, calls: true },
          consentSummary: {
            privacyAccepted: false,
            treatmentAccepted: false,
            whatsappOptIn: true,
            marketingOptIn: false,
            consentUpdatedAt: new Date(),
          },
          createdBy: 'workflow-bot',
          updatedBy: 'workflow-bot',
        });
      }

      let scheduledAt = null;
      let slotDoctorId = '';

      try {
        const parsedSlot = JSON.parse(slotRaw);
        if (parsedSlot?.startsAt) {
          scheduledAt = this.parseDateValue(parsedSlot.startsAt, null);
          slotDoctorId = parsedSlot.doctorId || '';
        } else if (Array.isArray(parsedSlot) && parsedSlot[0]?.startsAt) {
          scheduledAt = this.parseDateValue(parsedSlot[0].startsAt, null);
          slotDoctorId = parsedSlot[0].doctorId || '';
        }
      } catch (_err) {
        // Plain date strings are supported below.
      }

      if (!scheduledAt && String(slotRaw).startsWith('hcslot_')) {
        const timestamp = Number(String(slotRaw).slice('hcslot_'.length));
        if (Number.isFinite(timestamp) && timestamp > 0) {
          scheduledAt = new Date(timestamp);
        }
      }

      if (!scheduledAt && /^\d+$/.test(slotRaw)) {
        try {
          const responses = this.getSessionResponsesObject(session);
          const slotsVar = String(cfg.slotsVar || cfg.slotListVar || 'available_slots');
          const savedSlots = JSON.parse(
            responses[slotsVar] || responses._slot_picker_json || responses.available_slots || responses.slots || '[]'
          );
          const selectedSlot = savedSlots[Number(slotRaw) - 1];
          if (selectedSlot?.startsAt) {
            scheduledAt = this.parseDateValue(selectedSlot.startsAt, null);
            slotDoctorId = selectedSlot.doctorId || '';
          }
        } catch (_err) {
          // Fall through to date parsing.
        }
      }

      if (!scheduledAt && slotRaw && slotRaw !== 'no_slots') {
        try {
          const responses = this.getSessionResponsesObject(session);
          const savedSlots = JSON.parse(responses._slot_picker_json || '[]');
          const selectedSlot = savedSlots.find((item) => item.pickerId === slotRaw);
          if (selectedSlot?.startsAt) {
            scheduledAt = this.parseDateValue(selectedSlot.startsAt, null);
            slotDoctorId = selectedSlot.doctorId || '';
          }
        } catch (_err) {
          // Fall through.
        }
      }

      if (!scheduledAt && slotRaw) {
        scheduledAt = this.parseDateValue(slotRaw, null);
      }

      if (!scheduledAt) {
        const datePart = this.parseDateValue(dateRaw, new Date());
        scheduledAt = this.parseDateValue(timeRaw, datePart);
      }

      if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
        await this.sendTextMessage(
          session.accountId,
          session.phoneNumberId,
          session.contactPhone,
          'Please send the appointment date/time in this format: DD/MM/YYYY HH:mm, for example 28/05/2026 10:30.',
          { campaign: 'workflow_vertical_action', action: 'book_appointment_invalid_date', sessionId: session._id.toString() }
        );
        session.saveResponse('appointmentStatus', 'invalid_date');
        return;
      }

      if (slotRaw === 'no_slots') {
        await this.sendTextMessage(
          session.accountId,
          session.phoneNumberId,
          session.contactPhone,
          'No appointment slots are configured yet. Please contact the clinic.',
          { campaign: 'workflow_vertical_action', action: 'book_appointment_no_slots', sessionId: session._id.toString() }
        );
        session.saveResponse('appointmentStatus', 'no_slots');
        return;
      }

      const availableDoctors = await this.findAvailableDoctorsForSlot(
        session.accountId,
        session.projectId || null,
        scheduledAt,
        durationMinutes,
        doctorIdValue || slotDoctorId,
        { allowQueue: true }
      );
      const doctor = availableDoctors[0] || null;

      if (!doctor) {
        await this.sendTextMessage(
          session.accountId,
          session.phoneNumberId,
          session.contactPhone,
          `Sorry, no doctor is available for ${scheduledAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}. Please send another date and time.`,
          { campaign: 'workflow_vertical_action', action: 'book_appointment_unavailable', sessionId: session._id.toString() }
        );
        session.saveResponse('appointmentStatus', 'unavailable');
        session.saveResponse('requestedAppointmentTime', scheduledAt.toISOString());
        return;
      }

      const hasConflict = await this.hasDoctorAppointmentConflict(
        session.accountId,
        session.projectId || null,
        doctor.doctorId,
        scheduledAt,
        durationMinutes
      );
      const queueStatus = hasConflict ? 'queued' : 'none';

      const endAt = new Date(scheduledAt.getTime() + (durationMinutes * 60 * 1000));

      const normalizedVisitType = ['consultation', 'follow-up', 'procedure', 'lab', 'pharmacy', 'other']
        .includes(String(visitTypeValue || '').toLowerCase())
        ? String(visitTypeValue).toLowerCase()
        : 'consultation';

      const appointment = await Appointment.create({
        accountId: session.accountId,
        projectId: session.projectId || null,
        patientId: patient.patientId,
        doctorId: doctor?.doctorId || null,
        patientSnapshot: {
          entityId: patient.patientId,
          fullName: patient.fullName,
          phoneNumber: patient.phoneNumber || patient.whatsappNumber || normalizedPhone,
        },
        doctorSnapshot: doctor ? {
          entityId: doctor.doctorId,
          fullName: doctor.fullName,
          specialization: doctor.specialization,
          phoneNumber: doctor.phoneNumber,
        } : null,
        scheduledAt,
        endAt,
        durationMinutes,
        status: 'scheduled',
        visitType: normalizedVisitType,
        channel: 'clinic',
        bookingSource: 'whatsapp_bot',
        queueStatus,
        reason: 'Booked via WhatsApp flow',
        createdBy: 'workflow-bot',
        updatedBy: 'workflow-bot',
      });

      patient.lastVisitAt = scheduledAt;
      patient.updatedBy = 'workflow-bot';
      await patient.save();

      session.saveResponse('appointmentId', appointment.appointmentId);
      session.saveResponse('appointmentTime', scheduledAt.toISOString());
      session.saveResponse('doctorId', doctor.doctorId);
      session.saveResponse('doctorName', doctor.fullName);
      session.saveResponse('appointmentStatus', 'booked');
      session.saveResponse('queueStatus', queueStatus);

      const doctorText = doctor?.fullName ? ` with Dr. ${doctor.fullName}` : '';
      const queueNote = queueStatus === 'queued'
        ? ' You are in the queue for this slot; clinic will confirm.'
        : '';
      await this.sendTextMessage(
        session.accountId,
        session.phoneNumberId,
        session.contactPhone,
        `✅ Appointment booked${doctorText} on ${scheduledAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.${queueNote}`,
        {
          campaign: 'workflow_vertical_action',
          action: 'book_appointment',
          sessionId: session._id.toString(),
          projectId: session.projectId || null,
          patientId: patient.patientId,
          healthcareConsentCheck: true,
        }
      );

      if (session.projectId) {
        const scheduledLabel = scheduledAt.toLocaleDateString('en-IN');
        const timeLabel = scheduledAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        fireHealthcareWhatsAppTrigger(session.accountId, session.projectId, 'appointment_booked', {
          patientId: patient.patientId,
          patientPhone: patient.phoneNumber || patient.whatsappNumber || normalizedPhone,
          patientName: patient.fullName,
          doctorName: doctor?.fullName,
          appointmentDate: scheduledLabel,
          appointmentTime: timeLabel,
        });
      }

      logger.info('✅ vertical_action:book_appointment', {
        sessionId: String(session._id),
        appointmentId: appointment.appointmentId,
      });
      return;
    }

    logger.warn('⚠️ Unsupported vertical action', { action, sessionId: String(session._id) });
  }

  async executeEducationVerticalAction(session, step) {
    const action = String(step?.action || '').trim().toLowerCase();
    const cfg = step?.actionConfig instanceof Map
      ? Object.fromEntries(step.actionConfig)
      : (step?.actionConfig || {});

    if (action !== 'create_enquiry' && action !== 'upsert_enquiry') {
      logger.warn('⚠️ Unsupported education vertical action', { action, sessionId: String(session?._id || '') });
      return;
    }

    const responses = this.getEducationSafeResponses(session);
    const enquiry = await upsertEducationEnquiry({
      accountId: session.accountId,
      projectId: session.projectId || null,
      phone: session.contactPhone,
      source: 'chatbot_workflow_action',
      responses,
      courseId: this.resolveWorkflowActionValue(cfg.courseId, session, ''),
      batchId: this.resolveWorkflowActionValue(cfg.batchId, session, ''),
      workflowSessionId: session._id,
      chatbotId: session.ruleId,
    });

    if (enquiry?._id) {
      session.saveResponse('educationEnquiryId', String(enquiry._id));
      session.saveResponse('enquiryStatus', 'saved');
    } else {
      session.saveResponse('enquiryStatus', 'not_saved');
    }

    logger.info('✅ vertical_action:create_enquiry', {
      sessionId: String(session._id),
      enquiryId: enquiry?._id ? String(enquiry._id) : null,
    });
  }

  async executeVerticalActionStep(session, step) {
    const vertical = String(step?.vertical || '').trim().toLowerCase();
    if (vertical === 'healthcare') {
      await this.executeHealthcareVerticalAction(session, step);
      return;
    }
    if (vertical === 'education') {
      await this.executeEducationVerticalAction(session, step);
      return;
    }

    logger.warn('⚠️ vertical_action skipped for unsupported vertical', {
      vertical,
      sessionId: String(session?._id || ''),
    });
  }
  
  /**
   * Get phone number config with decrypted token
   * accountId is String from req.account.accountId (e.g., "2600003")
   * @param {string} accountId 
   * @param {string} phoneNumberId 
   */
  async getPhoneConfig(accountId, phoneNumberId) {
    // accountId is String from JWT: req.account.accountId (e.g., "2600003")
    // PhoneNumber.accountId is stored as String for multi-tenant isolation
    
    const config = await PhoneNumber.findOne({
      accountId,  // String, matches database format
      phoneNumberId,
      isActive: true 
    }).select('+accessToken'); // CRITICAL: explicitly select encrypted field
    
    if (!config) {
      throw new Error(
        '🚨 WhatsApp Business Account not connected!\n\n' +
        'Please connect your WhatsApp account in Settings first:\n' +
        '1. Go to Dashboard > Settings\n' +
        '2. Click "Add Phone Number"\n' +
        '3. Enter your Phone Number ID, WABA ID, and Access Token\n' +
        '4. Click "Add" to complete setup\n\n' +
        'Error: No active phone number configured for this account'
      );
    }
    
    // ✅ Fallback: if token missing in DB, use META_SYSTEM_TOKEN
    if (!config.accessToken) {
      const fallbackToken = process.env.META_SYSTEM_TOKEN;
      if (fallbackToken) {
        logger.warn('⚠️ Phone accessToken missing in DB, using META_SYSTEM_TOKEN fallback');
        config.accessToken = fallbackToken;
      } else {
        throw new Error(
          'Access token is missing. This may indicate:\n' +
          '1. Token encryption/decryption failed\n' +
          '2. JWT_SECRET environment variable changed\n' +
          '3. Database corruption\n' +
          '4. META_SYSTEM_TOKEN not configured\n' +
          'Action: Reconnect your WhatsApp account in Settings.'
        );
      }
    }
    
    // ✅ Log token status for debugging
    logger.info('📱 Phone config loaded:', {
      phoneNumberId: config.phoneNumberId,
      wabaId: config.wabaId,
      isActive: config.isActive,
      tokenLength: config.accessToken.length,
      tokenStarts: config.accessToken.substring(0, 30),
      hasValidFormat: !config.accessToken.startsWith('Bearer ')  // Should not have Bearer prefix here
    });
    
    return config;
  }

  /**
   * Send text message via WhatsApp Cloud API
   * @param {string} accountId 
   * @param {string} phoneNumberId 
   * @param {string} recipientPhone 
   * @param {string} messageText 
   * @param {object} metadata 
   */
  /**
   * Helper: Find or create conversation for outbound messages
   * CRITICAL: All messages must have a conversationId for real-time sync
   * ⚠️ IDEMPOTENT: Uses upsert to prevent E11000 duplicate key errors in broadcast loops
   */
  /**
   * Auto-create or update contact when message is sent/received
   * Ensures every message has associated contact
   */
  async getOrCreateContact(accountId, phone, contactName = null) {
    try {
      // Format phone as international (remove +)
      const formattedPhone = phone.replace(/[^0-9]/g, '');
      
      // Try to find existing contact
      let contact = await Contact.findOne({
        accountId,
        whatsappNumber: formattedPhone
      });
      
      if (!contact) {
        // Create new contact
        contact = await Contact.create({
          accountId,
          name: contactName || formattedPhone,  // Use provided name or fallback to phone
          phone: formattedPhone,
          whatsappNumber: formattedPhone,
          type: 'customer',
          isOptedIn: true,
          optInDate: new Date(),
          lastMessageAt: new Date()
        });
        
        logger.info('✅ Created new contact:', {
          accountId,
          phone: formattedPhone,
          name: contact.name
        });
      } else {
        // Update existing contact's last message time
        contact.lastMessageAt = new Date();
        contact.messageCount = (contact.messageCount || 0) + 1;
        
        // Update name if provided and different
        if (contactName && contactName !== 'Unknown' && contactName !== formattedPhone) {
          contact.name = contactName;
        }
        
        await contact.save();
        
        logger.info('✅ Updated contact:', {
          accountId,
          phone: formattedPhone,
          name: contact.name,
          messageCount: contact.messageCount
        });
      }
      
      return contact;
    } catch (error) {
      logger.error('❌ Error in getOrCreateContact:', error.message);
      throw error;
    }
  }

  async getOrCreateConversation(accountId, phoneNumberId, recipientPhone, workspaceId = null) {
    try {
      const conversationId = `${accountId}_${phoneNumberId}_${recipientPhone}`;
      const projectId = await resolveProjectIdForAccountPhone(accountId, phoneNumberId);
      
      // ✅ ATOMIC UPSERT WITH RETRY: Prevents duplicate key errors in concurrent operations
      let conversation;
      let retries = 3;
      let lastError;
      
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          conversation = await Conversation.findOneAndUpdate(
            {
              accountId,
              phoneNumberId,
              userPhone: recipientPhone
            },
            {
              $setOnInsert: {
                accountId,
                workspaceId: workspaceId || accountId,
                phoneNumberId,
                userPhone: recipientPhone,
                conversationId,
                lastMessageAt: new Date(),
                status: 'open',
              },
              ...(projectId ? { $set: { projectId } } : {}),
            },
            { 
              upsert: true, 
              new: true,
              runValidators: false // Skip validators on upsert to avoid conflicts
            }
          );
          break; // Success
        } catch (error) {
          lastError = error;
          if (error.code === 11000 && attempt < retries - 1) {
            // Duplicate key error - wait and retry with exponential backoff
            const delay = Math.pow(2, attempt) * 50; // 50ms, 100ms, 200ms
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // If last attempt and it's a duplicate key error, try findOne as fallback
          if (error.code === 11000) {
            conversation = await Conversation.findOne({
              accountId,
              phoneNumberId,
              userPhone: recipientPhone
            });
            
            if (conversation) {
              break; // Got existing conversation
            }
          }
          
          throw error;
        }
      }
      
      if (!conversation) {
        throw lastError || new Error('Failed to create/find conversation');
      }
      
      return conversation;
    } catch (error) {
      logger.error('⚠️ Error in getOrCreateConversation:', error.message);
      // Create minimal conversation to ensure message can be saved
      throw error;
    }
  }

  async sendTextMessage(accountId, phoneNumberId, recipientPhone, messageText, metadata = {}) {
    let message;
    
    try {
      // ✅ CRITICAL FIX: Validate phoneNumberId first
      if (!phoneNumberId || typeof phoneNumberId !== 'string') {
        throw new Error(
          'Phone number not found. Phone number ID is required.\n' +
          'This error occurs when:\n' +
          '1. Phone number is not properly configured\n' +
          '2. Phone number is still provisioning (quality rating not shown)\n' +
          '3. Phone number is not assigned to this account\n\n' +
          'Action: Go to Settings > Phone Numbers and ensure the phone has an ACTIVE status with quality rating displayed.'
        );
      }

      // Validate recipient phone FIRST before any operations
      if (!recipientPhone || typeof recipientPhone !== 'string') {
        throw new Error(`Invalid recipient phone: ${recipientPhone}. Expected non-empty string.`);
      }

      const config = await this.getPhoneConfig(accountId, phoneNumberId);
      const messageProjectId =
        metadata.projectId ||
        config.projectId ||
        (await resolveProjectIdForAccountPhone(accountId, phoneNumberId));
      
      // ✅ CRITICAL FIX: Validate phone is ACTIVE (not just exists)
      if (!config.isActive) {
        throw new Error(
          'Phone number is not active. Cannot send messages.\n' +
          'Action: Verify your phone number connection in Settings.'
        );
      }
      
      // ✅ CRITICAL FIX: Validate quality status
      // Phone should have quality rating to reliably send messages
      if (!config.qualityRating) {
        console.warn('⚠️  Warning: Phone number quality rating not shown yet. Messages may fail temporarily.');
      }
      
      // Clean phone number (remove + and spaces)
      const cleanPhone = recipientPhone.replace(/[\s+()-]/g, '');

      await this.enforceHealthcareConsent(accountId, cleanPhone, metadata);
      
      logger.info('📱 Preparing to send WhatsApp message:');
      logger.info('  Account ID:', accountId);
      logger.info('  Phone Number ID:', phoneNumberId);
      logger.info('  Original Phone:', recipientPhone);
      logger.info('  Cleaned Phone:', cleanPhone);
      logger.info('  Message:', messageText);
      
      // ✅ CRITICAL FIX: Use helper function for conversation management
      const conversation = await this.getOrCreateConversation(accountId, phoneNumberId, cleanPhone);
      
      // ✅ AUTO-CREATE CONTACT: Every sent message creates/updates contact
      await this.getOrCreateContact(accountId, cleanPhone, null);
      
      // Create message record (queued state) - NOW WITH CONVERSATION ID
      message = new Message({
        accountId,
        projectId: messageProjectId || conversation.projectId || null,
        phoneNumberId,
        conversationId: conversation.conversationId || conversation._id,
        recipientPhone: cleanPhone,
        messageType: 'text',
        content: { text: messageText },
        status: 'queued',
        campaign: resolveMessageCampaign(metadata),
        automationRuleId: metadata.ruleId ? String(metadata.ruleId) : null,
        direction: 'outbound'
      });
      
      await message.save();
      logger.info('✅ Message saved to DB with status: queued');

      // Send via WhatsApp Cloud API
      logger.info('🚀 Sending to Meta API...');
      const response = await axios.post(
        `${GRAPH_API_URL}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: { body: messageText }
        },
        {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('✅ Meta API Response:', response.data);

      // Update message with WhatsApp message ID
      message.waMessageId = response.data.messages[0].id;
      message.status = 'sent';
      message.sentAt = new Date();
      message.statusUpdates.push({
        status: 'sent',
        timestamp: new Date()
      });
      await message.save();
      recordOutboundBilling(accountId, message);

      // ✅ FIX 1: Create/update conversation with proper fields
      // Conversation already created in the fix above, just update last message
      const conversationIdFormatted = `${accountId}_${phoneNumberId}_${cleanPhone}`;
      try {
        await Conversation.findOneAndUpdate(
          {
            accountId,
            phoneNumberId,
            userPhone: cleanPhone
          },
          {
            $set: {
              lastMessageAt: new Date(),
              lastMessagePreview: messageText.substring(0, 200),
              lastMessageType: 'text',
              status: 'open'
            },
            $setOnInsert: {
              conversationId: conversationIdFormatted,
              userName: 'Unknown'
            }
          },
          { upsert: true, new: true }
        );
        logger.info('✅ Conversation created/updated for live chat display');
      } catch (convError) {
        logger.error('⚠️ Conversation update warning (non-critical):', convError.message);
        // Don't throw - message was already sent successfully
      }

      // Update phone number stats
      await PhoneNumber.updateOne(
        { accountId, phoneNumberId },
        { 
          $inc: { 
            'messageCount.total': 1, 
            'messageCount.sent': 1 
          } 
        }
      );

      return {
        success: true,
        messageId: message._id,
        waMessageId: message.waMessageId
      };

    } catch (error) {
      logger.error('❌ Send message error:', error.response?.data || error.message);
      
      // Save failed message to database
      if (message) {
        message.status = 'failed';
        message.failedAt = new Date();
        message.errorMessage = error.response?.data?.error?.message || error.message;
        message.errorCode = error.response?.data?.error?.code;
        message.statusUpdates.push({
          status: 'failed',
          timestamp: new Date(),
          errorMessage: error.response?.data?.error?.message || error.message,
          errorCode: error.response?.data?.error?.code
        });
        await message.save();
      }
      
      throw new Error(error.response?.data?.error?.message || 'Failed to send message');
    }
  }

  /**
   * Send template message (for pre-approved templates)
   * @param {string} accountId 
   * @param {string} phoneNumberId 
   * @param {string} recipientPhone 
   * @param {string} templateName 
   * @param {array} params 
   * @param {object} metadata 
   */
  async sendTemplateMessage(accountId, phoneNumberId, recipientPhone, templateName, params = [], metadata = {}) {
    let message;
    
    try {
      // ✅ CRITICAL FIX: Validate phoneNumberId first
      if (!phoneNumberId || typeof phoneNumberId !== 'string') {
        throw new Error(
          'Phone number not found. Phone number ID is required.\n' +
          'Action: Go to Settings > Phone Numbers and ensure the phone has an ACTIVE status.'
        );
      }

      // Validate recipient phone FIRST before any operations
      if (!recipientPhone || typeof recipientPhone !== 'string') {
        throw new Error(`Invalid recipient phone: ${recipientPhone}. Expected non-empty string.`);
      }

      const config = await this.getPhoneConfig(accountId, phoneNumberId);
      
      // ✅ CRITICAL FIX: Validate phone is ACTIVE
      if (!config.isActive) {
        throw createAppError('Phone number is not active. Cannot send template messages.');
      }

      const cleanPhone = recipientPhone.replace(/[\s+()-]/g, '');

      await this.enforceHealthcareConsent(accountId, cleanPhone, metadata);

      logger.info('📋 ========== SENDING TEMPLATE MESSAGE ==========');
      logger.info('Account ID:', accountId);
      logger.info('Phone Number ID:', phoneNumberId);
      logger.info('Template Name:', templateName);
      logger.info('Recipient Phone:', cleanPhone);
      logger.info('Parameters:', params);

      // CRITICAL: Fetch template metadata to validate variables
      const template = await Template.findOne({ 
        accountId, 
        name: templateName,
        deleted: { $ne: true },
        status: 'approved'
      });

      if (!template) {
        throw new Error(
          `Template "${templateName}" not found or not approved.\n` +
          'Possible reasons:\n' +
          '1. Template is still in DRAFT status - submit it to Meta first\n' +
          '2. Template is PENDING approval - wait for Meta to approve it\n' +
          '3. Template name is incorrect - check the exact name\n' +
          'Action: Go to Messages > Templates and verify the template is APPROVED.'
        );
      }

      const templateVariableCount = template.variables?.length || 0;
      logger.info('Template Variables Required:', templateVariableCount);

      // MANDATORY VALIDATION: Prevent silent failure
      if (templateVariableCount > 0 && (!params || params.length === 0)) {
        const errorMsg = `Template "${templateName}" requires ${templateVariableCount} parameter(s) but none were provided`;
        logger.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

      // VALIDATION: Parameter count must match
      if (templateVariableCount > 0 && params.length !== templateVariableCount) {
        const errorMsg = `Template "${templateName}" has ${templateVariableCount} variable(s) but ${params.length} parameter(s) provided`;
        logger.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

      logger.info('✅ Validation passed');

      // ✅ CRITICAL: Find or create conversation FIRST (use helper function)
      const conversation = await this.getOrCreateConversation(accountId, phoneNumberId, cleanPhone);
      
      logger.info('✅ Conversation ready for template:', conversation._id);

      const messageProjectId =
        metadata.projectId ||
        config.projectId ||
        (await resolveProjectIdForAccountPhone(accountId, phoneNumberId));

      // Create message record WITH conversationId
      message = new Message({
        accountId,
        projectId: messageProjectId || conversation.projectId || null,
        phoneNumberId,
        conversationId: conversation.conversationId || conversation._id,
        recipientPhone: cleanPhone,
        messageType: 'template',
        content: {
          templateName,
          templateParams: params
        },
        status: 'queued',
        campaign: resolveMessageCampaign(metadata),
        direction: 'outbound'
      });
      
      await message.save();

      // Build template components
      const components = [];

      // BODY params (if template has body variables)
      if (params && params.length > 0) {
        components.push({
          type: 'body',
          parameters: params.map(p => ({ type: 'text', text: String(p) }))
        });
        logger.info('✅ Building BODY component with', params.length, 'parameter(s)');
      }

      // HEADER params (required for media-header templates)
      const headerComp = (template.components || []).find(
        (c) => String(c?.type || '').toUpperCase() === 'HEADER'
      );
      const headerFormat = String(headerComp?.format || '').toUpperCase();

      if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat)) {
        let mediaLink = metadata.headerMediaUrl || null;

        // Prefer fresh signed URL when media is stored in S3 key (prevents expired URL failures)
        if (!mediaLink && template.mediaFilePath) {
          try {
            mediaLink = await getSignedUrlForS3Object(template.mediaFilePath, 3600);
            logger.info('✅ Generated fresh signed URL for template header media');
          } catch (s3Err) {
            logger.warn('⚠️ Failed to generate fresh signed URL, falling back to stored mediaUrl:', s3Err.message);
          }
        }

        if (!mediaLink) {
          mediaLink =
            template.mediaUrl ||
            headerComp?.example?.header_handle?.[0] ||
            headerComp?.example?.header_url ||
            null;
        }

        if (!mediaLink) {
          throw new Error(
            `Template "${templateName}" requires ${headerFormat} header media, but no media URL is configured`
          );
        }

        const lowerType = headerFormat.toLowerCase();
        const headerParam = { type: lowerType };

        if (lowerType === 'document') {
          headerParam.document = {
            link: mediaLink,
            filename: template.mediaFileName || undefined
          };
        } else {
          headerParam[lowerType] = { link: mediaLink };
        }

        components.push({
          type: 'header',
          parameters: [headerParam]
        });

        logger.info(`✅ Added required ${headerFormat} HEADER component`);
      }

      // BUTTON params (dynamic URL)
      if (metadata.buttonUrlParam) {
        // Meta API requires finding the index of the URL button. 
        // For simplicity, assuming the first button is the URL button (index 0).
        // If there are multiple buttons, the dynamic one must be targeted.
        // Usually, the dynamic URL button is configured as the 0th button.
        const urlButtonIndex = (template.components || []).findIndex(
          (c) => String(c?.type || '').toUpperCase() === 'BUTTONS'
        );
        let buttonIdx = 0;
        if (urlButtonIndex >= 0) {
           const btnComp = template.components[urlButtonIndex];
           // First try to find a URL button that is explicitly dynamic
           let urlBtn = btnComp.buttons?.findIndex(b => b.type === 'URL' && (b.url?.includes('{{') || b.example));
           // Fallback if the template object from DB is missing the URL field for some reason
           if (urlBtn === -1 || urlBtn === undefined) {
             // If there's multiple URL buttons, typically the dynamic one is the last one they added,
             // or we just grab the first one like before if we have no other choice.
             urlBtn = btnComp.buttons?.findIndex(b => b.type === 'URL');
           }
           if (urlBtn >= 0) buttonIdx = urlBtn;
        }

        components.push({
          type: 'button',
          sub_type: 'url',
          index: String(buttonIdx), // Meta requires this to be a string (e.g. "0")
          parameters: [
            {
              type: 'text',
              text: String(metadata.buttonUrlParam)
            }
          ]
        });
        logger.info(`✅ Added dynamic URL BUTTON component with parameter: "${metadata.buttonUrlParam}"`);
      }

      if (components.length === 0) {
        logger.info('📝 Template has no dynamic components - sending without components');
      }

      // Build template payload
      const templatePayload = {
        name: templateName,
        language: { code: template.language || 'en' }
      };

      // Attach components when present (body/header)
      if (components.length > 0) {
        templatePayload.components = components;
      }

      logger.info('📤 Sending to Meta API...');

      let response;
      const baseLang = template.language || 'en';
      const languagesToTry = [baseLang];
      
      // If the base language is 'en', add fallbacks
      if (baseLang === 'en') {
        languagesToTry.push('en_US', 'en_GB');
      } else if (baseLang === 'en_US' || baseLang === 'en_GB') {
        // Also fallback to generic 'en' if specific fails
        languagesToTry.push('en');
      }

      let lastError;
      for (const lang of languagesToTry) {
        templatePayload.language.code = lang;
        try {
          response = await axios.post(
            `${GRAPH_API_URL}/${phoneNumberId}/messages`,
            {
              messaging_product: 'whatsapp',
              to: cleanPhone,
              type: 'template',
              template: templatePayload
            },
            {
              headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          lastError = null; // Success
          break; // Exit loop
        } catch (err) {
          lastError = err;
          // Check if error is specifically a language mismatch (code 132001)
          if (err.response?.data?.error?.code === 132001) {
            logger.warn(`⚠️ Template language '${lang}' rejected (132001). Retrying next...`);
            continue; // Try next language
          }
          break; // For other errors, don't retry, just break out
        }
      }

      if (lastError) {
        throw lastError; // Throw the final error if all failed or if it was a different error
      }

      logger.info('✅ Meta API Response:', response.data);

      // Update message
      message.waMessageId = response.data.messages[0].id;
      message.status = 'sent';
      message.sentAt = new Date();
      message.statusUpdates.push({
        status: 'sent',
        timestamp: new Date()
      });
      await message.save();
      recordOutboundBilling(accountId, message);

      // ✅ FIX 1: Create/update conversation with proper fields
      // Conversation model requires: accountId, phoneNumberId, userPhone, conversationId, lastMessageAt
      const conversationIdTemplate = `${accountId}_${phoneNumberId}_${cleanPhone}`;
      try {
        await Conversation.findOneAndUpdate(
          {
            accountId,
            phoneNumberId,
            userPhone: cleanPhone
          },
          {
            $setOnInsert: {
              accountId,
              phoneNumberId,
              userPhone: cleanPhone,
              conversationId: conversationIdTemplate
            },
            $set: {
              lastMessageAt: new Date(),
              lastMessagePreview: `[Template] ${templateName}`,
              lastMessageType: 'template',
              status: 'open'
            }
          },
          { upsert: true, new: true }
        );
        logger.info('✅ Conversation created/updated for live chat display');
      } catch (convError) {
        logger.error('⚠️ Conversation update warning (non-critical):', convError.message);
        // Don't throw - message was already sent successfully
      }

      // Update stats
      await PhoneNumber.updateOne(
        { accountId, phoneNumberId },
        { 
          $inc: { 
            'messageCount.total': 1, 
            'messageCount.sent': 1 
          } 
        }
      );

      // Update template usage
      await Template.updateOne(
        { accountId, name: templateName },
        { 
          $inc: { usageCount: 1 },
          $set: { lastUsedAt: new Date() }
        }
      );

      return {
        success: true,
        messageId: message._id,
        waMessageId: message.waMessageId
      };

    } catch (error) {
      logger.error('🚨 Template send error:', error.response?.data || error.message);
      
      if (message) {
        message.status = 'failed';
        message.failedAt = new Date();
        message.errorMessage = error.response?.data?.error?.message || error.message;
        message.errorCode = error.response?.data?.error?.code;
        message.statusUpdates.push({
          status: 'failed',
          timestamp: new Date(),
          errorMessage: error.response?.data?.error?.message || error.message,
          errorCode: error.response?.data?.error?.code
        });
        await message.save();
      }
      
      throw new Error(error.response?.data?.error?.message || 'Failed to send template');
    }
  }

  /**
   * Test WhatsApp connection
   * @param {string} accountId 
   * @param {string} phoneNumberId 
   * @param {string} testPhone 
   */
  async testConnection(accountId, phoneNumberId, testPhone) {
    try {
      logger.info('🧪 Testing WhatsApp connection...');
      
      const result = await this.sendTextMessage(
        accountId,
        phoneNumberId,
        testPhone,
        '✅ Test message from WhatsApp Platform - Connection successful!',
        { campaign: 'test' }
      );

      // Update verification timestamp
      await PhoneNumber.updateOne(
        { accountId, phoneNumberId },
        { 
          verifiedAt: new Date(),
          lastTestedAt: new Date()
        }
      );

      return result;
    } catch (error) {
      logger.error('❌ Connection test failed:', error.message);
      throw error;
    }
  }

  /**
   * Handle webhook status updates from WhatsApp
   * @param {string} waMessageId 
   * @param {string} status 
   * @param {number} timestamp 
   * @param {object} errorInfo 
   */
  async handleStatusUpdate(waMessageId, status, timestamp, errorInfo = {}, io = null) {
    try {
      logger.info('📊 Status update:', waMessageId, status);
      
      const message = await Message.findOne({ waMessageId });
      
      if (!message) {
        logger.info('⚠️  Message not found for status update:', waMessageId);
        return;
      }

      // Update message status
      message.status = status;
      
      // Set timestamp based on status
      if (status === 'delivered') {
        message.deliveredAt = new Date(timestamp * 1000);
        
        // Update phone number stats
        await PhoneNumber.updateOne(
          { accountId: message.accountId, phoneNumberId: message.phoneNumberId },
          { $inc: { 'messageCount.delivered': 1 } }
        );
      } else if (status === 'read') {
        message.readAt = new Date(timestamp * 1000);
        
        await PhoneNumber.updateOne(
          { accountId: message.accountId, phoneNumberId: message.phoneNumberId },
          { $inc: { 'messageCount.read': 1 } }
        );
      } else if (status === 'failed') {
        message.failedAt = new Date(timestamp * 1000);
        message.errorCode = errorInfo.code;
        message.errorMessage = errorInfo.message;
        
        await PhoneNumber.updateOne(
          { accountId: message.accountId, phoneNumberId: message.phoneNumberId },
          { $inc: { 'messageCount.failed': 1 } }
        );
      }

      // Add to status updates history
      message.statusUpdates.push({
        status,
        timestamp: new Date(timestamp * 1000),
        errorCode: errorInfo.code,
        errorMessage: errorInfo.message
      });

      await message.save();
      logger.info('✅ Status updated in database');
      
      // 🔴 BROADCAST STATUS UPDATE VIA SOCKET.IO
      // This notifies all connected clients about the status change
      if (io && message.conversationId) {
        broadcastMessageStatus(io, message.conversationId, message._id, status);
        logger.info('📡 Status broadcast sent for message:', message._id);
      } else {
        logger.info('⚠️  Socket.io not available or conversationId missing - status broadcast skipped');
      }
      
    } catch (error) {
      logger.error('❌ Error updating status:', error.message);
    }
  }

  normalizePhone(phone) {
    return String(phone || '').replace(/[\s+()-]/g, '');
  }

  async recordRuleOutcome(ruleId, completedSuccessfully) {
    if (!ruleId) return;
    try {
      const rule = await KeywordRule.findById(ruleId).select('triggerCount successRate').lean();
      if (!rule) return;

      const triggers = Math.max(1, Number(rule.triggerCount || 0));
      const priorSuccesses = Math.round((Number(rule.successRate || 0) / 100) * triggers);
      const newSuccesses = completedSuccessfully ? priorSuccesses + 1 : priorSuccesses;
      const successRate = Math.min(100, Math.round((newSuccesses / triggers) * 100));

      await KeywordRule.updateOne({ _id: ruleId }, { $set: { successRate } });
    } catch (err) {
      logger.error('recordRuleOutcome failed:', err.message);
    }
  }

  /**
   * Process incoming message and check keyword rules
   */
  async processIncomingMessage(accountId, phoneNumberId, senderPhone, messageText, customerName = '', metadata = {}) {
    try {
      const cleanPhone = this.normalizePhone(senderPhone);
      const text = String(messageText || '').trim();
      if (!text) return;

      const projectId =
        metadata.projectId || (await resolveProjectIdForPhone(accountId, phoneNumberId));

      logger.info('📥 Chatbot inbound', { accountId, phoneNumberId, projectId, from: cleanPhone });

      const activeSession = await WorkflowSession.findOne(
        buildActiveSessionQuery(accountId, cleanPhone, phoneNumberId, projectId)
      ).sort({ lastActivityAt: -1 });

      if (activeSession) {
        if (
          activeSession.responseDeadlineAt &&
          activeSession.responseDeadlineAt <= new Date() &&
          activeSession.awaitingResponseSince
        ) {
          await this.checkWorkflowTimeout(String(activeSession._id));
          const refreshed = await WorkflowSession.findById(activeSession._id);
          if (refreshed?.status === 'active') {
            await this.handleWorkflowResponse(refreshed, text, metadata);
          }
        } else {
          await this.handleWorkflowResponse(activeSession, text, metadata);
        }
        return;
      }

      const rules = await KeywordRule.find(
        buildKeywordRuleQuery(accountId, phoneNumberId, projectId)
      ).sort({ projectId: -1, updatedAt: -1 });

      for (const rule of rules) {
        if (!rule.matches(text)) continue;

        const cooldownMinutes = 60;
        const recentMessage = await Message.findOne({
          accountId,
          recipientPhone: cleanPhone,
          direction: 'outbound',
          automationRuleId: String(rule._id),
          createdAt: { $gte: new Date(Date.now() - cooldownMinutes * 60 * 1000) },
        }).lean();

        if (recentMessage) continue;

        await KeywordRule.updateOne(
          { _id: rule._id },
          { $inc: { triggerCount: 1 }, $set: { lastTriggeredAt: new Date() } }
        );

        const ruleMeta = { campaign: 'keyword_auto_reply', ruleId: String(rule._id) };

        if (rule.replyType === 'text' && rule.replyContent?.text) {
          await this.sendTextMessage(accountId, phoneNumberId, cleanPhone, rule.replyContent.text, ruleMeta);
        } else if (rule.replyType === 'template' && rule.replyContent?.templateName) {
          await this.sendTemplateMessage(
            accountId,
            phoneNumberId,
            cleanPhone,
            rule.replyContent.templateName,
            rule.replyContent.templateParams || [],
            ruleMeta
          );
        } else if (rule.replyType === 'workflow' && rule.replyContent?.workflow?.length) {
          await this.startWorkflowSession(
            accountId,
            phoneNumberId,
            cleanPhone,
            customerName,
            rule._id,
            rule.projectId || projectId || null,
            rule.replyContent.workflow,
            rule.timeoutMinutes || 1
          );
        }

        break;
      }
    } catch (error) {
      logger.error('❌ Error in processIncomingMessage:', error);
    }
  }

  /**
   * Get statistics for account
   * @param {string} accountId 
   * @param {string} phoneNumberId (optional)
   */
  async getStats(accountId, phoneNumberId = null) {
    try {
      const query = { accountId };
      if (phoneNumberId) query.phoneNumberId = phoneNumberId;

      const [
        totalMessages,
        sentMessages,
        deliveredMessages,
        failedMessages,
        todayMessages
      ] = await Promise.all([
        Message.countDocuments(query),
        Message.countDocuments({ ...query, status: 'sent' }),
        Message.countDocuments({ ...query, status: 'delivered' }),
        Message.countDocuments({ ...query, status: 'failed' }),
        Message.countDocuments({ 
          ...query, 
          createdAt: { 
            $gte: new Date(new Date().setHours(0, 0, 0, 0)) 
          } 
        })
      ]);

      return {
        totalMessages,
        sentMessages,
        deliveredMessages,
        failedMessages,
        todayMessages,
        deliveryRate: totalMessages > 0 
          ? ((deliveredMessages / totalMessages) * 100).toFixed(1) + '%'
          : '0%'
      };
    } catch (error) {
      logger.error('❌ Error getting stats:', error.message);
      throw error;
    }
  }

  /**
   * Upload media to WhatsApp servers and get media ID
   * @param {Buffer} fileBuffer 
   * @param {string} phoneNumberId 
   * @param {string} accessToken 
   * @param {string} mimeType 
   * @param {string} filename 
   */
  async uploadMediaToWhatsApp(fileBuffer, phoneNumberId, accessToken, mimeType, filename) {
    try {
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      
      formData.append('file', fileBuffer, {
        filename: filename,
        contentType: mimeType
      });
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', mimeType);
      
      logger.info('⬆️ Uploading to WhatsApp Media API...');
      logger.info('  Phone Number ID:', phoneNumberId);
      logger.info('  Filename:', filename);
      logger.info('  Type:', mimeType);
      
      const response = await axios.post(
        `${GRAPH_API_URL}/${phoneNumberId}/media`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...formData.getHeaders()
          }
        }
      );
      
      logger.info('✅ Media uploaded to WhatsApp:', response.data);
      return response.data.id; // Returns media ID
      
    } catch (error) {
      logger.error('❌ WhatsApp media upload error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to upload media to WhatsApp');
    }
  }

  /**
   * Send media message (image, video, document)
   * @param {string} accountId 
   * @param {string} phoneNumberId 
   * @param {string} recipientPhone 
   * @param {string} mediaUrl - S3 URL (stored for reference)
   * @param {string} mediaType - image, video, or document
   * @param {string} caption - Optional caption for media
   * @param {object} metadata - Must include fileBuffer, mimeType, filename
   */
  async sendMediaMessage(accountId, phoneNumberId, recipientPhone, mediaUrl, mediaType, caption = '', metadata = {}) {
    let message;
    
    try {
      // Validate recipient phone FIRST before any operations
      if (!recipientPhone || typeof recipientPhone !== 'string') {
        throw new Error(`Invalid recipient phone: ${recipientPhone}. Expected non-empty string.`);
      }

      const config = await this.getPhoneConfig(accountId, phoneNumberId);
      const cleanPhone = recipientPhone.replace(/[\s+()-]/g, '');
      
      logger.info('📤 Sending media message:');
      logger.info('  Account ID:', accountId);
      logger.info('  Phone Number ID:', phoneNumberId);
      logger.info('  Recipient:', cleanPhone);
      logger.info('  Media Type:', mediaType);
      logger.info('  Caption:', caption);
      
      // ✅ CRITICAL FIX: Use helper function for conversation management
      const conversation = await this.getOrCreateConversation(accountId, phoneNumberId, cleanPhone);
      
      // Create message record - NOW WITH CONVERSATION ID
      message = new Message({
        accountId,
        phoneNumberId,
        conversationId: conversation._id, // ✅ ADD CONVERSATION ID
        recipientPhone: cleanPhone,
        messageType: mediaType,
        content: { 
          url: mediaUrl,
          caption: caption 
        },
        status: 'queued',
        campaign: resolveMessageCampaign(metadata),
        direction: 'outbound'
      });
      
      await message.save();
      logger.info('✅ Message saved to DB');

      // Prepare WhatsApp API payload with media URL directly (solves delay issue)
      const mediaPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: mediaType,
        [mediaType]: {}
      };
      
      if (mediaUrl) {
        mediaPayload[mediaType].link = mediaUrl;
        logger.info('🔗 Using direct media link to avoid upload delays');
      } else if (metadata.fileBuffer) {
        logger.info('⚠️ No mediaUrl provided, falling back to manual WhatsApp media upload');
        const mediaId = await this.uploadMediaToWhatsApp(
          metadata.fileBuffer,
          phoneNumberId,
          config.accessToken,
          metadata.mimeType,
          metadata.filename
        );
        mediaPayload[mediaType].id = mediaId;
      } else {
        throw new Error('Either mediaUrl or fileBuffer is required to send media');
      }

      // Add caption if provided (for image and video)
      if (caption && (mediaType === 'image' || mediaType === 'video')) {
        mediaPayload[mediaType].caption = caption;
      }

      // Add filename for documents
      if (mediaType === 'document' && metadata.filename) {
        mediaPayload[mediaType].filename = metadata.filename;
      }

      logger.info('🚀 Sending media message to Meta API...');
      const response = await axios.post(
        `${GRAPH_API_URL}/${phoneNumberId}/messages`,
        mediaPayload,
        {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('✅ Meta API Response:', response.data);

      // Update message with WhatsApp message ID
      message.waMessageId = response.data.messages[0].id;
      message.status = 'sent';
      message.sentAt = new Date();
      message.statusUpdates.push({
        status: 'sent',
        timestamp: new Date()
      });
      await message.save();
      recordOutboundBilling(accountId, message);

      // ✅ FIX 1: Create/update conversation with proper fields
      // Conversation model requires: accountId, phoneNumberId, userPhone, conversationId, lastMessageAt
      const conversationIdMedia = `${accountId}_${phoneNumberId}_${cleanPhone}`;
      const mediaLabel = mediaType === 'image' ? '🖼️ Photo' : 
                         mediaType === 'video' ? '🎥 Video' :
                         mediaType === 'audio' ? '🎵 Audio Message' :
                         mediaType === 'document' ? `📄 ${metadata.filename || 'Document'}` :
                         `${mediaType}`;
      try {
        await Conversation.findOneAndUpdate(
          {
            accountId,
            phoneNumberId,
            userPhone: cleanPhone
          },
          {
            $setOnInsert: {
              accountId,
              phoneNumberId,
              userPhone: cleanPhone,
              conversationId: conversationIdMedia
            },
            $set: {
              lastMessageAt: new Date(),
              lastMessagePreview: mediaLabel,
              lastMessageType: mediaType,
              status: 'open'
            }
          },
          { upsert: true, new: true }
        );
        logger.info('✅ Conversation created/updated for live chat display');
      } catch (convError) {
        logger.error('⚠️ Conversation update warning (non-critical):', convError.message);
        // Don't throw - message was already sent successfully
      }

      // Update phone number stats
      await PhoneNumber.updateOne(
        { accountId, phoneNumberId },
        { 
          $inc: { 
            'messageCount.total': 1, 
            'messageCount.sent': 1 
          } 
        }
      );

      return {
        success: true,
        messageId: message._id,
        waMessageId: message.waMessageId
      };

    } catch (error) {
      logger.error('❌ Send media error:', error.response?.data || error.message);
      
      if (message) {
        message.status = 'failed';
        message.failedAt = new Date();
        message.errorMessage = error.response?.data?.error?.message || error.message;
        message.errorCode = error.response?.data?.error?.code;
        message.statusUpdates.push({
          status: 'failed',
          timestamp: new Date(),
          errorMessage: error.response?.data?.error?.message || error.message,
          errorCode: error.response?.data?.error?.code
        });
        await message.save();
      }
      
      throw new Error(error.response?.data?.error?.message || 'Failed to send media');
    }
  }

  /**
   * Process workflow - send multiple response steps
   * @param {string} accountId 
   * @param {string} phoneNumberId 
   * @param {string} recipientPhone 
   * @param {Array} workflowSteps 
   * @param {string} ruleId - Optional rule ID for tracking
   */
  async processWorkflow(accountId, phoneNumberId, recipientPhone, workflowSteps, ruleId = null) {
    try {
      logger.info('🔄 Processing workflow with', workflowSteps.length, 'steps');
      
      for (const step of workflowSteps) {
        // Apply delay if specified
        if (step.delay && step.delay > 0) {
          logger.info(`⏱️ Waiting ${step.delay} seconds...`);
          await new Promise(resolve => setTimeout(resolve, step.delay * 1000));
        }

        // Send based on step type
        if (step.type === 'text') {
          await this.sendTextMessage(
            accountId,
            phoneNumberId,
            recipientPhone,
            step.text || '',
            { campaign: 'workflow_auto_reply', ruleId }
          );
        } else if (step.type === 'buttons' && step.buttons && step.buttons.length > 0) {
          logger.info('🔘 Sending button step:', {
            text: step.text,
            buttonsCount: step.buttons.length,
            buttons: step.buttons.map(b => ({ id: b.id, title: b.title, url: b.url }))
          });
          await this.sendButtonMessage(
            accountId,
            phoneNumberId,
            recipientPhone,
            step.text || '',
            step.buttons
          );
        } else if (step.type === 'list' && step.listItems && step.listItems.length > 0) {
          await this.sendListMessage(
            accountId,
            phoneNumberId,
            recipientPhone,
            step.text || '',
            step.listItems
          );
        }
      }
      
      logger.info('✅ Workflow completed successfully');
    } catch (error) {
      logger.error('❌ Error processing workflow:', error.message);
      throw error;
    }
  }

  /**
   * Send interactive button message
   * Supports both reply buttons and URL buttons (CTA)
   * @param {string} accountId 
   * @param {string} phoneNumberId 
   * @param {string} recipientPhone 
   * @param {string} bodyText 
   * @param {Array} buttons - Array of {id, title, url}
   */
  async sendButtonMessage(accountId, phoneNumberId, recipientPhone, bodyText, buttons) {
    try {
      const config = await this.getPhoneConfig(accountId, phoneNumberId);
      
      logger.info('🔘 sendButtonMessage called with:', {
        recipientPhone,
        bodyText: bodyText.substring(0, 50),
        buttonsCount: buttons.length,
        buttons: buttons.map(b => ({ title: b.title, hasUrl: !!b.url }))
      });
      
      // ALWAYS send as reply buttons (no URLs in payload)
      // This allows up to 3 buttons to show
      // URLs will be sent when user clicks the button
      const formattedButtons = buttons.slice(0, 3).map((btn, index) => ({
        type: 'reply',
        reply: {
          id: btn.id || `btn_${index}`,
          title: btn.title.substring(0, 20) // WhatsApp limit
        }
      }));

      logger.info(`✅ Sending ${formattedButtons.length} reply buttons (URLs stored for click response)`);

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: bodyText
          },
          action: {
            buttons: formattedButtons
          }
        }
      };

      const response = await axios.post(
        `${GRAPH_API_URL}/${phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('✅ Button message sent:', response.data.messages[0].id);
      
      // ✅ CRITICAL: Find or create conversation FIRST
      const conversation = await this.getOrCreateConversation(accountId, phoneNumberId, recipientPhone);
      
      // Save to database WITH conversationId
      const message = new Message({
        accountId,
        phoneNumberId,
        conversationId: conversation.conversationId || conversation._id,
        recipientPhone: recipientPhone,
        direction: 'outbound',
        messageType: 'interactive',
        content: { text: bodyText },
        waMessageId: response.data.messages[0].id,
        status: 'sent',
        sentAt: new Date(),
        campaign: 'workflow_button',
      });
      await message.save();
      recordOutboundBilling(accountId, message);

      return response.data;
    } catch (error) {
      logger.error('❌ Error sending button message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send interactive list message
   * @param {string} accountId 
   * @param {string} phoneNumberId 
   * @param {string} recipientPhone 
   * @param {string} bodyText 
   * @param {Array} listItems - Array of {id, title, description}
   */
  async sendListMessage(accountId, phoneNumberId, recipientPhone, bodyText, listItems) {
    try {
      const config = await this.getPhoneConfig(accountId, phoneNumberId);
      
      // WhatsApp API format for list (max 10 items)
      const formattedRows = listItems.slice(0, 10).map((item, index) => ({
        id: item.id || `item_${index}`,
        title: item.title.substring(0, 24), // WhatsApp limit
        description: item.description ? item.description.substring(0, 72) : undefined
      }));

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: {
            text: bodyText
          },
          action: {
            button: 'View Options',
            sections: [{
              title: 'Options',
              rows: formattedRows
            }]
          }
        }
      };

      const response = await axios.post(
        `${GRAPH_API_URL}/${phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('✅ List message sent:', response.data.messages[0].id);
      
      // ✅ CRITICAL: Find or create conversation FIRST
      const conversation = await this.getOrCreateConversation(accountId, phoneNumberId, recipientPhone);
      
      // Save to database WITH conversationId
      const message = new Message({
        accountId,
        phoneNumberId,
        conversationId: conversation.conversationId || conversation._id,
        direction: 'outbound',
        recipientPhone: recipientPhone,
        messageType: 'interactive',
        content: { text: bodyText },
        waMessageId: response.data.messages[0].id,
        status: 'sent',
        sentAt: new Date(),
        campaign: 'workflow_list',
      });
      await message.save();
      recordOutboundBilling(accountId, message);

      return response.data;
    } catch (error) {
      logger.error('❌ Error sending list message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Start a new conversational workflow session
   * @param {string} accountId 
   * @param {string} phoneNumberId 
   * @param {string} contactPhone 
   * @param {string} ruleId 
  * @param {string|null} projectId
  * @param {Array} workflowSteps 
   * @param {number} timeoutMinutes - Timeout in minutes for user response
   */
  async startWorkflowSession(accountId, phoneNumberId, contactPhone, customerName, ruleId, projectId, workflowSteps, timeoutMinutes = 1) {
    try {
      const cleanPhone = this.normalizePhone(contactPhone);
      logger.info('🆕 Starting new workflow session for:', cleanPhone);
      logger.info('⏰ Timeout set to:', timeoutMinutes, 'minutes');
      
      // Cancel any existing active sessions for this contact
      await WorkflowSession.updateMany(
        { accountId, contactPhone: cleanPhone, status: 'active' },
        { status: 'cancelled', completedAt: new Date() }
      );

      // Create new session
      const session = await WorkflowSession.create({
        accountId,
        projectId: projectId || null,
        phoneNumberId,
        contactPhone: cleanPhone,
        customerName: customerName || '',
        ruleId,
        workflowSteps,
        currentStepIndex: 0,
        status: 'active',
        timeoutMinutes
      });

      logger.info('✅ Workflow session created:', session._id);

      // Send the first step
      await this.sendWorkflowStep(session);
      
    } catch (error) {
      logger.error('❌ Error starting workflow session:', error);
      throw error;
    }
  }

  /**
   * Send current workflow step
   * @param {Object} session - WorkflowSession document
   */
  async sendWorkflowStep(session) {
    try {
      const step = session.getCurrentStep();
      
      if (!step) {
        logger.info('✅ Workflow completed');
        session.status = 'completed';
        session.completedAt = new Date();
        session.responseDeadlineAt = null;
        session.awaitingResponseSince = null;
        await session.save();
        await this.recordRuleOutcome(session.ruleId, true);
        await this.sendWorkflowCompletionMessage(session);
        return;
      }

      logger.info(`📤 Sending step ${session.currentStepIndex + 1}/${session.workflowSteps.length}: ${step.type}`);

      // Apply delay if specified
      if (step.delay && step.delay > 0) {
        logger.info(`⏱️ Waiting ${step.delay} seconds...`);
        await new Promise(resolve => setTimeout(resolve, step.delay * 1000));
      }

      const renderStepText = (text) => this.resolveWorkflowValue(String(text || ''), session, '');

      // Send based on step type
      if (step.type === 'text' || step.type === 'question') {
        await this.sendTextMessage(
          session.accountId,
          session.phoneNumberId,
          session.contactPhone,
          renderStepText(step.text),
          { campaign: 'workflow_conversation', sessionId: session._id.toString() }
        );
      } else if (step.type === 'buttons' && step.buttons && step.buttons.length > 0) {
        await this.sendButtonMessage(
          session.accountId,
          session.phoneNumberId,
          session.contactPhone,
          renderStepText(step.text),
          step.buttons
        );
      } else if (step.type === 'list') {
        const listItems = step.dynamicList
          ? await this.resolveDynamicListItems(session, step)
          : (step.listItems || []);

        if (listItems.length > 0) {
          await this.sendListMessage(
            session.accountId,
            session.phoneNumberId,
            session.contactPhone,
            renderStepText(step.text) || 'Please choose an option:',
            listItems
          );
        } else {
          const emptyListText = String(step.dynamicList || '').startsWith('education_')
            ? 'No active options are available right now. Please contact the institute.'
            : 'No options are available right now. Please contact the clinic.';
          await this.sendTextMessage(
            session.accountId,
            session.phoneNumberId,
            session.contactPhone,
            emptyListText,
            { campaign: 'workflow_conversation', sessionId: session._id.toString() }
          );
        }
      } else if (step.type === 'vertical_action') {
        await this.executeVerticalActionStep(session, step);
      } else if (step.type === 'condition') {
        await this.advanceConditionStep(session, step);
        return;
      }

      // Button and List steps ALWAYS wait for response
      const shouldWaitForResponse = step.waitForResponse || step.saveAs || step.type === 'buttons' || step.type === 'list' || step.type === 'question';

      // If this step doesn't wait for response, automatically advance
      if (!shouldWaitForResponse) {
        let hasMore = session.advanceStep();
        if (step.isTerminal) {
          session.currentStepIndex = session.workflowSteps.length;
          hasMore = false;
        }
        session.responseDeadlineAt = null;
        session.awaitingResponseSince = null;
        await session.save();
        
        if (hasMore) {
          // Send next step immediately
          await this.sendWorkflowStep(session);
        } else {
          // Workflow complete
          session.status = 'completed';
          session.completedAt = new Date();
          await session.save();
          await this.recordRuleOutcome(session.ruleId, true);
          await this.sendWorkflowCompletionMessage(session);
        }
      } else {
        session.awaitingResponseSince = new Date();
        session.responseDeadlineAt = new Date(
          Date.now() + (session.timeoutMinutes || 1) * 60 * 1000
        );
        await session.save();
        logger.info('⏳ Waiting for user response until', session.responseDeadlineAt);
      }
      
    } catch (error) {
      logger.error('❌ Error sending workflow step:', error);
      throw error;
    }
  }

  /**
   * Handle user response in active workflow
   * @param {Object} session - WorkflowSession document
   * @param {string} responseText - User's response text
   * @param {Object} metadata - Optional metadata (buttonId, etc.)
   */
  async handleWorkflowResponse(session, responseText, metadata = {}) {
    try {
      const step = session.getCurrentStep();
      
      if (!step) {
        logger.info('⚠️ No current step in session');
        return;
      }

      // Check if session has already timed out
      if (session.hasTimedOut) {
        logger.info('⏰ Session has already timed out, ignoring response');
        return;
      }

      logger.info(`💾 Received response for step ${session.currentStepIndex + 1}: "${responseText}"`);
      if (metadata.buttonId) {
        logger.info(`🔘 Button ID from webhook: ${metadata.buttonId}`);
      }
      if (metadata.listItemId) {
        logger.info(`📋 List item ID from webhook: ${metadata.listItemId}`);
      }

      // Clear timeout timer
      session.awaitingResponseSince = null;

      // Check if next step should be determined by conditional branching
      let nextStepIndex = null;
      let selectedOption = null;
      let selectedOptionId = null;
      
      // Check if current step has buttons/list items with nextStepId (conditional branching)
      if (step.buttons && step.buttons.length > 0) {
        logger.info(`🔍 Checking buttons:`, step.buttons.map(b => ({ 
          id: b.id, 
          title: b.title, 
          url: b.url,
          hasUrl: !!b.url 
        })));
        
        // Match by buttonId first (if provided), otherwise by text
        let selectedButton;
        if (metadata.buttonId) {
          logger.info(`🔍 Matching by button ID: ${metadata.buttonId}`);
          selectedButton = step.buttons.find(btn => btn.id === metadata.buttonId);
        }
        
        if (!selectedButton) {
          logger.info(`🔍 Matching by button text: ${responseText}`);
          selectedButton = step.buttons.find(btn => 
            responseText.toLowerCase().includes(btn.title.toLowerCase()) ||
            responseText === btn.id
          );
        }
        
        if (selectedButton) {
          selectedOption = selectedButton;
          selectedOptionId = selectedButton.id;
          logger.info(`🔘 User clicked button:`, { 
            title: selectedButton.title, 
            url: selectedButton.url,
            hasUrl: !!selectedButton.url
          });
          
          // If button has URL, send it as clickable link
          if (selectedButton.url) {
            logger.info(`🔗 Sending clickable link: ${selectedButton.url}`);
            await this.sendTextMessage(
              session.accountId,
              session.phoneNumberId,
              session.contactPhone,
              `${selectedButton.url}`,
              { campaign: 'workflow_button_url' }
            );
          } else {
            logger.info(`⚠️ Button has no URL to send`);
          }
          
          // Check for conditional branching
          if (selectedButton.nextStepId) {
            // Find the step index with this ID
            nextStepIndex = session.workflowSteps.findIndex(s => s.id === selectedButton.nextStepId);
            logger.info(`🔀 Conditional branch: Going to step "${selectedButton.nextStepId}" (index: ${nextStepIndex})`);
          }
        }
      }
      
      if (step.listItems && step.listItems.length > 0) {
        const listSelectionId = metadata.listItemId || (step.type === 'list' ? metadata.buttonId : null);
        const selectedItem = step.listItems.find(item =>
          (listSelectionId && item.id === listSelectionId) ||
          responseText.toLowerCase().includes(item.title.toLowerCase()) ||
          responseText === item.id
        );
        if (selectedItem) {
          selectedOption = selectedItem;
          selectedOptionId = selectedItem.id;
        }
        if (selectedItem && selectedItem.nextStepId) {
          nextStepIndex = session.workflowSteps.findIndex(s => s.id === selectedItem.nextStepId);
          logger.info(`🔀 Conditional branch: Going to step "${selectedItem.nextStepId}" (index: ${nextStepIndex})`);
        }
      }

      // Save the human-readable response for leads, while keeping option IDs only for workflow logic.
      const responseKey = this.inferInteractiveResponseKey(step);
      if (responseKey) {
        const displayValue = String(selectedOption?.title || responseText || '').trim();
        const savedValue = displayValue || String(metadata.buttonId || metadata.listItemId || '').trim();
        if (savedValue) {
          session.saveResponse(responseKey, savedValue);
          logger.info(`✅ Saved response as: ${responseKey} = "${savedValue}"`);
        }

        const internalId = String(selectedOptionId || metadata.listItemId || metadata.buttonId || '').trim();
        if (internalId && internalId !== savedValue) {
          session.saveResponse(`${responseKey}__id`, internalId);
          logger.info(`✅ Saved internal response id for: ${responseKey}`);
        }
      }

      // If conditional step, check condition
      if (step.type === 'condition' && step.condition) {
        const variable = step.condition.variable;
        const values = this.getWorkflowConditionValues(session, variable);
        
        const branch = step.condition.branches.find(b => values.includes(String(b.value || '').trim()));
        if (branch && branch.nextStepId) {
          nextStepIndex = session.workflowSteps.findIndex(s => s.id === branch.nextStepId);
          logger.info(`🔀 Condition: ${variable}=${values[0] || ''}, Going to step "${branch.nextStepId}"`);
        } else if (step.condition.defaultNextStepId) {
          nextStepIndex = session.workflowSteps.findIndex(s => s.id === step.condition.defaultNextStepId);
          logger.info(`🔀 Condition: Using default branch to step "${step.condition.defaultNextStepId}"`);
        }
      }

      // Advance to next step (either conditional or sequential)
      if (nextStepIndex !== null && nextStepIndex >= 0) {
        session.currentStepIndex = nextStepIndex;
      } else {
        session.advanceStep();
      }
      
      await session.save();
      await this.saveWorkflowLead(session);

      const hasMore = session.currentStepIndex < session.workflowSteps.length;

      if (hasMore) {
        // Send next step
        await this.sendWorkflowStep(session);
      } else {
        logger.info('🎉 Workflow completed! All responses collected.');
        session.status = 'completed';
        session.completedAt = new Date();
        session.responseDeadlineAt = null;
        session.awaitingResponseSince = null;
        await session.save();
        await this.recordRuleOutcome(session.ruleId, true);
        await this.sendWorkflowCompletionMessage(session);
      }
      
    } catch (error) {
      logger.error('❌ Error handling workflow response:', error);
      throw error;
    }
  }

  /**
   * Auto-advance on condition step (branch on saved variable, no user input).
   */
  async advanceConditionStep(session, step) {
    const variable = step.condition?.variable;
    const values = variable ? this.getWorkflowConditionValues(session, variable) : [];
    let nextStepIndex = null;

    const branch = step.condition?.branches?.find((b) => values.includes(String(b.value || '').trim()));
    if (branch?.nextStepId) {
      nextStepIndex = session.workflowSteps.findIndex((s) => s.id === branch.nextStepId);
    } else if (step.condition?.defaultNextStepId) {
      nextStepIndex = session.workflowSteps.findIndex(
        (s) => s.id === step.condition.defaultNextStepId
      );
    }

    if (nextStepIndex !== null && nextStepIndex >= 0) {
      session.currentStepIndex = nextStepIndex;
    } else {
      session.advanceStep();
    }

    session.responseDeadlineAt = null;
    session.awaitingResponseSince = null;
    await session.save();

    if (session.currentStepIndex < session.workflowSteps.length) {
      await this.sendWorkflowStep(session);
    } else {
      session.status = 'completed';
      session.completedAt = new Date();
      await session.save();
      await this.recordRuleOutcome(session.ruleId, true);
      await this.sendWorkflowCompletionMessage(session);
    }
  }

  /**
   * Check if workflow session has timed out (user not responding)
   */
  async checkWorkflowTimeout(sessionId) {
    try {
      const session = await WorkflowSession.findOneAndUpdate(
        {
          _id: sessionId,
          status: 'active',
          awaitingResponseSince: { $ne: null },
          $or: [
            { responseDeadlineAt: { $lte: new Date() } },
            {
              responseDeadlineAt: null,
              awaitingResponseSince: {
                $lte: new Date(Date.now() - 60 * 1000),
              },
            },
          ],
        },
        {
          $set: {
            hasTimedOut: true,
            status: 'expired',
            completedAt: new Date(),
            responseDeadlineAt: null,
            awaitingResponseSince: null,
          },
        },
        { new: true }
      );

      if (!session) return;

      logger.info('⏰ Workflow session expired:', sessionId);
      await this.saveWorkflowLead(session);
      await this.sendTimeoutMessage(session);
      logger.info('💾 Partial lead data:', Object.fromEntries(session.responses || []));
    } catch (error) {
      logger.error('❌ Error checking workflow timeout:', error);
    }
  }

  /**
   * Send timeout message when user doesn't respond
   * @param {Object} session - WorkflowSession document
   */
  async sendTimeoutMessage(session) {
    try {
      const message = `Thank you for your time! 🙏\n\nWe noticed you might be busy right now. No worries!\n\nIf you'd like to continue later, just send us a message anytime. We're here to help! 😊`;

      await this.sendTextMessage(
        session.accountId,
        session.phoneNumberId,
        session.contactPhone,
        message,
        { 
          campaign: 'workflow_timeout', 
          sessionId: session._id.toString(),
          partialResponses: Object.fromEntries(session.responses)
        }
      );
      
      logger.info('✅ Timeout message sent');
      
    } catch (error) {
      logger.error('❌ Error sending timeout message:', error);
    }
  }

  async saveWorkflowLead(session) {
    try {
      const responses = this.getLeadSafeResponses(session);
      const educationResponses = this.getEducationSafeResponses(session);
      if (Object.keys(responses).length === 0) return null;

      const ChatbotLead = (await import('../models/ChatbotLead.js')).default;
      const customerName =
        responses.name ||
        responses.fullName ||
        responses.customerName ||
        undefined;

      const lead = await ChatbotLead.findOneAndUpdate(
        {
          workflowSessionId: session._id.toString(),
          accountId: session.accountId,
        },
        {
          $set: {
            chatbotId: session.ruleId,
            accountId: session.accountId,
            projectId: session.projectId || null,
            phoneNumberId: session.phoneNumberId,
            customerPhone: session.contactPhone,
            ...(customerName ? { customerName } : {}),
            responses,
            workflowSessionId: session._id.toString(),
            status: 'new',
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { new: true, upsert: true }
      );

      const hasEducationEnquiryAction = (session.workflowSteps || []).some((step) => {
        const vertical = String(step?.vertical || '').toLowerCase();
        const action = String(step?.action || '').toLowerCase();
        return vertical === 'education' && ['create_enquiry', 'upsert_enquiry'].includes(action);
      });

      if (session.status === 'completed' && !hasEducationEnquiryAction) {
        try {
          await upsertEducationEnquiry({
            accountId: session.accountId,
            projectId: session.projectId || null,
            phone: session.contactPhone,
            name: customerName,
            source: 'chatbot_workflow',
            responses: educationResponses,
            workflowSessionId: session._id,
            chatbotId: session.ruleId,
          });
        } catch (eduErr) {
          logger.error('❌ Error syncing education enquiry:', eduErr);
        }
      }

      if (session.status === 'completed' && responses.demo_date && responses.demo_time) {
        try {
          const demoRequest = new DemoRequest({
            name: customerName || 'WhatsApp User',
            email: responses.email || 'N/A',
            phone: session.contactPhone,
            message: `Requested via WhatsApp Chatbot for Date: ${responses.demo_date}, Time: ${responses.demo_time}`,
            status: 'pending',
            requestedAt: new Date(),
          });
          await demoRequest.save();
          logger.info(`✅ Synced chatbot lead to DemoRequest: ${demoRequest._id}`);

          // Send email to admin
          await emailService.sendEmail(
            'support@replysys.com',
            `New Demo Request via WhatsApp: ${demoRequest.name}`,
            `
              <h2>New Demo Request</h2>
              <p><strong>Name:</strong> ${demoRequest.name}</p>
              <p><strong>Email:</strong> ${demoRequest.email}</p>
              <p><strong>Phone:</strong> ${demoRequest.phone}</p>
              <p><strong>Message:</strong> ${demoRequest.message}</p>
              <p><a href="${process.env.ADMIN_DASHBOARD_URL || 'https://replysys.com/superadmin'}/demo-requests/${demoRequest._id}">View in Dashboard</a></p>
            `
          );

          // Send confirmation to user if they provided an email
          if (responses.email && responses.email !== 'N/A' && responses.email.includes('@')) {
            await emailService.sendEmail(
              responses.email,
              'Demo Request Received - Replysys',
              `
                <h2>Thank you for your interest, ${demoRequest.name}!</h2>
                <p>We've received your demo request via WhatsApp. Our team will contact you soon to schedule your demo.</p>
                <p><strong>Your Details:</strong></p>
                <ul>
                  <li>Name: ${demoRequest.name}</li>
                  <li>Email: ${demoRequest.email}</li>
                  <li>Phone: ${demoRequest.phone}</li>
                  <li>Requested Time: ${responses.demo_date} at ${responses.demo_time}</li>
                </ul>
                <p>We'll be in touch within 24 hours!</p>
                <p>Best regards,<br/>Replysys Team</p>
              `
            );
          }
        } catch (demoErr) {
          logger.error('❌ Error syncing DemoRequest from chatbot:', demoErr);
        }
      }

      return lead;
    } catch (error) {
      logger.error('❌ Error saving workflow lead:', error.message);
      return null;
    }
  }

  /**
   * Send workflow completion message with collected data
   * @param {Object} session - WorkflowSession document
   */
  async sendWorkflowCompletionMessage(session) {
    try {
      const leadResponses = this.getLeadSafeResponses(session);
      logger.info('📊 Workflow completed. Collected data:', leadResponses);
      
      const lead = await this.saveWorkflowLead(session);
      
      logger.info('💾 Lead saved:', lead?._id);
      
      // Build summary message
      let summaryText = '✅ *Thank you for completing the form!*\n\n';
      summaryText += '*Your responses:*\n';
      
      for (const [key, value] of Object.entries(leadResponses)) {
        summaryText += `\n• *${key}*: ${value}`;
      }
      
      summaryText += '\n\nWe have saved your information. Our team will get back to you soon! 🙌';

      // Send summary
      await this.sendTextMessage(
        session.accountId,
        session.phoneNumberId,
        session.contactPhone,
        summaryText,
        { 
          campaign: 'workflow_completed', 
          sessionId: session._id.toString(),
          ...(lead?._id ? { leadId: lead._id.toString() } : {}),
          responses: leadResponses
        }
      );
      
      logger.info('✅ Completion message sent');
      
    } catch (error) {
      logger.error('❌ Error sending completion message:', error);
    }
  }
}

export default new WhatsAppService();
