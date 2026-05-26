import mongoose from 'mongoose';
import { generatePrefixedId } from '../utils/idGenerator.js';

const SnapshotSchema = new mongoose.Schema({
  entityId: { type: String, default: null },
  fullName: { type: String, default: null },
  phoneNumber: { type: String, default: null },
}, { _id: false });

const LabOrderSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generatePrefixedId('lo'),
  },
  patientId: { type: String, required: true, index: true },
  patientSnapshot: { type: SnapshotSchema, default: () => ({}) },
  testIds: [{ type: String }],
  collectionAt: { type: Date, default: null, index: true },
  collectionType: {
    type: String,
    enum: ['walk-in', 'home-collection', 'hospital-referral', 'other'],
    default: 'walk-in',
  },
  status: {
    type: String,
    enum: ['requested', 'scheduled', 'collected', 'processing', 'ready', 'delivered', 'cancelled'],
    default: 'requested',
    index: true,
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
  },
  notes: { type: String, trim: true, default: '' },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, { timestamps: true });

LabOrderSchema.index({ accountId: 1, projectId: 1, createdAt: -1 });

export default mongoose.model('LabOrder', LabOrderSchema);
