import mongoose from 'mongoose';
import { generateInvoiceNumber, generatePrefixedId } from '../utils/idGenerator.js';

const InvoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
}, { _id: false });

const PatientInvoiceSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  patientInvoiceId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generatePrefixedId('pinv')
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generateInvoiceNumber()
  },
  patientId: { type: String, required: true, index: true },
  appointmentId: { type: String, default: null, index: true },
  status: {
    type: String,
    enum: ['draft', 'issued', 'paid', 'partially-paid', 'cancelled', 'refunded'],
    default: 'draft',
    index: true,
  },
  currency: { type: String, default: 'INR' },
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  items: { type: [InvoiceItemSchema], default: [] },
  notes: { type: String, trim: true, default: '' },
  issuedAt: { type: Date, default: Date.now },
  dueAt: { type: Date, default: null, index: true },
  paidAt: { type: Date, default: null },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, { timestamps: true });

PatientInvoiceSchema.index({ accountId: 1, projectId: 1, patientId: 1, status: 1 });
PatientInvoiceSchema.index({ accountId: 1, projectId: 1, createdAt: -1 });

export default mongoose.model('PatientInvoice', PatientInvoiceSchema);
