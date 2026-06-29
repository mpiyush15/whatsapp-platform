import mongoose from 'mongoose';
import { generatePrefixedId } from '../utils/idGenerator.js';

const NurseSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  nurseId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generatePrefixedId('nr')
  },
  fullName: { type: String, required: true, trim: true },
  department: { type: String, trim: true, default: null },
  licenseNumber: { type: String, trim: true, default: null, index: true },
  phoneNumber: { type: String, trim: true, default: null },
  email: { type: String, trim: true, lowercase: true, default: null },
  shift: {
    type: String,
    enum: ['morning', 'evening', 'night', 'rotational', 'custom'],
    default: 'rotational',
  },
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

NurseSchema.index({ accountId: 1, projectId: 1, fullName: 1 });
NurseSchema.index({ accountId: 1, projectId: 1, department: 1, status: 1 });

export default mongoose.model('Nurse', NurseSchema);
