import mongoose from 'mongoose';
import { generatePrefixedId } from '../utils/idGenerator.js';

const SnapshotSchema = new mongoose.Schema({
  entityId: { type: String, default: null },
  fullName: { type: String, default: null },
  phoneNumber: { type: String, default: null },
  specialization: { type: String, default: null },
}, { _id: false });

const PrescriptionMedicineSchema = new mongoose.Schema({
  medicineName: { type: String, required: true, trim: true },
  dosage: { type: String, trim: true, default: '' },
  frequency: { type: String, trim: true, default: '' },
  durationDays: { type: Number, default: 0 },
  route: { type: String, trim: true, default: '' },
  quantity: { type: Number, default: 1 },
  instructions: { type: String, trim: true, default: '' },
}, { _id: false });

const PrescriptionSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  prescriptionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generatePrefixedId('rx')
  },
  patientId: { type: String, required: true, index: true },
  doctorId: { type: String, required: true, index: true },
  appointmentId: { type: String, default: null, index: true },
  patientSnapshot: { type: SnapshotSchema, default: () => ({}) },
  doctorSnapshot: { type: SnapshotSchema, default: () => ({}) },
  diagnosis: { type: String, trim: true, default: '' },
  symptoms: [{ type: String, trim: true }],
  medicines: { type: [PrescriptionMedicineSchema], default: [] },
  notes: { type: String, trim: true, default: '' },
  followUpAt: { type: Date, default: null, index: true },
  issuedAt: { type: Date, default: Date.now, index: true },
  status: {
    type: String,
    enum: ['draft', 'issued', 'cancelled', 'dispensed'],
    default: 'issued',
    index: true,
  },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, { timestamps: true });

PrescriptionSchema.index({ accountId: 1, projectId: 1, patientId: 1, issuedAt: -1 });
PrescriptionSchema.index({ accountId: 1, projectId: 1, doctorId: 1, issuedAt: -1 });

export default mongoose.model('Prescription', PrescriptionSchema);
