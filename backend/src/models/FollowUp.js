import mongoose from 'mongoose';
import { generatePrefixedId } from '../utils/idGenerator.js';

const SnapshotSchema = new mongoose.Schema({
  entityId: { type: String, default: null },
  fullName: { type: String, default: null },
  phoneNumber: { type: String, default: null },
  specialization: { type: String, default: null },
}, { _id: false });

const FollowUpSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  followUpId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generatePrefixedId('fup')
  },
  patientId: { type: String, required: true, index: true },
  prescriptionId: { type: String, default: null, index: true },
  doctorId: { type: String, default: null, index: true },
  patientSnapshot: { type: SnapshotSchema, default: () => ({}) },
  doctorSnapshot: { type: SnapshotSchema, default: () => ({}) },
  diagnosis: { type: String, trim: true, default: '' },
  followUpDate: { type: Date, required: true, index: true },
  followUpTime: { type: String, default: '10:00', trim: true },
  treatmentType: {
    type: String,
    enum: ['consultation', 'checkup', 'test', 'vaccination', 'physical-therapy', 'medication-review'],
    default: 'consultation',
  },
  notes: { type: String, trim: true, default: '' },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'rescheduled', 'no-show'],
    default: 'scheduled',
    index: true,
  },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

FollowUpSchema.index({ accountId: 1, projectId: 1, patientId: 1, followUpDate: -1 });
FollowUpSchema.index({ accountId: 1, projectId: 1, doctorId: 1, followUpDate: -1 });
FollowUpSchema.index({ accountId: 1, projectId: 1, status: 1, followUpDate: -1 });

export default mongoose.model('FollowUp', FollowUpSchema);
