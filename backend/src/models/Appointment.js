import mongoose from 'mongoose';
import { generatePrefixedId } from '../utils/idGenerator.js';

const SnapshotSchema = new mongoose.Schema({
  entityId: { type: String, default: null },
  fullName: { type: String, default: null },
  phoneNumber: { type: String, default: null },
  specialization: { type: String, default: null },
}, { _id: false });

const AppointmentSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  appointmentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generatePrefixedId('apt')
  },
  patientId: { type: String, required: true, index: true },
  doctorId: { type: String, default: null, index: true },
  patientSnapshot: { type: SnapshotSchema, default: () => ({}) },
  doctorSnapshot: { type: SnapshotSchema, default: null },
  scheduledAt: { type: Date, required: true, index: true },
  endAt: { type: Date, default: null },
  durationMinutes: { type: Number, default: 30 },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'checked-in', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled',
    index: true,
  },
  visitType: {
    type: String,
    enum: ['consultation', 'follow-up', 'procedure', 'lab', 'pharmacy', 'other'],
    default: 'consultation',
  },
  channel: {
    type: String,
    enum: ['clinic', 'video', 'phone', 'home-visit', 'other'],
    default: 'clinic',
  },
  bookingSource: {
    type: String,
    enum: ['manual', 'whatsapp_bot', 'api', 'other'],
    default: 'manual',
    index: true,
  },
  queueStatus: {
    type: String,
    enum: ['none', 'queued'],
    default: 'none',
    index: true,
  },
  reason: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  internalNotes: { type: String, trim: true, default: '' },
  reminder: {
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped'],
      default: 'pending',
    },
    sentAt: { type: Date, default: null },
    templateName: { type: String, trim: true, default: null },
  },
  frontdesk: {
    checkedInAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    noShowAt: { type: Date, default: null },
    lastStatusChangedAt: { type: Date, default: null },
    lastStatusChangedBy: { type: String, default: null },
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'checked-in', 'completed', 'cancelled', 'no-show'],
      required: true,
    },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: String, default: null },
    source: { type: String, default: 'frontdesk' },
  }],
  billingStatus: {
    type: String,
    enum: ['pending', 'invoiced', 'paid', 'waived'],
    default: 'pending',
    index: true,
  },
  tags: [{ type: String, trim: true, index: true }],
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, { timestamps: true });

AppointmentSchema.index({ accountId: 1, projectId: 1, scheduledAt: -1 });
AppointmentSchema.index({ accountId: 1, patientId: 1, scheduledAt: -1 });
AppointmentSchema.index({ accountId: 1, doctorId: 1, scheduledAt: -1 });

export default mongoose.model('Appointment', AppointmentSchema);
