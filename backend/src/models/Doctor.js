import mongoose from 'mongoose';
import { generatePrefixedId } from '../utils/idGenerator.js';

const AvailabilitySlotSchema = new mongoose.Schema({
  dayOfWeek: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true,
  },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  location: { type: String, trim: true, default: null },
}, { _id: false });

const DoctorSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  doctorId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generatePrefixedId('dr')
  },
  fullName: { type: String, required: true, trim: true },
  specialization: { type: String, trim: true, default: null, index: true },
  department: { type: String, trim: true, default: null },
  registrationNumber: { type: String, trim: true, default: null, index: true },
  phoneNumber: { type: String, trim: true, default: null },
  email: { type: String, trim: true, lowercase: true, default: null },
  consultationFee: { type: Number, default: 0 },
  consultationModes: [{
    type: String,
    enum: ['clinic', 'video', 'phone', 'home-visit'],
  }],
  availability: { type: [AvailabilitySlotSchema], default: [] },
  notes: { type: String, trim: true, default: '' },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on-leave'],
    default: 'active',
    index: true,
  },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, { timestamps: true });

DoctorSchema.index({ accountId: 1, projectId: 1, fullName: 1 });
DoctorSchema.index({ accountId: 1, projectId: 1, specialization: 1, status: 1 });

export default mongoose.model('Doctor', DoctorSchema);
