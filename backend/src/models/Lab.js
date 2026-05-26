import mongoose from 'mongoose';
import { generatePrefixedId } from '../utils/idGenerator.js';

const LabSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, required: true, unique: true, index: true },
  labId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generatePrefixedId('lab'),
  },
  name: { type: String, required: true, trim: true },
  address: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  website: { type: String, trim: true, default: '' },
  labType: {
    type: String,
    enum: ['standalone', 'hospital_attached', 'collection_center'],
    default: 'standalone',
    index: true,
  },
  enabledModules: [{
    type: String,
    enum: [
      'patients',
      'tests',
      'orders',
      'collection',
      'reports',
      'billing',
      'referrers',
      'compliance',
      'whatsapp',
      'flow-builder',
    ],
  }],
  operationsSettings: {
    homeCollectionEnabled: { type: Boolean, default: true },
    walkInEnabled: { type: Boolean, default: true },
    defaultSlotMinutes: { type: Number, default: 30 },
  },
  billingSettings: {
    enabled: { type: Boolean, default: true },
    gstEnabled: { type: Boolean, default: true },
    gstPercentage: { type: String, trim: true, default: '18%' },
    currency: { type: String, trim: true, default: 'INR ₹' },
  },
  whatsappAutomationSettings: {
    sendBookingConfirmation: { type: Boolean, default: true },
    sendReportReady: { type: Boolean, default: true },
    sendCollectionReminder: { type: Boolean, default: true },
  },
  logoUrl: { type: String, default: null },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, { timestamps: true });

LabSchema.index({ accountId: 1, name: 1 });

export default mongoose.model('Lab', LabSchema);
