import mongoose from 'mongoose';
import { generatePrefixedId } from '../utils/idGenerator.js';

const LabTestSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  testId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generatePrefixedId('lt'),
  },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, default: null, index: true },
  category: { type: String, trim: true, default: 'general' },
  price: { type: Number, default: 0 },
  fastingRequired: { type: Boolean, default: false },
  turnaroundHours: { type: Number, default: 24 },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true,
  },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, { timestamps: true });

LabTestSchema.index({ accountId: 1, projectId: 1, name: 1 });

export default mongoose.model('LabTest', LabTestSchema);
