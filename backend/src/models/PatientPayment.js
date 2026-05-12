import mongoose from 'mongoose';
import { generatePrefixedId } from '../utils/idGenerator.js';

const PatientPaymentSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  patientPaymentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generatePrefixedId('ppay')
  },
  patientId: { type: String, required: true, index: true },
  patientInvoiceId: { type: String, default: null, index: true },
  appointmentId: { type: String, default: null, index: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'completed',
    index: true,
  },
  method: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank-transfer', 'wallet', 'insurance', 'other'],
    default: 'cash',
    index: true,
  },
  paidAt: { type: Date, default: Date.now, index: true },
  receivedChannel: {
    type: String,
    enum: ['front-desk', 'online', 'phone', 'whatsapp', 'other'],
    default: 'front-desk',
  },
  referenceNumber: { type: String, trim: true, default: null, index: true },
  notes: { type: String, trim: true, default: '' },
  collectedBy: { type: String, trim: true, default: null },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, { timestamps: true });

PatientPaymentSchema.index({ accountId: 1, projectId: 1, patientId: 1, paidAt: -1 });
PatientPaymentSchema.index({ accountId: 1, projectId: 1, patientInvoiceId: 1, paidAt: -1 });

export default mongoose.model('PatientPayment', PatientPaymentSchema);
