import mongoose from 'mongoose';
import { generatePrefixedId } from '../utils/idGenerator.js';

const EducationAuditEventSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  auditEventId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generatePrefixedId('eduaudit')
  },
  actor: {
    id: { type: String, default: null },
    email: { type: String, default: null },
    name: { type: String, default: null },
  },
  action: { type: String, required: true, index: true },
  entityType: { type: String, required: true, index: true },
  entityId: { type: String, default: null, index: true },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
    index: true,
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  eventAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

EducationAuditEventSchema.index({ accountId: 1, projectId: 1, eventAt: -1 });
EducationAuditEventSchema.index({ accountId: 1, action: 1, eventAt: -1 });
EducationAuditEventSchema.index({ accountId: 1, entityType: 1, entityId: 1, eventAt: -1 });

export default mongoose.model('EducationAuditEvent', EducationAuditEventSchema);
