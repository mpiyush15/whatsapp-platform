import mongoose from 'mongoose';
import { generateId } from '../utils/idGenerator.js';
import Counter from './Counter.js';

const EmergencyContactSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: null },
  relation: { type: String, trim: true, default: null },
  phoneNumber: { type: String, trim: true, default: null },
}, { _id: false });

const AddressSchema = new mongoose.Schema({
  line1: { type: String, trim: true, default: null },
  line2: { type: String, trim: true, default: null },
  city: { type: String, trim: true, default: null },
  state: { type: String, trim: true, default: null },
  postalCode: { type: String, trim: true, default: null },
  country: { type: String, trim: true, default: 'India' },
}, { _id: false });

const PatientSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  patientId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  medicalRecordNumber: {
    type: String,
    trim: true,
    default: () => `MRN-${generateId().toUpperCase()}`,
    index: true,
  },
  fullName: { type: String, required: true, trim: true },
  firstName: { type: String, trim: true, default: null },
  lastName: { type: String, trim: true, default: null },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'unknown'],
    default: 'unknown',
    index: true,
  },
  dateOfBirth: { type: Date, default: null },
  phoneNumber: { type: String, trim: true, default: null, index: true },
  whatsappNumber: { type: String, trim: true, default: null, index: true },
  email: { type: String, trim: true, lowercase: true, default: null, index: true },
  bloodGroup: { type: String, trim: true, default: null },
  allergies: [{ type: String, trim: true }],
  chronicConditions: [{ type: String, trim: true }],
  address: { type: AddressSchema, default: () => ({}) },
  emergencyContact: { type: EmergencyContactSchema, default: () => ({}) },
  communicationPreferences: {
    whatsapp: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
    calls: { type: Boolean, default: true },
  },
  consentSummary: {
    privacyAccepted: { type: Boolean, default: false },
    treatmentAccepted: { type: Boolean, default: false },
    whatsappOptIn: { type: Boolean, default: false },
    marketingOptIn: { type: Boolean, default: false },
    consentUpdatedAt: { type: Date, default: null },
  },
  tags: [{ type: String, trim: true }],
  notes: { type: String, trim: true, default: '' },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
    index: true,
  },
  lastVisitAt: { type: Date, default: null },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, { timestamps: true });

PatientSchema.index({ accountId: 1, projectId: 1, fullName: 1 });
PatientSchema.index({ accountId: 1, projectId: 1, medicalRecordNumber: 1 });
PatientSchema.index({ accountId: 1, phoneNumber: 1 });

PatientSchema.pre('validate', async function assignNumericPatientId() {
  if (this.patientId) return;

  const counter = await Counter.findByIdAndUpdate(
    'patient_id',
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  this.patientId = String(counter.sequence);
});

export default mongoose.model('Patient', PatientSchema);
