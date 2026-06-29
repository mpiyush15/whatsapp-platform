import mongoose from 'mongoose';
import { generatePrefixedId } from '../utils/idGenerator.js';
import { STAFF_ROUTE_KEYS } from '../constants/healthcareStaffRoutes.js';

const HealthcareStaffSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, required: true, index: true },
  staffId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generatePrefixedId('hstaff'),
  },
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, index: true },
  phone: { type: String, trim: true, default: null },
  role: {
    type: String,
    enum: ['doctor', 'head_doctor', 'nurse', 'receptionist', 'billing', 'admin'],
    required: true,
    index: true,
  },
  /** Paths under /dashboard (same suffix under /projects/:id). See healthcareStaffRoutes.js */
  allowedRoutes: [{
    type: String,
    enum: STAFF_ROUTE_KEYS,
  }],
  /** @deprecated — migrated to allowedRoutes; kept for legacy DB reads */
  allowedModules: { type: [String], default: undefined },
  linkedDoctorId: { type: String, default: null, index: true },
  linkedNurseId: { type: String, default: null, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true,
  },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, { timestamps: true });

HealthcareStaffSchema.index({ accountId: 1, projectId: 1, email: 1 }, { unique: true });

export default mongoose.model('HealthcareStaff', HealthcareStaffSchema);
