import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, default: null, index: true },
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  invoiceId: { type: String, default: null, index: true },
  subscriptionId: { type: String, default: null, index: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'PricingPlan', default: null },
  planName: { type: String, default: null, index: true },
  billingCycle: { type: String, enum: ['monthly', 'quarterly', 'annual', 'yearly', '3-months'], default: 'monthly' },
  pricingSnapshot: { type: Object, default: {} },
  
  orderId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  
  gateway: { type: String, default: 'cashfree' },
  paymentGateway: { type: String, default: 'cashfree' },
  gatewayOrderId: { type: String, default: null, index: true },
  paymentSessionId: { type: String, default: null, index: true },
  paymentMethod: { type: String, default: 'upi' },
  
  status: { type: String, enum: ['pending', 'processing', 'success', 'completed', 'failed'], default: 'pending', index: true },
  paymentStatus: { type: String, default: null, index: true },
  transactionId: { type: String, default: null },
  signature: { type: String, default: null, select: false },
  initiatedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  webhookData: { type: Object, default: null },

  // Phase 6: lifecycle + idempotency tracking
  lifecycleState: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  lifecycleLastKey: { type: String, default: null },
  lifecycleProcessingAt: { type: Date, default: null },
  lifecycleProcessedAt: { type: Date, default: null },
  lifecycleLastError: { type: String, default: null },
  processingEventKeys: { type: [String], default: [] },
  completedEventKeys: { type: [String], default: [] },
  
  metadata: { type: Object, default: {} },
  
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
