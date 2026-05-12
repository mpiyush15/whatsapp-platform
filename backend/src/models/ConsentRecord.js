import mongoose from 'mongoose';
import { generatePrefixedId } from '../utils/idGenerator.js';

const ConsentRecordSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  consentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generatePrefixedId('cons')
  },
  patientId: { type: String, required: true, index: true },
  consentType: {
    type: String,
    enum: ['privacy', 'treatment', 'whatsapp', 'marketing', 'reminder', 'telemedicine', 'data-sharing', 'prescription'],
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['granted', 'revoked', 'pending', 'expired'],
    required: true,
    index: true,
  },
  channel: {
    type: String,
    enum: ['paper', 'web', 'whatsapp', 'sms', 'email', 'verbal', 'imported'],
    default: 'web',
  },
  purpose: { type: String, trim: true, default: '' },
  scope: [{ type: String, trim: true }],
  collectedAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, default: null, index: true },
  sourceReference: { type: String, trim: true, default: null },
  evidenceUrl: { type: String, trim: true, default: null },
  notes: { type: String, trim: true, default: '' },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, { timestamps: true });

ConsentRecordSchema.index({ accountId: 1, projectId: 1, patientId: 1, consentType: 1, status: 1 });
ConsentRecordSchema.index({ accountId: 1, expiresAt: 1 });

export default mongoose.model('ConsentRecord', ConsentRecordSchema);
