import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  invoiceNumber: { type: String, required: true, unique: true },
  subscriptionId: { type: String, required: true },
  
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  
  status: { type: String, enum: ['draft', 'sent', 'paid', 'failed', 'cancelled'], default: 'draft', index: true },
  dueDate: { type: Date, required: true },
  paidDate: { type: Date, default: null },
  
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number,
    _id: false
  }],
  
  emailSent: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Invoice', invoiceSchema);
