import mongoose from 'mongoose';
import { generatePrefixedId } from '../utils/idGenerator.js';

const LabReportSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  reportId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generatePrefixedId('lr'),
  },
  orderId: { type: String, required: true, index: true },
  patientId: { type: String, required: true, index: true },
  reportDate: { type: Date, default: Date.now, index: true },
  fileUrl: { type: String, default: null },
  fileName: { type: String, trim: true, default: null },
  status: {
    type: String,
    enum: ['draft', 'ready', 'sent', 'failed'],
    default: 'draft',
    index: true,
  },
  sentAt: { type: Date, default: null },
  sentVia: {
    type: String,
    enum: ['whatsapp', 'email', 'manual', 'other'],
    default: null,
  },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, { timestamps: true });

LabReportSchema.index({ accountId: 1, projectId: 1, reportDate: -1 });

export default mongoose.model('LabReport', LabReportSchema);
