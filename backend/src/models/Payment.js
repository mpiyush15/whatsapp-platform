import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  invoiceId: { type: String, required: true },
  
  orderId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  
  gateway: { type: String, default: 'cashfree' },
  paymentMethod: { type: String, default: 'upi' },
  
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending', index: true },
  transactionId: { type: String, default: null },
  signature: { type: String, default: null, select: false },
  
  metadata: { type: Object, default: {} },
  
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
